package api

import (
	"context"
	"encoding/json"
	"net/http"
	"time"

	"go.uber.org/zap"
)

var readinessTimeout = 2 * time.Second

func (h *Handler) HandleHealth(w http.ResponseWriter, _ *http.Request) {
	writeHealth(w, http.StatusOK, "ok")
}

func (h *Handler) HandleReadiness(w http.ResponseWriter, r *http.Request) {
	if h.database == nil {
		h.log().Warn("readiness check failed", zap.String("reason", "database_not_configured"))
		writeHealth(w, http.StatusServiceUnavailable, "not_ready")
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), readinessTimeout)
	defer cancel()
	if err := h.database.Ping(ctx); err != nil {
		h.log().Warn("readiness check failed", zap.Error(err))
		writeHealth(w, http.StatusServiceUnavailable, "not_ready")
		return
	}

	writeHealth(w, http.StatusOK, "ready")
}

func writeHealth(w http.ResponseWriter, status int, state string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(map[string]string{"status": state})
}
