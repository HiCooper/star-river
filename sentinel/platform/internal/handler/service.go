package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

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
	_ = h.db.Order("name ASC").Find(&services)
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

type CreateServiceReq struct {
	Name        string `json:"name" binding:"required"`
	DisplayName string `json:"display_name"`
	RepoURL     string `json:"repo_url"`
	OwnerTeam   string `json:"owner_team"`
}

func (h *ServiceHandler) CreateService(c *gin.Context) {
	var req CreateServiceReq
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, http.StatusBadRequest, errors.ValidationError, err.Error())
		return
	}

	svc := model.Service{
		Name:        req.Name,
		DisplayName: req.DisplayName,
		RepoURL:     req.RepoURL,
		OwnerTeam:   req.OwnerTeam,
	}
	if err := h.db.Create(&svc).Error; err != nil {
		response.Error(c, http.StatusInternalServerError, errors.InternalError, "Failed to create service")
		return
	}
	response.Success(c, svc)
}

type UpdateServiceConfigReq struct {
	RepoLocalPath string `json:"repo_local_path"`
	DocsPath      string `json:"docs_path"`
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

	svc.RepoLocalPath = req.RepoLocalPath
	svc.DocsPath = req.DocsPath
	if err := h.db.Save(&svc).Error; err != nil {
		response.Error(c, http.StatusInternalServerError, errors.InternalError, "Failed to save service")
		return
	}
	response.Success(c, svc)
}
