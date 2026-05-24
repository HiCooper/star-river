package handler

import (
	"github.com/gin-gonic/gin"
	"github.com/hydra/sentinel-service/pkg/response"
)

func Health(c *gin.Context) {
	response.Success(c, gin.H{"status": "ok", "service": "sentinel"})
}
