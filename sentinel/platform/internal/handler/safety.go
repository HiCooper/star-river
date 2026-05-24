package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"github.com/hydra/sentinel-service/internal/model"
	"github.com/hydra/sentinel-service/pkg/errors"
	"github.com/hydra/sentinel-service/pkg/response"
)

type SafetyHandler struct {
	db *gorm.DB
}

func NewSafetyHandler(db *gorm.DB) *SafetyHandler {
	return &SafetyHandler{db: db}
}

func (h *SafetyHandler) ListRules(c *gin.Context) {
	var rules []model.SafetyRule
	h.db.Order("priority DESC").Find(&rules)
	response.Success(c, rules)
}

func (h *SafetyHandler) CreateRule(c *gin.Context) {
	var rule model.SafetyRule
	if err := c.ShouldBindJSON(&rule); err != nil {
		response.Error(c, http.StatusBadRequest, errors.ValidationError, err.Error())
		return
	}
	if err := h.db.Create(&rule).Error; err != nil { response.Error(c, http.StatusInternalServerError, errors.InternalError, "Failed to create rule"); return }
	response.Success(c, rule)
}

func (h *SafetyHandler) DeleteRule(c *gin.Context) {
	id := c.Param("id")
	if err := h.db.Delete(&model.SafetyRule{}, "id = ?", id).Error; err != nil {
		response.Error(c, http.StatusInternalServerError, errors.InternalError, "Failed to delete rule")
		return
	}
	response.Success(c, gin.H{"deleted": id})
}
