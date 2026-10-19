package main

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"os"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/r7rainz/synapse/internal/api"
	apikey "github.com/r7rainz/synapse/internal/apiKey"
	"github.com/r7rainz/synapse/internal/auth"
	"github.com/r7rainz/synapse/internal/config"
	"github.com/r7rainz/synapse/internal/document"
	"github.com/r7rainz/synapse/internal/gateway"
	"github.com/r7rainz/synapse/internal/llmrequest"
	"github.com/r7rainz/synapse/internal/logging"
	"go.uber.org/zap"
)

func main() {
	cfg := config.Load()
	logger, err := logging.New(cfg.LogFormat)
	if err != nil {
		_, _ = fmt.Fprintf(os.Stderr, "invalid logging configuration: %v\n", err)
		os.Exit(1)
	}
	defer func() { _ = logger.Sync() }()
	if err := cfg.Validate(); err != nil {
		logger.Fatal("invalid configuration", zap.Error(err))
	}

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	pool, err := pgxpool.New(ctx, cfg.DatabaseURL)
	if err != nil {
		logger.Fatal("failed to create database pool", zap.Error(err))
	}
	defer pool.Close()

	if err := pool.Ping(ctx); err != nil {
		logger.Fatal("failed to connect to database", zap.Error(err))
	}

	verifier, err := auth.NewVerifier(ctx, cfg.AuthJWKSURL, cfg.AuthIssuer, cfg.AuthAudience)
	if err != nil {
		logger.Fatal("failed to initialize auth verifier", zap.Error(err))
	}
	keys := apikey.NewPostgresRepository(pool)
	gateway := gateway.NewClient(cfg.LLMBaseURL, cfg.LLMAPIKey)
	requests := llmrequest.NewPostgresRepository(pool)
	documents := document.NewPostgresRepository(pool)
	handler := api.NewHandler(
		keys,
		verifier,
		gateway,
		requests,
		documents,
		pool,
		cfg.LLMProvider,
		cfg.LLMEmbeddingModel,
		api.GatewayPolicyConfig{
			AllowedModels:   cfg.GatewayAllowedModels,
			MaxOutputTokens: cfg.GatewayMaxOutputTokens,
		},
		api.RateLimitConfig{
			UserRequestsPerMinute:   cfg.GatewayUserRequestsPerMinute,
			APIKeyRequestsPerMinute: cfg.GatewayAPIKeyRequestsPerMinute,
			UserTokensPerMonth:      cfg.GatewayUserTokensPerMonth,
			APIKeyTokensPerMonth:    cfg.GatewayAPIKeyTokensPerMonth,
		},
		logger,
	)

	logger.Info("server started",
		zap.String("addr", cfg.Port),
		zap.String("provider", cfg.LLMProvider),
		zap.Int("allowed_model_count", len(cfg.GatewayAllowedModels)),
	)
	server := &http.Server{
		Addr:              cfg.Port,
		Handler:           api.Logging(logger, api.CORS(cfg.FrontendOrigin, handler.Routes())),
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       10 * time.Second,
		WriteTimeout:      3 * time.Minute,
		IdleTimeout:       2 * time.Minute,
	}
	if err := server.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
		logger.Fatal("server stopped unexpectedly", zap.Error(err))
	}
}
