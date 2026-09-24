package api

import (
	"net/http"
)

func (h *Handler) Routes() http.Handler {
	mux := http.NewServeMux()

	mux.HandleFunc("POST /register", h.HandleRegister)
	mux.HandleFunc("POST /login", h.HandleLogin)
	mux.Handle("GET /profile", h.tokens.Middleware(http.HandlerFunc(h.HandleProfile)))

	return mux
}
