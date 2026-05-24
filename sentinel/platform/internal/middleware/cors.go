package middleware

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/hydra/sentinel-service/internal/config"
)

func CORS(cfg *config.Config) gin.HandlerFunc {
	origins := strings.Split(cfg.Server.CORSOrigins, ",")
	return func(c *gin.Context) {
		origin := c.Request.Header.Get("Origin")
		mode := cfg.Server.Mode

		if mode != "release" || isOriginAllowed(origin, origins) {
			c.Header("Access-Control-Allow-Origin", origin)
		}
		c.Header("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS")
		c.Header("Access-Control-Allow-Headers", "Content-Type,Authorization,X-API-Key")
		c.Header("Access-Control-Allow-Credentials", "true")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}
		c.Next()
	}
}

func isOriginAllowed(origin string, allowlist []string) bool {
	for _, o := range allowlist {
		if strings.TrimSpace(o) == origin {
			return true
		}
	}
	return false
}
