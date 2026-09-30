package apikey

import (
	"context"
)

type Repository interface {
	CreateAPIKey(context.Context, *APIKey) error
	GetActiveAPIKeyByHash(context.Context, string) (*APIKey, error)
	RevokeAPIKey(context.Context, string, string) error // the two strings are userID and keyID
}
