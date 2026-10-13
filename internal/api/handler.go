package api

import (
	apikey "github.com/r7rainz/synapse/internal/apiKey"
	"github.com/r7rainz/synapse/internal/auth"
	"github.com/r7rainz/synapse/internal/document"
	"github.com/r7rainz/synapse/internal/gateway"
	"github.com/r7rainz/synapse/internal/llmrequest"
)

type Handler struct {
	key                     apikey.Repository
	auth                    *auth.Verifier
	gateway                 *gateway.Client
	llmrequest              llmrequest.Repository
	documents               document.Repository
	provider                string
	embeddingModel          string
	allowedModels           map[string]struct{}
	maxOutputTokens         int
	userRequestsPerMinute   int
	apiKeyRequestsPerMinute int
	userTokensPerMonth      int64
	apiKeyTokensPerMonth    int64
}

type RateLimitConfig struct {
	UserRequestsPerMinute   int
	APIKeyRequestsPerMinute int
	UserTokensPerMonth      int64
	APIKeyTokensPerMonth    int64
}

type GatewayPolicyConfig struct {
	AllowedModels   []string
	MaxOutputTokens int
}

func NewHandler(key apikey.Repository, verifier *auth.Verifier, gateway *gateway.Client, requests llmrequest.Repository, documents document.Repository, provider, embeddingModel string, policy GatewayPolicyConfig, limits RateLimitConfig) *Handler {
	allowedModels := make(map[string]struct{}, len(policy.AllowedModels))
	for _, model := range policy.AllowedModels {
		allowedModels[model] = struct{}{}
	}

	return &Handler{
		key:                     key,
		auth:                    verifier,
		gateway:                 gateway,
		llmrequest:              requests,
		documents:               documents,
		provider:                provider,
		embeddingModel:          embeddingModel,
		allowedModels:           allowedModels,
		maxOutputTokens:         policy.MaxOutputTokens,
		userRequestsPerMinute:   limits.UserRequestsPerMinute,
		apiKeyRequestsPerMinute: limits.APIKeyRequestsPerMinute,
		userTokensPerMonth:      limits.UserTokensPerMonth,
		apiKeyTokensPerMonth:    limits.APIKeyTokensPerMonth,
	}
}
