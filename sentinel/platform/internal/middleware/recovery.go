package middleware

import (
	"log"
	"net/http"
	"runtime/debug"

	"github.com/gin-gonic/gin"
	"github.com/hydra/sentinel-service/pkg/errors"
	"github.com/hydra/sentinel-service/pkg/response"
)

func Recovery() gin.HandlerFunc {
	return func(c *gin.Context) {
		defer func() {
			if r := recover(); r != nil {
				log.Printf("[sentinel] PANIC: %v\n%s", r, string(debug.Stack()))
				response.Error(c, http.StatusInternalServerError, errors.InternalError, "Internal server error")
				c.Abort()
			}
		}()
		c.Next()
	}
}
