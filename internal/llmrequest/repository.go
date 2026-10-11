package llmrequest

import "context"

type Repository interface {
	CreateLLMRequest(context.Context, *LLMRequest) error
}
