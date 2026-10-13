package api

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/r7rainz/synapse/internal/document"
	"github.com/r7rainz/synapse/internal/gateway"
	"github.com/r7rainz/synapse/internal/llmrequest"
)

type recordingLLMRequests struct {
	request          *llmrequest.LLMRequest
	summary          *llmrequest.Summary
	requests         []*llmrequest.RequestRecord
	userID           string
	limit            int
	rateLimitResult  *llmrequest.RateLimitResult
	rateLimitError   error
	rateLimitScopes  []string
	tokenQuotaResult *llmrequest.TokenQuotaResult
	tokenQuotaError  error
	tokenQuotaScopes []string
}

func (r *recordingLLMRequests) CreateLLMRequest(_ context.Context, request *llmrequest.LLMRequest) error {
	r.request = request
	return nil
}

func (r *recordingLLMRequests) ConsumeRateLimit(_ context.Context, scope, scopeID string, _ int) (*llmrequest.RateLimitResult, error) {
	r.rateLimitScopes = append(r.rateLimitScopes, scope+":"+scopeID)
	if r.rateLimitError != nil {
		return nil, r.rateLimitError
	}
	if r.rateLimitResult != nil {
		return r.rateLimitResult, nil
	}
	return &llmrequest.RateLimitResult{Allowed: true}, nil
}

func (r *recordingLLMRequests) CheckMonthlyTokenQuota(_ context.Context, scope, scopeID string, _ int64) (*llmrequest.TokenQuotaResult, error) {
	r.tokenQuotaScopes = append(r.tokenQuotaScopes, scope+":"+scopeID)
	if r.tokenQuotaError != nil {
		return nil, r.tokenQuotaError
	}
	if r.tokenQuotaResult != nil {
		return r.tokenQuotaResult, nil
	}
	return &llmrequest.TokenQuotaResult{Allowed: true}, nil
}

func (r *recordingLLMRequests) SummaryByUser(_ context.Context, userID string) (*llmrequest.Summary, error) {
	r.userID = userID
	return r.summary, nil
}

func (r *recordingLLMRequests) ListByUser(_ context.Context, userID string, limit int) ([]*llmrequest.RequestRecord, error) {
	r.userID = userID
	r.limit = limit
	return r.requests, nil
}

func TestPlaygroundChatRequiresClaims(t *testing.T) {
	request := httptest.NewRequest(http.MethodPost, "/playground/chat/completions", strings.NewReader(`{"model":"test"}`))
	response := httptest.NewRecorder()

	(&Handler{}).HandlePlaygroundChatCompletions(response, request)

	if response.Code != http.StatusUnauthorized {
		t.Fatalf("status = %d, want %d", response.Code, http.StatusUnauthorized)
	}
}

