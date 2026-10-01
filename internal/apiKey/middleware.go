package apikey

import (
	"context"
	"errors"
	"net/http"
	"strings"

	"github.com/jackc/pgx/v5"
)

type contextKey string

const apiKeyContextKey contextKey = "api_key"

func APIKeyFromContext(ctx context.Context) (*APIKey, bool) {
	key, ok := ctx.Value(apiKeyContextKey).(*APIKey)
	return key, ok
}

func Middleware(keys Repository, next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// 1. A credential must exist.
		authHeader := r.Header.Get("Authorization")
		if authHeader == "" {
			http.Error(w, "Invalid API Key", http.StatusUnauthorized)
			return
		}

		// 2. It must have the expected "Bearer <key>" shape.
		parts := strings.Fields(authHeader)
		if len(parts) != 2 || !strings.EqualFold(parts[0], "Bearer") {
			http.Error(w, "Invalid API Key", http.StatusUnauthorized)
			return
		}

		// 3. It must look like one of our keys.
		if !strings.HasPrefix(parts[1], "sk_") {
			http.Error(w, "Invalid API Key", http.StatusUnauthorized)
			return
		}

		// 4. Its hash must exist in the database.
		keyHash := HashAPIKey(parts[1])

		// 5. GetActiveAPIKeyByHash also rejects revoked or expired keys.
		key, err := keys.GetActiveAPIKeyByHash(r.Context(), keyHash)
		if errors.Is(err, pgx.ErrNoRows) {
			http.Error(w, "Invalid API Key", http.StatusUnauthorized)
			return
		}

		// 6. Any other lookup error means the database could not authenticate the key.
		if err != nil {
			http.Error(w, "Could not authenticate API key", http.StatusInternalServerError)
			return
		}

		// 7. On success, place the authenticated key in the request context.
		ctx := context.WithValue(r.Context(), apiKeyContextKey, key)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}
