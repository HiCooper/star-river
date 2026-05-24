package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
	"gorm.io/datatypes"

	"github.com/hydra/sentinel-service/internal/model"
	"github.com/hydra/sentinel-service/pkg/errors"
	"github.com/hydra/sentinel-service/pkg/response"
)

type ServiceHandler struct {
	db *gorm.DB
}

func NewServiceHandler(db *gorm.DB) *ServiceHandler {
	return &ServiceHandler{db: db}
}

func (h *ServiceHandler) ListServices(c *gin.Context) {
	var services []model.Service
	h.db.Order("name ASC").Find(&services)
	response.Success(c, services)
}

func (h *ServiceHandler) GetService(c *gin.Context) {
	name := c.Param("name")
	var svc model.Service
	if err := h.db.First(&svc, "name = ?", name).Error; err != nil {
		response.Error(c, http.StatusNotFound, errors.ServiceNotFound, "Service not found: "+name)
		return
	}
	response.Success(c, svc)
}

type UpdateServiceConfigReq struct {
	ConfigJSON datatypes.JSON `json:"config_json"`
}

func (h *ServiceHandler) UpdateServiceConfig(c *gin.Context) {
	name := c.Param("name")
	var svc model.Service
	if err := h.db.First(&svc, "name = ?", name).Error; err != nil {
		response.Error(c, http.StatusNotFound, errors.ServiceNotFound, "Service not found: "+name)
		return
	}

	var req UpdateServiceConfigReq
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, http.StatusBadRequest, errors.ValidationError, err.Error())
		return
	}

	svc.ConfigJSON = req.ConfigJSON
	h.db.Save(&svc)
	response.Success(c, svc)
}
