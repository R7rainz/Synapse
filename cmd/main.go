package main

import (
	"context"
	"log"
	"net/http"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/r7rainz/synapse/internal/api"
	apikey "github.com/r7rainz/synapse/internal/apiKey"
	"github.com/r7rainz/synapse/internal/auth"
	"github.com/r7rainz/synapse/internal/config"
	"github.com/r7rainz/synapse/internal/document"
	"github.com/r7rainz/synapse/internal/gateway"
	"github.com/r7rainz/synapse/internal/llmrequest"
)

func main() {
	cfg := config.Load()
	if cfg.DatabaseURL == "" {
		log.Fatal("DATABASE_URL is required")
	}
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	pool, err := pgxpool.New(ctx, cfg.DatabaseURL)
	if err != nil {
		log.Fatal(err)
	}
	defer pool.Close()

	if err := pool.Ping(ctx); err != nil {
		log.Fatal(err)
	}

	verifier, err := auth.NewVerifier(ctx, cfg.AuthJWKSURL, cfg.AuthIssuer, cfg.AuthAudience)
	if err != nil {
		log.Fatal(err)
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
	)

	log.Printf("Server running on port %s...", cfg.Port)
	server := &http.Server{
		Addr:              cfg.Port,
		Handler:           api.CORS(cfg.FrontendOrigin, handler.Routes()),
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       10 * time.Second,
		WriteTimeout:      3 * time.Minute,
		IdleTimeout:       2 * time.Minute,
	}
	if err := server.ListenAndServe(); err != nil {
		log.Fatal(err)
	}
}
