package config

import (
	"os"
	"strconv"
	"strings"
)

type Config struct {
	Port                           string
	DatabaseURL                    string
	AuthJWKSURL                    string
	AuthIssuer                     string
	AuthAudience                   string
	FrontendOrigin                 string
	LLMProvider                    string
	LLMBaseURL                     string
	LLMAPIKey                      string
	LLMEmbeddingModel              string
	GatewayUserRequestsPerMinute   int
	GatewayAPIKeyRequestsPerMinute int
}

func Load() Config {
	authIssuer := valueOrDefault("AUTH_ISSUER", "http://localhost:3000")

	return Config{
		Port:                           ":1234",
		DatabaseURL:                    os.Getenv("DATABASE_URL"),
		AuthJWKSURL:                    valueOrDefault("AUTH_JWKS_URL", strings.TrimRight(authIssuer, "/")+"/api/auth/jwks"),
		AuthIssuer:                     authIssuer,
		AuthAudience:                   valueOrDefault("AUTH_AUDIENCE", "synapse-api"),
		FrontendOrigin:                 valueOrDefault("FRONTEND_ORIGIN", "http://localhost:3000"),
		LLMProvider:                    os.Getenv("LLM_PROVIDER"),
		LLMBaseURL:                     os.Getenv("LLM_BASE_URL"),
		LLMAPIKey:                      os.Getenv("LLM_API_KEY"),
		LLMEmbeddingModel:              valueOrDefault("LLM_EMBEDDING_MODEL", "text-embedding-3-small"),
		GatewayUserRequestsPerMinute:   intValueOrDefault("GATEWAY_USER_REQUESTS_PER_MINUTE", 60),
		GatewayAPIKeyRequestsPerMinute: intValueOrDefault("GATEWAY_API_KEY_REQUESTS_PER_MINUTE", 60),
	}
}

func valueOrDefault(name, fallback string) string {
	if value := os.Getenv(name); value != "" {
		return value
	}
	return fallback
}

func intValueOrDefault(name string, fallback int) int {
	value, err := strconv.Atoi(os.Getenv(name))
	if err != nil || value < 1 {
		return fallback
	}
	return value
}
