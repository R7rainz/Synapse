package api

import (
	"encoding/json"
	"errors"
	"net/http"
	"strings"

	"github.com/jackc/pgx/v5"
	apikey "github.com/r7rainz/synapse/internal/apiKey"
	"github.com/r7rainz/synapse/internal/auth"
)

func (h *Handler) HandlerCreateAPIKey(w http.ResponseWriter, r *http.Request) {
	claims, ok := auth.ClaimsFromContext(r.Context())
	if !ok {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	var req struct {
		Name string `json:"name"`
	}
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 4096)).Decode(&req); err != nil {
		http.Error(w, "Invalid JSON body", http.StatusBadRequest)
		return
	}
	name := strings.TrimSpace(req.Name)
	if name == "" || len(name) > 100 {
		http.Error(w, "Name must be 1-100 bytes", http.StatusBadRequest)
		return
	}
	rawKey, prefix, hash, err := apikey.GenerateAPIKey()
	if err != nil {
		http.Error(w, "Could not generate API Key", http.StatusInternalServerError)
		return
	}

	key := &apikey.APIKey{
		UserID:    claims.UserID,
		Name:      name,
		KeyPrefix: prefix,
		KeyHash:   hash,
	}
	if err := h.key.CreateAPIKey(r.Context(), key); err != nil {
		http.Error(w, "Could not save API Key", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]any{
		"api_key":    rawKey,
		"id":         key.ID,
		"name":       key.Name,
		"key_prefix": key.KeyPrefix,
		"created_at": key.CreatedAt,
	})
}

func (h *Handler) HandlerRevokeAPIKey(w http.ResponseWriter, r *http.Request) {
	claims, ok := auth.ClaimsFromContext(r.Context())
	keyID := r.PathValue("id")

	if !ok {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}
	err := h.key.RevokeAPIKey(r.Context(), claims.UserID, keyID)
	if errors.Is(err, pgx.ErrNoRows) {
		http.Error(w, "API key not found", http.StatusNotFound)
		return
	}
	if err != nil {
		http.Error(w, "Could not revoke API key", http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h *Handler) HandlerListAPIKey(w http.ResponseWriter, r *http.Request) {
	claims, ok := auth.ClaimsFromContext(r.Context())
	if !ok {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	keys, err := h.key.ListAPIKeysByUser(r.Context(), claims.UserID)
	if err != nil {
		http.Error(w, "Could not list API Keys", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(keys)
}
