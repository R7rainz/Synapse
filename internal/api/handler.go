package api

import (
	"context"

	apikey "github.com/r7rainz/synapse/internal/apiKey"
	"github.com/r7rainz/synapse/internal/auth"
	"github.com/r7rainz/synapse/internal/document"
	"github.com/r7rainz/synapse/internal/gateway"
	"github.com/r7rainz/synapse/internal/llmrequest"
	"go.uber.org/zap"
)

type DatabasePinger interface {
	Ping(context.Context) error
}

var nopLogger = zap.NewNop()

type Handler struct {
	key                     apikey.Repository
	auth                    *auth.Verifier
	gateway                 *gateway.Client
	llmrequest              llmrequest.Repository
	documents               document.Repository
	database                DatabasePinger
	logger                  *zap.Logger
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

func NewHandler(key apikey.Repository, verifier *auth.Verifier, gateway *gateway.Client, requests llmrequest.Repository, documents document.Repository, database DatabasePinger, provider, embeddingModel string, policy GatewayPolicyConfig, limits RateLimitConfig, logger *zap.Logger) *Handler {
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
		database:                database,
		logger:                  logger,
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

func (h *Handler) log() *zap.Logger {
	if h.logger == nil {
		return nopLogger
	}
	return h.logger
}
