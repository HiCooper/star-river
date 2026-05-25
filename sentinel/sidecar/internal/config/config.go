package config

import "os"

type Config struct {
	ServiceName string
	PlatformURL string
	LogPath     string
}

func Load() *Config {
	return &Config{
		ServiceName: getEnv("SENTINEL_SERVICE_NAME", "unknown"),
		PlatformURL: getEnv("SENTINEL_PLATFORM_URL", "http://localhost:8082"),
		LogPath:     getEnv("SENTINEL_LOG_PATH", ""),
	}
}

func (c *Config) Mode() string {
	if c.LogPath == "" || c.LogPath == "-" {
		return "pipe"
	}
	return "tail-f"
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