func TestPlaygroundChatRecordsRequestWithoutAPIKey(t *testing.T) {
	provider := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"choices":[{"message":{"content":"hello"}}],"usage":{"prompt_tokens":5,"completion_tokens":2}}`))
	}))
	defer provider.Close()

	requests := &recordingLLMRequests{}
	handler := &Handler{
		gateway:    gateway.NewClient(provider.URL, ""),
		llmrequest: requests,
		provider:   "test",
	}
	request := httptest.NewRequest(http.MethodPost, "/playground/chat/completions", strings.NewReader(`{"model":"test","messages":[{"role":"user","content":"hello"}]}`))
	response := httptest.NewRecorder()

	handler.handleChatCompletions(response, request, "user-id", nil)

	if response.Code != http.StatusOK {
		t.Fatalf("status = %d, want %d", response.Code, http.StatusOK)
	}
	if requests.request == nil || requests.request.UserID != "user-id" || requests.request.APIKeyID != nil || requests.request.InputTokens != 5 || requests.request.OutputTokens != 2 {
		t.Fatalf("unexpected request log: %#v", requests.request)
	}
}

func TestChatSanitizesUpstreamErrorAndPreservesSafeHeaders(t *testing.T) {
	provider := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Header().Set("Retry-After", "30")
		w.Header().Set("X-RateLimit-Remaining", "0")
		w.Header().Set("X-Request-ID", "request-123")
		w.WriteHeader(http.StatusTooManyRequests)
		_, _ = w.Write([]byte(`{"error":{"message":"private provider details","type":"rate_limit_error","code":"slow_down"}}`))
	}))
	defer provider.Close()

	handler := &Handler{
		gateway:    gateway.NewClient(provider.URL, ""),
		llmrequest: &recordingLLMRequests{},
	}
	request := httptest.NewRequest(http.MethodPost, "/v1/chat/completions", strings.NewReader(`{"model":"test","messages":[{"role":"user","content":"hello"}]}`))
	response := httptest.NewRecorder()

	handler.handleChatCompletions(response, request, "user-id", nil)

	if response.Code != http.StatusTooManyRequests || response.Header().Get("Retry-After") != "30" || response.Header().Get("X-RateLimit-Remaining") != "0" || response.Header().Get("X-Request-ID") != "request-123" {
		t.Fatalf("status = %d, headers = %#v", response.Code, response.Header())
	}
	if !strings.Contains(response.Body.String(), "provider_rate_limited") || strings.Contains(response.Body.String(), "private provider details") {
		t.Fatalf("unexpected body: %s", response.Body.String())
	}
}

func TestChatStreamsAndFlushes(t *testing.T) {
	provider := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "text/event-stream")
		w.Header().Set("Cache-Control", "no-cache")
		_, _ = w.Write([]byte("data: one\n\n"))
		_, _ = w.Write([]byte("data: {\"usage\":{\"prompt_tokens\":8,\"completion_tokens\":4}}\n\n"))
		_, _ = w.Write([]byte("data: [DONE]\n\n"))
	}))
	defer provider.Close()

	requests := &recordingLLMRequests{}
	handler := &Handler{
		gateway:    gateway.NewClient(provider.URL, ""),
		llmrequest: requests,
	}
	request := httptest.NewRequest(http.MethodPost, "/v1/chat/completions", strings.NewReader(`{"model":"test","stream":true,"messages":[{"role":"user","content":"hello"}]}`))
	response := httptest.NewRecorder()

	handler.handleChatCompletions(response, request, "user-id", nil)

	if response.Code != http.StatusOK || !response.Flushed {
		t.Fatalf("status = %d, flushed = %v", response.Code, response.Flushed)
	}
	if response.Header().Get("Content-Type") != "text/event-stream" || !strings.Contains(response.Body.String(), "[DONE]") {
		t.Fatalf("headers = %#v, body = %q", response.Header(), response.Body.String())
	}
	if requests.request == nil || requests.request.InputTokens != 8 || requests.request.OutputTokens != 4 {
		t.Fatalf("unexpected usage: %#v", requests.request)
	}
}

func TestChatReturnsServiceUnavailableWithoutProvider(t *testing.T) {
	repository := &recordingLLMRequests{}
	handler := &Handler{gateway: gateway.NewClient("", ""), llmrequest: repository}
	request := httptest.NewRequest(http.MethodPost, "/v1/chat/completions", strings.NewReader(`{"model":"test","messages":[{"role":"user","content":"hello"}]}`))
	response := httptest.NewRecorder()

	handler.handleChatCompletions(response, request, "user-id", nil)

	if response.Code != http.StatusServiceUnavailable || repository.request == nil || repository.request.StatusCode != http.StatusServiceUnavailable {
		t.Fatalf("status = %d, log = %#v", response.Code, repository.request)
	}
	if !strings.Contains(response.Body.String(), "provider_not_configured") {
		t.Fatalf("unexpected body: %s", response.Body.String())
	}
}

func TestChatRejectsRateLimit(t *testing.T) {
	repository := &recordingLLMRequests{rateLimitResult: &llmrequest.RateLimitResult{
		ResetAt: time.Now().Add(30 * time.Second),
	}}
	handler := &Handler{
		gateway:                 gateway.NewClient("", ""),
		llmrequest:              repository,
		userRequestsPerMinute:   60,
		apiKeyRequestsPerMinute: 60,
	}
	request := httptest.NewRequest(http.MethodPost, "/v1/chat/completions", strings.NewReader(`{"model":"test","messages":[{"role":"user","content":"hello"}]}`))
	response := httptest.NewRecorder()

	handler.handleChatCompletions(response, request, "user-id", nil)

	if response.Code != http.StatusTooManyRequests || response.Header().Get("Retry-After") == "" {
		t.Fatalf("status = %d, retry-after = %q", response.Code, response.Header().Get("Retry-After"))
	}
	if !strings.Contains(response.Body.String(), "rate_limit_exceeded") {
		t.Fatalf("unexpected body: %s", response.Body.String())
	}
	if repository.request == nil || repository.request.StatusCode != http.StatusTooManyRequests || !repository.request.RateLimited {
		t.Fatalf("unexpected request log: %#v", repository.request)
	}
}

func TestChatConsumesUserAndAPIKeyLimits(t *testing.T) {
	repository := &recordingLLMRequests{}
	handler := &Handler{
		llmrequest:              repository,
		userRequestsPerMinute:   60,
		apiKeyRequestsPerMinute: 30,
	}
	keyID := "key-id"

	if _, err := handler.consumeChatRateLimits(context.Background(), "user-id", &keyID); err != nil {
		t.Fatal(err)
	}
	if strings.Join(repository.rateLimitScopes, ",") != "user:user-id,api_key:key-id" {
		t.Fatalf("scopes = %#v", repository.rateLimitScopes)
	}
}

func TestChatRejectsTokenQuota(t *testing.T) {
	repository := &recordingLLMRequests{tokenQuotaResult: &llmrequest.TokenQuotaResult{
		ResetAt: time.Now().Add(24 * time.Hour),
	}}
	handler := &Handler{
		gateway:            gateway.NewClient("", ""),
		llmrequest:         repository,
		userTokensPerMonth: 100,
	}
	request := httptest.NewRequest(http.MethodPost, "/playground/chat/completions", strings.NewReader(`{"model":"test","messages":[{"role":"user","content":"hello"}]}`))
	response := httptest.NewRecorder()

	handler.handleChatCompletions(response, request, "user-id", nil)

	if response.Code != http.StatusTooManyRequests || response.Header().Get("Retry-After") == "" {
		t.Fatalf("status = %d, retry-after = %q", response.Code, response.Header().Get("Retry-After"))
	}
	if !strings.Contains(response.Body.String(), "quota_exceeded") {
		t.Fatalf("unexpected body: %s", response.Body.String())
	}
	if repository.request == nil || repository.request.StatusCode != http.StatusTooManyRequests {
		t.Fatalf("unexpected request log: %#v", repository.request)
	}
}

func TestChatConsumesUserAndAPIKeyTokenQuotas(t *testing.T) {
	repository := &recordingLLMRequests{}
	handler := &Handler{
		llmrequest:           repository,
		userTokensPerMonth:   1000,
		apiKeyTokensPerMonth: 500,
	}
	keyID := "key-id"

	if _, err := handler.consumeChatTokenQuotas(context.Background(), "user-id", &keyID); err != nil {
		t.Fatal(err)
	}
	if strings.Join(repository.tokenQuotaScopes, ",") != "user:user-id,api_key:key-id" {
		t.Fatalf("scopes = %#v", repository.tokenQuotaScopes)
	}
}

func TestEnableStreamingUsage(t *testing.T) {
	body, err := enableStreamingUsage([]byte(`{"model":"test","stream":true,"stream_options":{"foo":true}}`))
	if err != nil {
		t.Fatal(err)
	}
	var request struct {
		StreamOptions map[string]bool `json:"stream_options"`
	}
	if err := json.Unmarshal(body, &request); err != nil {
		t.Fatal(err)
	}
	if !request.StreamOptions["include_usage"] || !request.StreamOptions["foo"] {
		t.Fatalf("unexpected stream options: %#v", request.StreamOptions)
	}
}

func TestValidateChatMessagesWithInlineFiles(t *testing.T) {
	tests := []struct {
		name    string
		content string
		wantErr string
	}{
		{"valid", `[{"type":"text","text":"summarize"},{"type":"file","file":{"filename":"note.txt","file_data":"data:text/plain;base64,aGVsbG8="}}]`, ""},
		{"invalid base64", `[{"type":"file","file":{"file_data":"data:text/plain;base64,%%%"}}]`, "invalid base64"},
		{"file id", `[{"type":"file","file":{"file_id":"provider-file"}}]`, "file_id is not supported"},
		{"missing MIME", `[{"type":"file","file":{"file_data":"data:;base64,aGVsbG8="}}]`, "MIME type"},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			err := validateChatMessages([]ChatMessage{{Role: "user", Content: json.RawMessage(test.content)}})
			if test.wantErr == "" && err != nil {
				t.Fatal(err)
			}
			if test.wantErr != "" && (err == nil || !strings.Contains(err.Error(), test.wantErr)) {
				t.Fatalf("error = %v, want %q", err, test.wantErr)
			}
		})
	}

	tooLarge := "data:text/plain;base64," + strings.Repeat("YQ==", 2)
	if _, err := validateFileData(tooLarge, 1); !errors.Is(err, errInlineFilesTooLarge) {
		t.Fatalf("error = %v, want files-too-large error", err)
	}
}

func TestAddRetrievedContext(t *testing.T) {
	body := []byte(`{"model":"test","document_ids":["doc"],"messages":[{"role":"user","content":[{"type":"text","text":"hello"},{"type":"file","file":{"file_data":"data:text/plain;base64,aGk="}}]}]}`)
	result, err := addRetrievedContext(body, []document.Chunk{{Content: "relevant text"}})
	if err != nil {
		t.Fatal(err)
	}

	var request map[string]json.RawMessage
	if err := json.Unmarshal(result, &request); err != nil {
		t.Fatal(err)
	}
	if _, ok := request["document_ids"]; ok {
		t.Fatal("document_ids should not be forwarded")
	}

	var messages []map[string]json.RawMessage
	if err := json.Unmarshal(request["messages"], &messages); err != nil {
		t.Fatal(err)
	}
	if len(messages) != 2 || !strings.Contains(string(messages[0]["content"]), "relevant text") || !strings.Contains(string(messages[1]["content"]), "file_data") {
		t.Fatalf("unexpected messages: %#v", messages)
	}
}

func TestLastUserMessageReadsTextBlocks(t *testing.T) {
	messages := []ChatMessage{{
		Role:    "user",
		Content: json.RawMessage(`[{"type":"text","text":"compare"},{"type":"file","file":{"file_data":"data:text/plain;base64,aGk="}},{"type":"text","text":"the reports"}]`),
	}}
	if got := lastUserMessage(messages); got != "compare\nthe reports" {
		t.Fatalf("message = %q", got)
	}
}

func TestNormalizeDocumentIDs(t *testing.T) {
	ids, err := normalizeDocumentIDs([]string{
		"550e8400-e29b-41d4-a716-446655440000",
		"550E8400-E29B-41D4-A716-446655440000",
	})
	if err != nil {
		t.Fatal(err)
	}
	if len(ids) != 1 || ids[0] != "550e8400-e29b-41d4-a716-446655440000" {
		t.Fatalf("unexpected normalized IDs: %#v", ids)
	}
}
