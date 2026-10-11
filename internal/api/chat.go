package api

import (
	"bytes"
	"encoding/json"
	"errors"
	"io"
	"log"
	"net/http"
	"time"

	apikey "github.com/r7rainz/synapse/internal/apiKey"
	"github.com/r7rainz/synapse/internal/llmrequest"
)

const maxChatBodySize = 1 << 20 // 1 Mib

type ChatCompletionInput struct {
	Model string `json:"model"`
}

func (h *Handler) HandleChatCompletions(w http.ResponseWriter, r *http.Request) {
	key, ok := apikey.APIKeyFromContext(r.Context())
	if !ok {
		http.Error(w, "Not Authorized", http.StatusUnauthorized)
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

	var input ChatCompletionInput
	if err := json.Unmarshal(body, &input); err != nil || input.Model == "" {
		http.Error(w, "A valid model is required", http.StatusBadRequest)
		return
	}

	startedAt := time.Now()
	response, err := h.gateway.ChatCompletions(r.Context(), bytes.NewReader(body))
	statusCode := http.StatusBadGateway
	if response != nil {
		statusCode = response.StatusCode
	}

	request := &llmrequest.LLMRequest{
		UserID:     key.UserID,
		APIKeyID:   key.ID,
		Provider:   h.provider,
		Model:      input.Model,
		StatusCode: statusCode,
		LatencyMS:  int(time.Since(startedAt).Milliseconds()),
	}
	if logErr := h.llmrequest.CreateLLMRequest(r.Context(), request); logErr != nil {
		log.Printf("failed to record LLM request: %v", logErr)
	}

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
