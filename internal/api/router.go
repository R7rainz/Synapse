package api

import (
	"net/http"
)

func (h *Handler) Routes() http.Handler {
	mux := http.NewServeMux()

	mux.HandleFunc("POST /register", h.HandleRegister)
	mux.HandleFunc("POST /login", h.HandleLogin)
	mux.Handle("GET /profile", h.tokens.Middleware(http.HandlerFunc(h.HandleProfile)))
	mux.Handle("POST /api-keys", h.tokens.Middleware(http.HandlerFunc(h.HandlerCreateAPIKey)))
	mux.Handle("DELETE /api-keys/{id}", h.tokens.Middleware(http.HandlerFunc(h.HandlerRevokeAPIKey)))
	mux.Handle("GET /api-keys", h.tokens.Middleware(http.HandlerFunc(h.HandlerListAPIKey)))

	return mux
}
