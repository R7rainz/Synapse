package apikey

import (
	"context"
)

type Repository interface {
	CreateAPIKey(context.Context, *APIKey) error
	AuthenticateAPIKeyByHash(context.Context, string) (*APIKey, error)
	RevokeAPIKey(context.Context, string, string) error // the two strings are userID and keyID
	ListAPIKeysByUser(context.Context, string) ([]*APIKey, error)
}
