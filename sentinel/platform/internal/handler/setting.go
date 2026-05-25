package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"github.com/hydra/sentinel-service/internal/model"
	"github.com/hydra/sentinel-service/pkg/errors"
	"github.com/hydra/sentinel-service/pkg/response"
)

type SettingHandler struct {
	db *gorm.DB
}

func NewSettingHandler(db *gorm.DB) *SettingHandler {
	model.SeedSettings(db)
	return &SettingHandler{db: db}
}

func (h *SettingHandler) GetSettings(c *gin.Context) {
	var settings []model.Setting
	_ = h.db.Order("key ASC").Find(&settings)
	// Convert to map
	result := map[string]string{}
	for _, s := range settings {
		result[s.Key] = s.Value
	}
	response.Success(c, result)
}

type UpdateSettingReq struct {
	Key   string `json:"key" binding:"required"`
	Value string `json:"value"`
}

func (h *SettingHandler) UpdateSetting(c *gin.Context) {
	var req UpdateSettingReq
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, http.StatusBadRequest, errors.ValidationError, err.Error())
		return
	}
	h.db.Save(&model.Setting{Key: req.Key, Value: req.Value})
	response.Success(c, gin.H{"key": req.Key, "value": req.Value})
}
