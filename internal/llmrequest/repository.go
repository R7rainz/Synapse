package llmrequest

import "context"

type Repository interface {
	CreateLLMRequest(context.Context, *LLMRequest) error
	SummaryByUser(context.Context, string) (*Summary, error)
	ListByUser(context.Context, string, int) ([]*RequestRecord, error)
}
