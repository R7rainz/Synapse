package api

import (
	apikey "github.com/r7rainz/synapse/internal/apiKey"
	"github.com/r7rainz/synapse/internal/auth"
	"github.com/r7rainz/synapse/internal/document"
	"github.com/r7rainz/synapse/internal/gateway"
	"github.com/r7rainz/synapse/internal/llmrequest"
)

type Handler struct {
	key            apikey.Repository
	auth           *auth.Verifier
	gateway        *gateway.Client
	llmrequest     llmrequest.Repository
	documents      document.Repository
	provider       string
	embeddingModel string
}

func NewHandler(key apikey.Repository, verifier *auth.Verifier, gateway *gateway.Client, requests llmrequest.Repository, documents document.Repository, provider, embeddingModel string) *Handler {
	return &Handler{key: key, auth: verifier, gateway: gateway, llmrequest: requests, documents: documents, provider: provider, embeddingModel: embeddingModel}
}
