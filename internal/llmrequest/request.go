package llmrequest

import "time"

type LLMRequest struct {
	ID           string
	UserID       string
	APIKeyID     *string
	Provider     string
	Model        string
	InputTokens  int
	OutputTokens int
	StatusCode   int
	LatencyMS    int
	RateLimited  bool
	CreatedAt    time.Time
}

const (
	RateLimitScopeUser   = "user"
	RateLimitScopeAPIKey = "api_key"
)

type RateLimitResult struct {
	Allowed   bool
	Remaining int64
	ResetAt   time.Time
}

type TokenQuotaResult struct {
	Allowed   bool
	Used      int64
	Remaining int64
	ResetAt   time.Time
}

type Summary struct {
	RequestCount     int64 `json:"request_count"`
	ErrorCount       int64 `json:"error_count"`
	RateLimitedCount int64 `json:"rate_limited_count"`
	AverageLatencyMS int64 `json:"average_latency_ms"`
	InputTokens      int64 `json:"input_tokens"`
	OutputTokens     int64 `json:"output_tokens"`
	MonthlyTokens    int64 `json:"monthly_tokens"`
}

type UsagePeriod struct {
	RequestCount     int64 `json:"request_count"`
	ErrorCount       int64 `json:"error_count"`
	RateLimitedCount int64 `json:"rate_limited_count"`
	AverageLatencyMS int64 `json:"average_latency_ms"`
	InputTokens      int64 `json:"input_tokens"`
	OutputTokens     int64 `json:"output_tokens"`
	TotalTokens      int64 `json:"total_tokens"`
}

type UsageQuota struct {
	Used      int64 `json:"used"`
	Limit     int64 `json:"limit"`
	Remaining int64 `json:"remaining"`
}

type ModelUsage struct {
	Model            string `json:"model"`
	RequestCount     int64  `json:"request_count"`
	ErrorCount       int64  `json:"error_count"`
	AverageLatencyMS int64  `json:"average_latency_ms"`
	InputTokens      int64  `json:"input_tokens"`
	OutputTokens     int64  `json:"output_tokens"`
	TotalTokens      int64  `json:"total_tokens"`
}

type UsageReport struct {
	Last24Hours UsagePeriod  `json:"last_24h"`
	MonthToDate UsagePeriod  `json:"month_to_date"`
	Quota       UsageQuota   `json:"quota"`
	Models      []ModelUsage `json:"models"`
}

type RequestRecord struct {
	ID           string    `json:"id"`
	APIKeyID     *string   `json:"api_key_id,omitempty"`
	APIKeyName   *string   `json:"api_key_name,omitempty"`
	APIKeyPrefix *string   `json:"api_key_prefix,omitempty"`
	Provider     string    `json:"provider"`
	Model        string    `json:"model"`
	StatusCode   int       `json:"status_code"`
	LatencyMS    int       `json:"latency_ms"`
	CreatedAt    time.Time `json:"created_at"`
}
