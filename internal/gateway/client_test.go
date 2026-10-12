package gateway

import (
	"bytes"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestChatCompletionsRequiresProvider(t *testing.T) {
	_, err := NewClient("", "").ChatCompletions(t.Context(), bytes.NewBufferString(`{}`))
	if !errors.Is(err, ErrNotConfigured) {
		t.Fatalf("error = %v, want ErrNotConfigured", err)
	}
}

func TestEmbeddings(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
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
}
