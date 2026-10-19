package api

import (
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/r7rainz/synapse/internal/auth"
	"github.com/r7rainz/synapse/internal/llmrequest"
)

const (
	defaultRequestLimit = 50
	maxRequestLimit     = 100
)

func (h *Handler) HandleGatewaySummary(w http.ResponseWriter, r *http.Request) {
	claims, ok := auth.ClaimsFromContext(r.Context())
	if !ok {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}
	h.handleGatewaySummary(w, r, claims.Subject)
}

func (h *Handler) handleGatewaySummary(w http.ResponseWriter, r *http.Request, userID string) {
	summary, err := h.llmrequest.SummaryByUser(r.Context(), userID)
	if err != nil {
		http.Error(w, "Could not load gateway summary", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(struct {
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
	}{
		Provider:          h.provider,
		Window:            "24h",
		RequestCount:      summary.RequestCount,
		ErrorCount:        summary.ErrorCount,
		RateLimitedCount:  summary.RateLimitedCount,
		AverageLatencyMS:  summary.AverageLatencyMS,
		UserLimit:         h.userRequestsPerMinute,
		APIKeyLimit:       h.apiKeyRequestsPerMinute,
		InputTokens:       summary.InputTokens,
		OutputTokens:      summary.OutputTokens,
		MonthlyTokens:     summary.MonthlyTokens,
		MonthlyTokenQuota: h.userTokensPerMonth,
	})
}

func (h *Handler) HandleGatewayUsage(w http.ResponseWriter, r *http.Request) {
	claims, ok := auth.ClaimsFromContext(r.Context())
	if !ok {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	reporter, ok := h.llmrequest.(llmrequest.UsageReporter)
	if !ok {
		http.Error(w, "Usage reporting is unavailable", http.StatusInternalServerError)
		return
	}

	usage, err := reporter.UsageByUser(r.Context(), claims.Subject)
	if err != nil {
		http.Error(w, "Could not load gateway usage", http.StatusInternalServerError)
		return
	}

	usage.Quota = llmrequest.UsageQuota{
		Used:  usage.MonthToDate.TotalTokens,
		Limit: h.userTokensPerMonth,
	}
	if h.userTokensPerMonth > 0 {
		usage.Quota.Remaining = h.userTokensPerMonth - usage.Quota.Used
		if usage.Quota.Remaining < 0 {
			usage.Quota.Remaining = 0
		}
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(usage)
}

func (h *Handler) HandleGatewayRequests(w http.ResponseWriter, r *http.Request) {
	claims, ok := auth.ClaimsFromContext(r.Context())
	if !ok {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}
	h.handleGatewayRequests(w, r, claims.Subject)
}

func (h *Handler) handleGatewayRequests(w http.ResponseWriter, r *http.Request, userID string) {
	limit := defaultRequestLimit
	if value := r.URL.Query().Get("limit"); value != "" {
		parsed, err := strconv.Atoi(value)
		if err != nil || parsed < 1 || parsed > maxRequestLimit {
			http.Error(w, "Limit must be between 1 and 100", http.StatusBadRequest)
			return
		}
		limit = parsed
	}

	requests, err := h.llmrequest.ListByUser(r.Context(), userID, limit)
	if err != nil {
		http.Error(w, "Could not load gateway requests", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(requests)
}
