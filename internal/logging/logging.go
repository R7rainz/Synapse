package logging

import (
	"fmt"
	"strings"

	"go.uber.org/zap"
)

func New(format string) (*zap.Logger, error) {
	switch strings.ToLower(strings.TrimSpace(format)) {
	case "console":
		return zap.NewDevelopment()
	case "json":
		return zap.NewProduction()
	default:
		return nil, fmt.Errorf("LOG_FORMAT must be console or json")
	}
}
