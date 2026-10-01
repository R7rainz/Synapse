package api

import (
	"bytes"
	"encoding/json"
	"errors"
	"io"
	"net/http"

	apikey "github.com/r7rainz/synapse/internal/apiKey"
)

const maxChatBodySize = 1 << 20 //1 Mib

func (h *Handler) HandleChatCompletions(w http.ResponseWriter, r *http.Request) {
	if _, ok := apikey.APIKeyFromContext(r.Context()); !ok {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	body, err := io.ReadAll(http.MaxBytesReader(w, r.Body, maxChatBodySize))
	if err != nil {
		var maxErr *http.MaxBytesError
		if errors.As(err, &maxErr) {
			http.Error(w, "Request body too large", http.StatusRequestEntityTooLarge)
			return
		}

		http.Error(w, "Could not read request body", http.StatusBadRequest)
		return
	}

	if !json.Valid(body) {
		http.Error(w, "Invalid JSON body", http.StatusBadRequest)
		return
	}

	response, err := h.gateway.ChatCompletions(r.Context(), bytes.NewReader(body))
	if err != nil {
		http.Error(w, "LLM provider unavailable", http.StatusBadGateway)
		return
	}

	defer response.Body.Close()

	if contentType := response.Header.Get("Content-Type"); contentType != "" {
		w.Header().Set("Content-Type", contentType)
	}

	w.WriteHeader(response.StatusCode)
	_, _ = io.Copy(w, response.Body)
}
