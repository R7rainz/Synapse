package config

import "testing"

func TestLoadGatewayRateLimitDefaults(t *testing.T) {
	t.Setenv("GATEWAY_USER_REQUESTS_PER_MINUTE", "")
	t.Setenv("GATEWAY_API_KEY_REQUESTS_PER_MINUTE", "")
	t.Setenv("GATEWAY_USER_TOKENS_PER_MONTH", "")
	t.Setenv("GATEWAY_API_KEY_TOKENS_PER_MONTH", "")

	cfg := Load()
	if cfg.GatewayUserRequestsPerMinute != 60 || cfg.GatewayAPIKeyRequestsPerMinute != 60 || cfg.GatewayUserTokensPerMonth != 0 || cfg.GatewayAPIKeyTokensPerMonth != 0 {
		t.Fatalf("unexpected defaults: %#v", cfg)
	}
}

func TestLoadGatewayRateLimitConfiguration(t *testing.T) {
	t.Setenv("GATEWAY_USER_REQUESTS_PER_MINUTE", "12")
	t.Setenv("GATEWAY_API_KEY_REQUESTS_PER_MINUTE", "24")
	t.Setenv("GATEWAY_USER_TOKENS_PER_MONTH", "100000")
	t.Setenv("GATEWAY_API_KEY_TOKENS_PER_MONTH", "50000")

	cfg := Load()
	if cfg.GatewayUserRequestsPerMinute != 12 || cfg.GatewayAPIKeyRequestsPerMinute != 24 || cfg.GatewayUserTokensPerMonth != 100000 || cfg.GatewayAPIKeyTokensPerMonth != 50000 {
		t.Fatalf("unexpected limits: %#v", cfg)
	}
}

func TestLoadGatewayRateLimitRejectsInvalidValues(t *testing.T) {
	t.Setenv("GATEWAY_USER_REQUESTS_PER_MINUTE", "invalid")
	t.Setenv("GATEWAY_API_KEY_REQUESTS_PER_MINUTE", "0")
	t.Setenv("GATEWAY_USER_TOKENS_PER_MONTH", "-1")
	t.Setenv("GATEWAY_API_KEY_TOKENS_PER_MONTH", "invalid")

	cfg := Load()
	if cfg.GatewayUserRequestsPerMinute != 60 || cfg.GatewayAPIKeyRequestsPerMinute != 60 || cfg.GatewayUserTokensPerMonth != 0 || cfg.GatewayAPIKeyTokensPerMonth != 0 {
		t.Fatalf("unexpected fallback limits: %#v", cfg)
	}
}
