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

type Summary struct {
	RequestCount     int64 `json:"request_count"`
	ErrorCount       int64 `json:"error_count"`
	RateLimitedCount int64 `json:"rate_limited_count"`
	AverageLatencyMS int64 `json:"average_latency_ms"`
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
