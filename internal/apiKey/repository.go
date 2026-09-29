package apikey

import (
	"context"
)

type Repository interface {
	CreateAPIKey(context.Context, *APIKey)
	GetActiveAPIKeyByHash(context.Context, string) (*APIKey, error)
}
