package main

import (
	"context"
	"log"
	"net/http"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/r7rainz/synapse/internal/api"
	apikey "github.com/r7rainz/synapse/internal/apiKey"
	"github.com/r7rainz/synapse/internal/auth"
	"github.com/r7rainz/synapse/internal/config"
	"github.com/r7rainz/synapse/internal/gateway"
	"github.com/r7rainz/synapse/internal/user"
)

func main() {
	cfg := config.Load()
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
	handler := api.NewHandler(users, keys, tokens, gateway)

	log.Printf("Server running on port %s...", cfg.Port)
	if err := http.ListenAndServe(cfg.Port, handler.Routes()); err != nil {
		log.Fatal(err)
	}
}
