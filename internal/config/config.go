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
	GatewayAllowedModels           []string
	GatewayMaxOutputTokens         int
	GatewayUserRequestsPerMinute   int
	GatewayAPIKeyRequestsPerMinute int
	GatewayUserTokensPerMonth      int64
	GatewayAPIKeyTokensPerMonth    int64
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
		GatewayAllowedModels:           stringListValueOrDefault("GATEWAY_ALLOWED_MODELS", "gpt-4.1-mini"),
		GatewayMaxOutputTokens:         intValueOrDefault("GATEWAY_MAX_OUTPUT_TOKENS", 4096),
		GatewayUserRequestsPerMinute:   intValueOrDefault("GATEWAY_USER_REQUESTS_PER_MINUTE", 60),
		GatewayAPIKeyRequestsPerMinute: intValueOrDefault("GATEWAY_API_KEY_REQUESTS_PER_MINUTE", 60),
		GatewayUserTokensPerMonth:      int64ValueOrDefault("GATEWAY_USER_TOKENS_PER_MONTH", 0),
		GatewayAPIKeyTokensPerMonth:    int64ValueOrDefault("GATEWAY_API_KEY_TOKENS_PER_MONTH", 0),
	}
}

func stringListValueOrDefault(name, fallback string) []string {
	value := os.Getenv(name)
	if value == "" {
		value = fallback
	}

	parse := func(raw string) []string {
		seen := make(map[string]struct{})
		values := make([]string, 0)
		for item := range strings.SplitSeq(raw, ",") {
			item = strings.TrimSpace(item)
			if item == "" {
				continue
			}
			if _, ok := seen[item]; ok {
				continue
			}
			seen[item] = struct{}{}
			values = append(values, item)
		}
		return values
	}
	values := parse(value)
	if len(values) == 0 {
		return parse(fallback)
	}
	return values
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

func int64ValueOrDefault(name string, fallback int64) int64 {
	value, err := strconv.ParseInt(os.Getenv(name), 10, 64)
	if err != nil || value < 0 {
		return fallback
	}
	return value
}
