package api

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/r7rainz/synapse/internal/document"
	"github.com/r7rainz/synapse/internal/gateway"
	"github.com/r7rainz/synapse/internal/llmrequest"
)

type recordingLLMRequests struct {
	request  *llmrequest.LLMRequest
	summary  *llmrequest.Summary
	requests []*llmrequest.RequestRecord
	userID   string
	limit    int
}

func (r *recordingLLMRequests) CreateLLMRequest(_ context.Context, request *llmrequest.LLMRequest) error {
	r.request = request
	return nil
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
		_, _ = w.Write([]byte(`{"choices":[{"message":{"content":"hello"}}]}`))
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
	if requests.request == nil || requests.request.UserID != "user-id" || requests.request.APIKeyID != nil {
		t.Fatalf("unexpected request log: %#v", requests.request)
	}
}

func TestChatPreservesUpstreamErrorAndHeaders(t *testing.T) {
	provider := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Header().Set("Retry-After", "30")
		w.Header().Set("X-RateLimit-Remaining", "0")
		w.WriteHeader(http.StatusTooManyRequests)
		_, _ = w.Write([]byte(`{"error":{"message":"slow down"}}`))
	}))
	defer provider.Close()

	handler := &Handler{
		gateway:    gateway.NewClient(provider.URL, ""),
		llmrequest: &recordingLLMRequests{},
	}
	request := httptest.NewRequest(http.MethodPost, "/v1/chat/completions", strings.NewReader(`{"model":"test","messages":[{"role":"user","content":"hello"}]}`))
	response := httptest.NewRecorder()

	handler.handleChatCompletions(response, request, "user-id", nil)

	if response.Code != http.StatusTooManyRequests || response.Header().Get("Retry-After") != "30" || response.Header().Get("X-RateLimit-Remaining") != "0" {
		t.Fatalf("status = %d, headers = %#v", response.Code, response.Header())
	}
	if !strings.Contains(response.Body.String(), "slow down") {
		t.Fatalf("unexpected body: %s", response.Body.String())
	}
}

func TestChatStreamsAndFlushes(t *testing.T) {
	provider := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "text/event-stream")
		w.Header().Set("Cache-Control", "no-cache")
		_, _ = w.Write([]byte("data: one\n\n"))
		_, _ = w.Write([]byte("data: [DONE]\n\n"))
	}))
	defer provider.Close()

	handler := &Handler{
		gateway:    gateway.NewClient(provider.URL, ""),
		llmrequest: &recordingLLMRequests{},
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
