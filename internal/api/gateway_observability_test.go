package api

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/r7rainz/synapse/internal/llmrequest"
)

func TestGatewaySummary(t *testing.T) {
	repository := &recordingLLMRequests{summary: &llmrequest.Summary{
		RequestCount:     12,
		ErrorCount:       2,
		RateLimitedCount: 1,
		AverageLatencyMS: 340,
		InputTokens:      100,
		OutputTokens:     40,
		MonthlyTokens:    200,
	}}
	handler := &Handler{
		llmrequest:              repository,
		provider:                "test-provider",
		userRequestsPerMinute:   60,
		apiKeyRequestsPerMinute: 30,
		userTokensPerMonth:      1000,
	}
	request := httptest.NewRequest(http.MethodGet, "/gateway/summary", nil)
	response := httptest.NewRecorder()

	handler.handleGatewaySummary(response, request, "user-id")

	if response.Code != http.StatusOK {
		t.Fatalf("status = %d, want %d", response.Code, http.StatusOK)
	}
	var result struct {
		Provider          string `json:"provider"`
		Window            string `json:"window"`
		RequestCount      int64  `json:"request_count"`
		ErrorCount        int64  `json:"error_count"`
		RateLimitedCount  int64  `json:"rate_limited_count"`
		AverageLatencyMS  int64  `json:"average_latency_ms"`
		UserLimit         int    `json:"user_requests_per_minute"`
		APIKeyLimit       int    `json:"api_key_requests_per_minute"`
		InputTokens       int64  `json:"input_tokens"`
		OutputTokens      int64  `json:"output_tokens"`
		MonthlyTokens     int64  `json:"monthly_tokens"`
		MonthlyTokenQuota int64  `json:"monthly_token_quota"`
	}
	if err := json.NewDecoder(response.Body).Decode(&result); err != nil {
		t.Fatal(err)
	}
	if repository.userID != "user-id" || result.Provider != "test-provider" || result.Window != "24h" || result.RequestCount != 12 || result.ErrorCount != 2 || result.RateLimitedCount != 1 || result.AverageLatencyMS != 340 || result.UserLimit != 60 || result.APIKeyLimit != 30 || result.InputTokens != 100 || result.OutputTokens != 40 || result.MonthlyTokens != 200 || result.MonthlyTokenQuota != 1000 {
		t.Fatalf("unexpected summary: %#v", result)
	}
}

func TestGatewayRequests(t *testing.T) {
	repository := &recordingLLMRequests{requests: []*llmrequest.RequestRecord{{ID: "request-id", Model: "test-model"}}}
	handler := &Handler{llmrequest: repository}

	t.Run("defaults to 50 requests", func(t *testing.T) {
		request := httptest.NewRequest(http.MethodGet, "/gateway/requests", nil)
		response := httptest.NewRecorder()

		handler.handleGatewayRequests(response, request, "user-id")

		if response.Code != http.StatusOK || repository.limit != 50 {
			t.Fatalf("status = %d, limit = %d", response.Code, repository.limit)
		}
	})

	t.Run("uses requested limit", func(t *testing.T) {
		request := httptest.NewRequest(http.MethodGet, "/gateway/requests?limit=25", nil)
		response := httptest.NewRecorder()

		handler.handleGatewayRequests(response, request, "user-id")

		if response.Code != http.StatusOK || repository.userID != "user-id" || repository.limit != 25 {
			t.Fatalf("status = %d, user = %q, limit = %d", response.Code, repository.userID, repository.limit)
		}
	})

	for _, limit := range []string{"0", "101", "invalid"} {
		t.Run("rejects "+limit, func(t *testing.T) {
			request := httptest.NewRequest(http.MethodGet, "/gateway/requests?limit="+limit, nil)
			response := httptest.NewRecorder()

			handler.handleGatewayRequests(response, request, "user-id")

			if response.Code != http.StatusBadRequest {
				t.Fatalf("status = %d, want %d", response.Code, http.StatusBadRequest)
			}
		})
	}
}

func TestGatewayObservabilityRequiresClaims(t *testing.T) {
	handler := &Handler{}

	for _, test := range []struct {
		name    string
		handler http.HandlerFunc
	}{
		{"summary", handler.HandleGatewaySummary},
		{"requests", handler.HandleGatewayRequests},
	} {
		t.Run(test.name, func(t *testing.T) {
			request := httptest.NewRequest(http.MethodGet, "/gateway/"+test.name, nil)
			response := httptest.NewRecorder()

			test.handler(response, request)

			if response.Code != http.StatusUnauthorized {
				t.Fatalf("status = %d, want %d", response.Code, http.StatusUnauthorized)
			}
		})
	}
}
