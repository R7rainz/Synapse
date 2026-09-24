package config

import "os"

type Config struct {
	Port      string
	JWTSecret []byte
}

func Load() Config {
	return Config{
		Port:      ":1234",
		JWTSecret: []byte(os.Getenv("JWT_SECRET")),
	}
}
