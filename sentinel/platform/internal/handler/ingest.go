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
	Timestamp   string `json:"timestamp" binding:"required"`
	Level       string `json:"level" binding:"required"`
	ErrorCode   string `json:"error_code"`
	Message     string `json:"message" binding:"required"`
	StackTrace  string `json:"stack_trace"`
	TraceID     string `json:"trace_id"`
	Handler     string `json:"handler"`
	File        string `json:"file"`
	Line        int    `json:"line"`
	ServiceName string `json:"service_name" binding:"required"`
}

func (h *IngestHandler) IngestErrors(c *gin.Context) {
	var reqs []IngestErrorReq
	if err := c.ShouldBindJSON(&reqs); err != nil {
		response.Error(c, http.StatusBadRequest, errors.ValidationError, err.Error())
		return
	}

	actualCount := 0
	for _, req := range reqs {
		sig := computeSignature(req.ServiceName, req.ErrorCode, req.File, req.Message)
		now := time.Now()

		es := model.ErrorSignature{
			ServiceName:     req.ServiceName,
			Signature:       sig,
			ErrorCode:       req.ErrorCode,
			NormalizedMsg:   simplifyMsg(req.Message),
			FirstFile:       req.File,
			FirstFunction:   req.Handler,
			FirstLine:       req.Line,
			OccurrenceCount: 1,
			FirstSeenAt:     now,
			LastSeenAt:      now,
		}

		result := h.db.Clauses(clause.OnConflict{
			Columns: []clause.Column{{Name: "service_name"}, {Name: "signature"}},
			DoUpdates: clause.Assignments(map[string]interface{}{
				"occurrence_count": gorm.Expr("error_signatures.occurrence_count + 1"),
				"last_seen_at":     now,
				"error_code":       req.ErrorCode,
				"normalized_msg":   simplifyMsg(req.Message),
			}),
		}).Create(&es)

		if result.Error != nil {
			continue
		}

		// Re-read occurrence_count scoped to this specific row
		h.db.Model(&model.ErrorSignature{}).
			Where("id = ?", es.ID).
			Select("occurrence_count").
			Scan(&es.OccurrenceCount)

		actualCount++
		h.maybeCreateIssue(&es, &req)
	}

	response.Success(c, gin.H{"ingested": actualCount})
}

func (h *IngestHandler) maybeCreateIssue(sig *model.ErrorSignature, req *IngestErrorReq) {
	if sig.OccurrenceCount == 1 || sig.OccurrenceCount%10 == 0 {
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

		_ = h.db.Create(&model.IssueTimeline{
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
