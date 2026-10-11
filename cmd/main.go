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
	"github.com/r7rainz/synapse/internal/gateway"
	"github.com/r7rainz/synapse/internal/llmrequest"
	"github.com/r7rainz/synapse/internal/user"
)

func main() {
	cfg := config.Load()
	if len(cfg.JWTSecret) < 32 {
		log.Fatal("JWT_SECRET must contain at least 32 bytes")
	}
	if cfg.DatabaseURL == "" {
		log.Fatal("DATABASE_URL is required")
	}
	ctx := context.Background()

	pool, err := pgxpool.New(ctx, cfg.DatabaseURL)
	if err != nil {
		log.Fatal(err)
	}
	defer pool.Close()

	if err := pool.Ping(ctx); err != nil {
		log.Fatal(err)
	}

	tokens := auth.NewJWTService(cfg.JWTSecret)
	users := user.NewPostgresRepository(pool)
	keys := apikey.NewPostgresRepository(pool)
	gateway := gateway.NewClient(cfg.LLMBaseURL, cfg.LLMAPIKey)
	requests := llmrequest.NewPostgresRepository(pool)
	handler := api.NewHandler(users, keys, tokens, gateway, requests, cfg.LLMProvider)

	log.Printf("Server running on port %s...", cfg.Port)
	server := &http.Server{
		Addr:              cfg.Port,
		Handler:           handler.Routes(),
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       10 * time.Second,
		WriteTimeout:      3 * time.Minute,
		IdleTimeout:       2 * time.Minute,
	}
	if err := server.ListenAndServe(); err != nil {
		log.Fatal(err)
	}
}
