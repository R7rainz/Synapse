package api

import (
	"net/http"

	apikey "github.com/r7rainz/synapse/internal/apiKey"
)

func (h *Handler) Routes() http.Handler {
	mux := http.NewServeMux()

	mux.Handle("GET /profile", h.auth.Middleware(http.HandlerFunc(h.HandleProfile)))
	mux.Handle("POST /documents", h.auth.Middleware(http.HandlerFunc(h.HandleCreateDocument)))
	mux.Handle("GET /documents", h.auth.Middleware(http.HandlerFunc(h.HandleListDocuments)))
	mux.Handle("DELETE /documents/{id}", h.auth.Middleware(http.HandlerFunc(h.HandleDeleteDocument)))
	mux.Handle("POST /api-keys", h.auth.Middleware(http.HandlerFunc(h.HandlerCreateAPIKey)))
	mux.Handle("DELETE /api-keys/{id}", h.auth.Middleware(http.HandlerFunc(h.HandlerRevokeAPIKey)))
	mux.Handle("POST /v1/chat/completions", apikey.Middleware(h.key, http.HandlerFunc(h.HandleChatCompletions)))
	mux.Handle("GET /api-keys", h.auth.Middleware(http.HandlerFunc(h.HandlerListAPIKey)))

	return mux
}
