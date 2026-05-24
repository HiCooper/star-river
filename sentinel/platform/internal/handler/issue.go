package handler

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"github.com/hydra/sentinel-service/internal/model"
	"github.com/hydra/sentinel-service/pkg/errors"
	"github.com/hydra/sentinel-service/pkg/response"
)

type IssueHandler struct {
	db *gorm.DB
}

func NewIssueHandler(db *gorm.DB) *IssueHandler {
	return &IssueHandler{db: db}
}

func (h *IssueHandler) ListIssues(c *gin.Context) {
	var issues []model.Issue
	query := h.db.Model(&model.Issue{}).Preload("Signature").Order("created_at DESC")

	if svc := c.Query("service"); svc != "" {
		query = query.Where("service_name = ?", svc)
	}
	if sev := c.Query("severity"); sev != "" {
		query = query.Where("severity = ?", sev)
	}
	if status := c.Query("status"); status != "" {
		query = query.Where("status = ?", status)
	}

	page := 1
	pageSize := 20
	var total int64
	query.Count(&total)
	query.Offset((page - 1) * pageSize).Limit(pageSize).Find(&issues)

	response.SuccessWithPagination(c, issues, page, pageSize, int(total))
}

func (h *IssueHandler) GetIssue(c *gin.Context) {
	id := c.Param("id")
	var issue model.Issue
	if err := h.db.Preload("Signature").First(&issue, "id = ?", id).Error; err != nil {
		response.Error(c, http.StatusNotFound, errors.NotFound, "Issue not found")
		return
	}
	response.Success(c, issue)
}

func (h *IssueHandler) GetIssueTimeline(c *gin.Context) {
	id := c.Param("id")
	var timeline []model.IssueTimeline
	h.db.Where("issue_id = ?", id).Order("created_at ASC").Find(&timeline)
	response.Success(c, timeline)
}

func (h *IssueHandler) ApproveIssue(c *gin.Context) {
	id := c.Param("id")
	var issue model.Issue
	if err := h.db.First(&issue, "id = ?", id).Error; err != nil {
		response.Error(c, http.StatusNotFound, errors.NotFound, "Issue not found")
		return
	}

	now := time.Now()
	issue.ReviewStatus = "approved"
	issue.ReviewedAt = &now
	h.db.Save(&issue)

	h.db.Create(&model.IssueTimeline{
		IssueID:     issue.ID,
		EventType:   "review_approved",
		Description: "Issue approved for auto-fix",
	})

	response.Success(c, issue)
}

func (h *IssueHandler) RejectIssue(c *gin.Context) {
	id := c.Param("id")
	var issue model.Issue
	if err := h.db.First(&issue, "id = ?", id).Error; err != nil {
		response.Error(c, http.StatusNotFound, errors.NotFound, "Issue not found")
		return
	}

	now := time.Now()
	issue.ReviewStatus = "rejected"
	issue.ReviewedAt = &now
	h.db.Save(&issue)

	h.db.Create(&model.IssueTimeline{
		IssueID:     issue.ID,
		EventType:   "review_rejected",
		Description: "Issue rejected - requires manual fix",
	})

	response.Success(c, issue)
}
