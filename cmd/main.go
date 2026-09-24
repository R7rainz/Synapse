package main

import (
	"log"
	"net/http"

	"github.com/r7rainz/synapse/internal/api"
	"github.com/r7rainz/synapse/internal/auth"
	"github.com/r7rainz/synapse/internal/config"
)

func main() {
	cfg := config.Load()
	tokens := auth.NewJWTService(cfg.JWTSecret)
	handler := api.NewHandler(nil, tokens)

	log.Printf("Server running on port %s...", cfg.Port)
	if err := http.ListenAndServe(cfg.Port, handler.Routes()); err != nil {
		log.Fatal(err)
	}
}
