package api

import (
	"encoding/json"
	"errors"
	"net/http"
	"strings"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/r7rainz/synapse/internal/auth"
	"github.com/r7rainz/synapse/internal/document"
)

const (
	maxDocumentBodySize    = 128 << 10
	maxDocumentContentSize = 64 << 10
	maxDocumentTitleLength = 200
)

type createDocumentInput struct {
	Title   string `json:"title"`
	Content string `json:"content"`
}

func (h *Handler) HandleCreateDocument(w http.ResponseWriter, r *http.Request) {
	claims, ok := auth.ClaimsFromContext(r.Context())
	if !ok {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	var input createDocumentInput
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, maxDocumentBodySize)).Decode(&input); err != nil {
		http.Error(w, "Invalid JSON body", http.StatusBadRequest)
		return
	}

	title := strings.TrimSpace(input.Title)
	content := strings.TrimSpace(input.Content)
	if title == "" || len(title) > maxDocumentTitleLength {
		http.Error(w, "Title must be 1-200 bytes", http.StatusBadRequest)
		return
	}
	if content == "" || len(content) > maxDocumentContentSize {
		http.Error(w, "Content must be 1-65536 bytes", http.StatusBadRequest)
		return
	}

	contents := document.ChunkText(content)
	embeddings, err := h.gateway.Embeddings(r.Context(), h.embeddingModel, contents)
	if err != nil {
		status, message, code, headers := providerFailure(err)
		copyUpstreamHeaders(w.Header(), headers)
		writeChatError(w, status, message, code)
		return
	}

	chunks := make([]document.Chunk, len(contents))
	for i := range contents {
		chunks[i] = document.Chunk{Index: i, Content: contents[i], Embedding: embeddings[i]}
	}

	doc, err := h.documents.Create(r.Context(), claims.Subject, title, chunks)
	if err != nil {
		http.Error(w, "Could not save document", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	_ = json.NewEncoder(w).Encode(doc)
}

func (h *Handler) HandleListDocuments(w http.ResponseWriter, r *http.Request) {
	claims, ok := auth.ClaimsFromContext(r.Context())
	if !ok {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	documents, err := h.documents.ListByUser(r.Context(), claims.Subject)
	if err != nil {
		http.Error(w, "Could not list documents", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(documents)
}

func (h *Handler) HandleDeleteDocument(w http.ResponseWriter, r *http.Request) {
	claims, ok := auth.ClaimsFromContext(r.Context())
	if !ok {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	documentID := r.PathValue("id")
	if _, err := uuid.Parse(documentID); err != nil {
		http.Error(w, "Invalid document ID", http.StatusBadRequest)
		return
	}

	err := h.documents.DeleteByUser(r.Context(), claims.Subject, documentID)
	if errors.Is(err, pgx.ErrNoRows) {
		http.Error(w, "Document not found", http.StatusNotFound)
		return
	}
	if err != nil {
		http.Error(w, "Could not delete document", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
