package llmrequest

import "context"

type Repository interface {
	CreateLLMRequest(context.Context, *LLMRequest) error
	ConsumeRateLimit(context.Context, string, string, int) (*RateLimitResult, error)
	CheckMonthlyTokenQuota(context.Context, string, string, int64) (*TokenQuotaResult, error)
	SummaryByUser(context.Context, string) (*Summary, error)
	ListByUser(context.Context, string, int) ([]*RequestRecord, error)
}
