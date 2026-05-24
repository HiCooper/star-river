package config

import (
	"os"
)

type Config struct {
	Server   ServerConfig
	Database DatabaseConfig
}

type ServerConfig struct {
	Port        string
	Mode        string
	CORSOrigins string
}

type DatabaseConfig struct {
	URL            string
	MaxOpenConns   int
	MaxIdleConns   int
	ConnMaxLifetime int
}

func Load() (*Config, error) {
	cfg := &Config{
		Server: ServerConfig{
			Port:        getEnv("PORT", "8082"),
			Mode:        getEnv("GIN_MODE", "debug"),
			CORSOrigins: getEnv("CORS_ORIGINS", "http://localhost:3000"),
		},
		Database: DatabaseConfig{
			URL:             getEnv("DATABASE_URL", "postgres://hydra:hydra_secret@localhost:5432/sentinel?sslmode=disable"),
			MaxOpenConns:    getEnvInt("DB_MAX_OPEN_CONNS", 25),
			MaxIdleConns:    getEnvInt("DB_MAX_IDLE_CONNS", 10),
			ConnMaxLifetime: getEnvInt("DB_CONN_MAX_LIFETIME", 300),
		},
	}
	return cfg, nil
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func getEnvInt(key string, fallback int) int {
	s := os.Getenv(key)
	if s == "" {
		return fallback
	}
	var v int
	for _, c := range s {
		if c < '0' || c > '9' {
			return fallback
		}
		v = v*10 + int(c-'0')
	}
	return v
}
