package config

import "os"

type Config struct {
	ServiceName   string
	PlatformURL   string
	LogPath       string
}

func Load() *Config {
	return &Config{
		ServiceName: getEnv("SENTINEL_SERVICE_NAME", "unknown"),
		PlatformURL: getEnv("SENTINEL_PLATFORM_URL", "http://localhost:8082"),
		LogPath:     getEnv("SENTINEL_LOG_PATH", "/var/log/app/output.log"),
	}
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
