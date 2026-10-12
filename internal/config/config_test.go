package config

import "testing"

func TestLoadGatewayRateLimitDefaults(t *testing.T) {
	t.Setenv("GATEWAY_USER_REQUESTS_PER_MINUTE", "")
	t.Setenv("GATEWAY_API_KEY_REQUESTS_PER_MINUTE", "")

	cfg := Load()
	if cfg.GatewayUserRequestsPerMinute != 60 || cfg.GatewayAPIKeyRequestsPerMinute != 60 {
		t.Fatalf("unexpected defaults: %#v", cfg)
	}
}

func TestLoadGatewayRateLimitConfiguration(t *testing.T) {
	t.Setenv("GATEWAY_USER_REQUESTS_PER_MINUTE", "12")
	t.Setenv("GATEWAY_API_KEY_REQUESTS_PER_MINUTE", "24")

	cfg := Load()
	if cfg.GatewayUserRequestsPerMinute != 12 || cfg.GatewayAPIKeyRequestsPerMinute != 24 {
		t.Fatalf("unexpected limits: %#v", cfg)
	}
}

func TestLoadGatewayRateLimitRejectsInvalidValues(t *testing.T) {
	t.Setenv("GATEWAY_USER_REQUESTS_PER_MINUTE", "invalid")
	t.Setenv("GATEWAY_API_KEY_REQUESTS_PER_MINUTE", "0")

	cfg := Load()
	if cfg.GatewayUserRequestsPerMinute != 60 || cfg.GatewayAPIKeyRequestsPerMinute != 60 {
		t.Fatalf("unexpected fallback limits: %#v", cfg)
	}
}
