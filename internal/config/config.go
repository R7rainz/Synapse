package config

import "os"

type Config struct {
	Port        string
	JWTSecret   []byte
	DatabaseURL string
	LLMProvider string
	LLMBaseURL  string
	LLMAPIKey   string
}

func Load() Config {
	return Config{
		Port:        ":1234",
		JWTSecret:   []byte(os.Getenv("JWT_SECRET")),
		DatabaseURL: os.Getenv("DATABASE_URL"),
		LLMProvider: os.Getenv("LLM_PROVIDER"),
		LLMBaseURL:  os.Getenv("LLM_BASE_URL"),
		LLMAPIKey:   os.Getenv("LLM_API_KEY"),
	}
}
