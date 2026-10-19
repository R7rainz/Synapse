package config

import (
	"strings"
	"testing"
)

func validConfig() Config {
	return Config{
		DatabaseURL:            "postgres://localhost/synapse",
		LLMProvider:            "openai",
		LLMBaseURL:             "https://api.openai.com/v1",
		LLMAPIKey:              "secret-api-key",
		GatewayAllowedModels:   []string{"gpt-4.1-mini"},
		GatewayMaxOutputTokens: 4096,
		LogFormat:              "console",
	}
}

func TestLoadGatewayRateLimitDefaults(t *testing.T) {
	t.Setenv("GATEWAY_ALLOWED_MODELS", "")
	t.Setenv("GATEWAY_MAX_OUTPUT_TOKENS", "")
	t.Setenv("GATEWAY_USER_REQUESTS_PER_MINUTE", "")
	t.Setenv("GATEWAY_API_KEY_REQUESTS_PER_MINUTE", "")
	t.Setenv("GATEWAY_USER_TOKENS_PER_MONTH", "")
	t.Setenv("GATEWAY_API_KEY_TOKENS_PER_MONTH", "")

	cfg := Load()
	if len(cfg.GatewayAllowedModels) != 1 || cfg.GatewayAllowedModels[0] != "gpt-4.1-mini" || cfg.GatewayMaxOutputTokens != 4096 {
		t.Fatalf("unexpected gateway policy defaults: %#v", cfg)
	}
	if cfg.GatewayUserRequestsPerMinute != 60 || cfg.GatewayAPIKeyRequestsPerMinute != 60 || cfg.GatewayUserTokensPerMonth != 0 || cfg.GatewayAPIKeyTokensPerMonth != 0 {
		t.Fatalf("unexpected defaults: %#v", cfg)
	}
}

func TestLoadGatewayRateLimitConfiguration(t *testing.T) {
	t.Setenv("GATEWAY_ALLOWED_MODELS", " gpt-4.1-mini, gpt-4.1, gpt-4.1-mini ")
	t.Setenv("GATEWAY_MAX_OUTPUT_TOKENS", "2048")
	t.Setenv("GATEWAY_USER_REQUESTS_PER_MINUTE", "12")
	t.Setenv("GATEWAY_API_KEY_REQUESTS_PER_MINUTE", "24")
	t.Setenv("GATEWAY_USER_TOKENS_PER_MONTH", "100000")
	t.Setenv("GATEWAY_API_KEY_TOKENS_PER_MONTH", "50000")

	cfg := Load()
	if len(cfg.GatewayAllowedModels) != 2 || cfg.GatewayAllowedModels[0] != "gpt-4.1-mini" || cfg.GatewayAllowedModels[1] != "gpt-4.1" || cfg.GatewayMaxOutputTokens != 2048 {
		t.Fatalf("unexpected gateway policy: %#v", cfg)
	}
	if cfg.GatewayUserRequestsPerMinute != 12 || cfg.GatewayAPIKeyRequestsPerMinute != 24 || cfg.GatewayUserTokensPerMonth != 100000 || cfg.GatewayAPIKeyTokensPerMonth != 50000 {
		t.Fatalf("unexpected limits: %#v", cfg)
	}
}

func TestLoadGatewayRateLimitRejectsInvalidValues(t *testing.T) {
	t.Setenv("GATEWAY_ALLOWED_MODELS", ", ,")
	t.Setenv("GATEWAY_MAX_OUTPUT_TOKENS", "0")
	t.Setenv("GATEWAY_USER_REQUESTS_PER_MINUTE", "invalid")
	t.Setenv("GATEWAY_API_KEY_REQUESTS_PER_MINUTE", "0")
	t.Setenv("GATEWAY_USER_TOKENS_PER_MONTH", "-1")
	t.Setenv("GATEWAY_API_KEY_TOKENS_PER_MONTH", "invalid")

	cfg := Load()
	if len(cfg.GatewayAllowedModels) != 1 || cfg.GatewayAllowedModels[0] != "gpt-4.1-mini" || cfg.GatewayMaxOutputTokens != 4096 {
		t.Fatalf("unexpected fallback gateway policy: %#v", cfg)
	}
	if cfg.GatewayUserRequestsPerMinute != 60 || cfg.GatewayAPIKeyRequestsPerMinute != 60 || cfg.GatewayUserTokensPerMonth != 0 || cfg.GatewayAPIKeyTokensPerMonth != 0 {
		t.Fatalf("unexpected fallback limits: %#v", cfg)
	}
}

func TestConfigValidate(t *testing.T) {
	tests := []struct {
		name   string
		change func(*Config)
		want   string
	}{
		{name: "valid", change: func(*Config) {}, want: ""},
		{name: "database", change: func(c *Config) { c.DatabaseURL = "" }, want: "DATABASE_URL"},
		{name: "provider", change: func(c *Config) { c.LLMProvider = "" }, want: "LLM_PROVIDER"},
		{name: "api key", change: func(c *Config) { c.LLMAPIKey = "" }, want: "LLM_API_KEY"},
		{name: "base url", change: func(c *Config) { c.LLMBaseURL = "not-a-url" }, want: "LLM_BASE_URL"},
		{name: "models", change: func(c *Config) { c.GatewayAllowedModels = nil }, want: "GATEWAY_ALLOWED_MODELS"},
		{name: "output tokens", change: func(c *Config) { c.GatewayMaxOutputTokens = 0 }, want: "GATEWAY_MAX_OUTPUT_TOKENS"},
		{name: "log format", change: func(c *Config) { c.LogFormat = "yaml" }, want: "LOG_FORMAT"},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			cfg := validConfig()
			test.change(&cfg)
			err := cfg.Validate()
			if test.want == "" {
				if err != nil {
					t.Fatalf("Validate() error = %v", err)
				}
				return
			}
			if err == nil || !strings.Contains(err.Error(), test.want) {
				t.Fatalf("Validate() error = %v, want %q", err, test.want)
			}
			if strings.Contains(err.Error(), "secret-api-key") {
				t.Fatalf("validation error leaked secret: %v", err)
			}
		})
	}
}
