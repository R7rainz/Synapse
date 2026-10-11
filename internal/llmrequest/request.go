package llmrequest

import "time"

type LLMRequest struct {
	ID           string
	UserID       string
	APIKeyID     string
	Provider     string
	Model        string
	InputTokens  int
	OutputTokens int
	StatusCode   int
	LatencyMS    int
	CreatedAt    time.Time
}
