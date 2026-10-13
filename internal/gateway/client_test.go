package gateway

import (
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestChatCompletionsRequiresProvider(t *testing.T) {
	_, err := NewClient("", "").ChatCompletions(t.Context(), []byte(`{}`), false)
	if !errors.Is(err, ErrNotConfigured) {
		t.Fatalf("error = %v, want ErrNotConfigured", err)
	}
}

func TestEmbeddings(t *testing.T) {
	attempts := 0
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		attempts++
		if attempts == 1 {
			w.Header().Set("Retry-After", "0")
			w.WriteHeader(http.StatusServiceUnavailable)
			_, _ = w.Write([]byte(`{"error":{"code":"server_is_overloaded"}}`))
			return
		}
		if r.URL.Path != "/embeddings" || r.Method != http.MethodPost {
			t.Fatalf("unexpected request: %s %s", r.Method, r.URL.Path)
		}

		var input struct {
			Model string   `json:"model"`
			Input []string `json:"input"`
		}
		if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
			t.Fatal(err)
		}
		if input.Model != "test-embedding" || len(input.Input) != 1 {
			t.Fatalf("unexpected request body: %#v", input)
		}

		embedding := make([]float64, 1536)
		_ = json.NewEncoder(w).Encode(map[string]any{
			"data": []map[string]any{{"index": 0, "embedding": embedding}},
		})
	}))
	defer server.Close()

	embeddings, err := NewClient(server.URL, "secret").Embeddings(t.Context(), "test-embedding", []string{"hello"})
	if err != nil {
		t.Fatal(err)
	}
	if len(embeddings) != 1 || len(embeddings[0]) != 1536 {
		t.Fatalf("unexpected embeddings shape: %d x %d", len(embeddings), len(embeddings[0]))
	}
	if attempts != 2 {
		t.Fatalf("attempts = %d, want 2", attempts)
	}
}

func TestChatCompletionsRetriesTemporaryRateLimit(t *testing.T) {
	attempts := 0
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		attempts++
		if attempts == 1 {
			w.Header().Set("Retry-After", "0")
			w.WriteHeader(http.StatusTooManyRequests)
			_, _ = w.Write([]byte(`{"error":{"type":"rate_limit_error","code":"slow_down"}}`))
			return
		}
		_, _ = w.Write([]byte(`{"ok":true}`))
	}))
	defer server.Close()

	response, err := NewClient(server.URL, "").ChatCompletions(t.Context(), []byte(`{"model":"test"}`), false)
	if err != nil {
		t.Fatal(err)
	}
	defer response.Body.Close()
	if attempts != 2 || response.StatusCode != http.StatusOK {
		t.Fatalf("attempts = %d, status = %d", attempts, response.StatusCode)
	}
}

func TestChatCompletionsDoesNotRetryQuotaOrStream(t *testing.T) {
	tests := []struct {
		name   string
		status int
		body   string
		stream bool
		quota  bool
	}{
		{name: "quota", status: http.StatusTooManyRequests, body: `{"error":{"type":"insufficient_quota","code":"credit_balance_exhausted"}}`, quota: true},
		{name: "stream", status: http.StatusServiceUnavailable, body: `{"error":{"code":"server_is_overloaded"}}`, stream: true},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			attempts := 0
			server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
				attempts++
				w.Header().Set("Retry-After", "0")
				w.WriteHeader(test.status)
				_, _ = w.Write([]byte(test.body))
			}))
			defer server.Close()

			_, err := NewClient(server.URL, "").ChatCompletions(t.Context(), []byte(`{}`), test.stream)
			var providerErr *ProviderError
			if !errors.As(err, &providerErr) {
				t.Fatalf("error = %v, want ProviderError", err)
			}
			if attempts != 1 || providerErr.IsQuotaExceeded() != test.quota {
				t.Fatalf("attempts = %d, quota = %v", attempts, providerErr.IsQuotaExceeded())
			}
		})
	}
}

func TestProviderErrorKeepsOnlySafeHeaders(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Retry-After", "30")
		w.Header().Set("X-Request-ID", "request-123")
		w.Header().Set("X-RateLimit-Remaining", "0")
		w.Header().Set("X-Provider-Secret", "hidden")
		w.WriteHeader(http.StatusUnauthorized)
		_, _ = w.Write([]byte(`{"error":{"code":"invalid_api_key","message":"secret details"}}`))
	}))
	defer server.Close()

	_, err := NewClient(server.URL, "").ChatCompletions(t.Context(), []byte(`{}`), false)
	var providerErr *ProviderError
	if !errors.As(err, &providerErr) {
		t.Fatalf("error = %v, want ProviderError", err)
	}
	if providerErr.RequestID != "request-123" || providerErr.RetryAfter != "30" || providerErr.Header.Get("X-RateLimit-Remaining") != "0" {
		t.Fatalf("unexpected provider error: %#v", providerErr)
	}
	if providerErr.Header.Get("X-Provider-Secret") != "" || providerErr.Code != "invalid_api_key" {
		t.Fatalf("unsafe or missing provider data: %#v", providerErr)
	}
}
