package handler

import (
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"github.com/hydra/sentinel-service/internal/model"
	"github.com/hydra/sentinel-service/pkg/response"
)

type StatsHandler struct {
	db *gorm.DB
}

func NewStatsHandler(db *gorm.DB) *StatsHandler {
	return &StatsHandler{db: db}
}

type OverviewStats struct {
	TotalIssues    int64 `json:"total_issues"`
	OpenIssues     int64 `json:"open_issues"`
	ResolvedIssues int64 `json:"resolved_issues"`
	CriticalIssues int64 `json:"critical_issues"`
	HighIssues     int64 `json:"high_issues"`
	AutoFixed      int64 `json:"auto_fixed"`
}

func (h *StatsHandler) Overview(c *gin.Context) {
	var stats OverviewStats
	h.db.Model(&model.Issue{}).Count(&stats.TotalIssues)
	h.db.Model(&model.Issue{}).Where("status = 'open'").Count(&stats.OpenIssues)
	h.db.Model(&model.Issue{}).Where("status = 'resolved'").Count(&stats.ResolvedIssues)
	h.db.Model(&model.Issue{}).Where("severity = 'critical'").Count(&stats.CriticalIssues)
	h.db.Model(&model.Issue{}).Where("severity = 'high'").Count(&stats.HighIssues)
	h.db.Model(&model.Issue{}).Where("fix_type = 'auto'").Count(&stats.AutoFixed)
	response.Success(c, stats)
}
