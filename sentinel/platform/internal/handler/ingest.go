package handler

import (
	"crypto/sha256"
	"fmt"
	"net/http"
	"time"
	"unicode/utf8"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"

	"github.com/hydra/sentinel-service/internal/model"
	"github.com/hydra/sentinel-service/pkg/errors"
	"github.com/hydra/sentinel-service/pkg/response"
)

type IngestHandler struct {
	db *gorm.DB
}

func NewIngestHandler(db *gorm.DB) *IngestHandler {
	return &IngestHandler{db: db}
}

type IngestErrorReq struct {
	Timestamp string `json:"timestamp" binding:"required"`
	Level     string `json:"level" binding:"required"`
	ErrorCode string `json:"error_code"`
	Message   string `json:"message" binding:"required"`
	StackTrace string `json:"stack_trace"`
	TraceID   string `json:"trace_id"`
	Handler   string `json:"handler"`
	File      string `json:"file"`
	Line      int    `json:"line"`
	ServiceName string `json:"service_name" binding:"required"`
}

func (h *IngestHandler) IngestErrors(c *gin.Context) {
	var reqs []IngestErrorReq
	if err := c.ShouldBindJSON(&reqs); err != nil {
		response.Error(c, http.StatusBadRequest, errors.ValidationError, err.Error())
		return
	}

	for _, req := range reqs {
		sig := computeSignature(req.ServiceName, req.ErrorCode, req.File, req.Message)
		now := time.Now()

		// Atomic upsert: insert or increment counter atomically
		es := model.ErrorSignature{
			ServiceName: req.ServiceName,
			Signature:   sig,
		}
		result := h.db.Clauses(clause.OnConflict{
			Columns: []clause.Column{{Name: "service_name"}, {Name: "signature"}},
			DoUpdates: clause.Assignments(map[string]interface{}{
				"occurrence_count": gorm.Expr("error_signatures.occurrence_count + 1"),
				"last_seen_at":     now,
			}),
		}).Create(&es)

		if result.Error != nil {
			continue
		}

		// On first insert, populate remaining fields
		if result.RowsAffected > 0 {
			h.db.Model(&es).Updates(map[string]interface{}{
				"error_code":    req.ErrorCode,
				"normalized_msg": simplifyMsg(req.Message),
				"first_file":    req.File,
				"first_function": req.Handler,
				"first_line":    req.Line,
				"first_seen_at": now,
			})
		}

		h.maybeCreateIssue(&es, &req)
	}

	response.Success(c, gin.H{"ingested": len(reqs)})
}

func (h *IngestHandler) maybeCreateIssue(sig *model.ErrorSignature, req *IngestErrorReq) {
	var currentCount int64
	h.db.Model(&model.ErrorSignature{}).Where("id = ?", sig.ID).Select("occurrence_count").Scan(&currentCount)

	if currentCount == 1 || currentCount%10 == 0 {
		var count int64
		h.db.Model(&model.Issue{}).Where("signature_id = ? AND status NOT IN ('resolved','ignored')", sig.ID).Count(&count)
		if count > 0 {
			return
		}

		issue := model.Issue{
			ServiceName: sig.ServiceName,
			SignatureID: &sig.ID,
			Title:       fmt.Sprintf("[%s] %s: %s", sig.ServiceName, sig.ErrorCode, req.Message),
			Category:    "unknown",
			Severity:    "medium",
			Status:      "open",
			FirstSeenAt: sig.FirstSeenAt,
			LastSeenAt:  sig.LastSeenAt,
		}
		if err := h.db.Create(&issue).Error; err != nil {
			return
		}

		h.db.Create(&model.IssueTimeline{
			IssueID:     issue.ID,
			EventType:   "created",
			Description: fmt.Sprintf("Issue auto-created from error signature %s", sig.Signature[:8]),
		})
	}
}

func computeSignature(service, errorCode, file, message string) string {
	raw := fmt.Sprintf("%s|%s|%s|%s", service, errorCode, file, simplifyMsg(message))
	h := sha256.Sum256([]byte(raw))
	return fmt.Sprintf("%x", h)
}

func simplifyMsg(msg string) string {
	if utf8.RuneCountInString(msg) > 80 {
		runes := []rune(msg)
		return string(runes[:80])
	}
	return msg
}
