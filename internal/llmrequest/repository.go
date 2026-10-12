package llmrequest

import "context"

type Repository interface {
	CreateLLMRequest(context.Context, *LLMRequest) error
	ConsumeRateLimit(context.Context, string, string, int) (*RateLimitResult, error)
	SummaryByUser(context.Context, string) (*Summary, error)
	ListByUser(context.Context, string, int) ([]*RequestRecord, error)
}
