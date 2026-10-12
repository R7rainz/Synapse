package document

import "context"

type Repository interface {
	Create(context.Context, string, string, []Chunk) (*Document, error)
	ListByUser(context.Context, string) ([]*Document, error)
	DeleteByUser(context.Context, string, string) error
	EnsureOwned(context.Context, string, []string) error
	SearchChunks(context.Context, string, []string, []float64, int) ([]Chunk, error)
}
