package api

import (
	"encoding/json"
	"net/http"

	"github.com/r7rainz/synapse/internal/auth"
)

func (h *Handler) HandleProfile(w http.ResponseWriter, r *http.Request) {
	claims, ok := auth.ClaimsFromContext(r.Context())
	if !ok {
		http.Error(w, "Unauthorized context", http.StatusUnauthorized)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"message": "Hello , welcome to your secure profile",
		"user_id": claims.UserID,
	})
}
