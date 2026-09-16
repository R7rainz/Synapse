package auth

import "go.uber.org/zap"

type JWTService struct {
	logger   *zap.Logger
	issue    string
	clientID string
}

type JWTConfig struct {
	Logger   *zap.Logger
	Issuer   string
	ClientID string
}
