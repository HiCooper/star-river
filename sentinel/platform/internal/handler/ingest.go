package handler

import (
	"crypto/sha256"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"time"
	"unicode/utf8"

	"github.com/gin-gonic/gin"
	"gorm.io/datatypes"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"

	"github.com/hydra/sentinel-service/internal/deepdiagnose"
	"github.com/hydra/sentinel-service/internal/model"
	"github.com/hydra/sentinel-service/internal/notify"
	"github.com/hydra/sentinel-service/internal/triage"
	"github.com/hydra/sentinel-service/pkg/errors"
	"github.com/hydra/sentinel-service/pkg/response"
)

type IngestHandler struct {
	db     *gorm.DB
	triage *triage.Client
}

func NewIngestHandler(db *gorm.DB, triageClient *triage.Client) *IngestHandler {
	return &IngestHandler{db: db, triage: triageClient}
}

type IngestErrorReq struct {
	Timestamp   string `json:"timestamp" binding:"required"`
	Level       string `json:"level" binding:"required"`
	ErrorCode   string `json:"error_code"`
	Message     string `json:"message" binding:"required"`
	StackTrace  string `json:"stack_trace"`
	RawLog      string `json:"raw_log"`
	TraceID     string `json:"trace_id"`
	Handler     string `json:"handler"`
	File        string `json:"file"`
	Line        int    `json:"line"`
	ServiceName string `json:"service_name" binding:"required"`
}

// Threshold: create issue only when 10+ occurrences in 5 minutes, or on every 50th occurrence
const (
	thresholdCount   = 10
	thresholdWindow  = 5 * time.Minute
	reopenWindow     = 24 * time.Hour
)

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

		h.db.Model(&model.ErrorSignature{}).
			Where("id = ?", es.ID).
			Select("occurrence_count").
			Scan(&es.OccurrenceCount)

		actualCount++

		// Fix tracking: reopen if recently resolved
		h.maybeReopen(&es, &req)

		// Threshold-based issue creation
		h.maybeCreateIssue(&es, &req)
	}

	response.Success(c, gin.H{"ingested": actualCount})
}

func (h *IngestHandler) maybeReopen(sig *model.ErrorSignature, req *IngestErrorReq) {
	var issue model.Issue
	err := h.db.Where("signature_id = ? AND status = ?", sig.ID, "resolved").
		Order("resolved_at DESC").First(&issue).Error
	if err != nil {
		return
	}
	if issue.ResolvedAt != nil && time.Since(*issue.ResolvedAt) < reopenWindow {
		log.Printf("[sentinel] reopening issue %s — error recurred within 24h", issue.ID)
		h.db.Model(&issue).Updates(map[string]interface{}{
			"status":      "open",
			"resolved_at": nil,
			"fix_status":  "",
		})
		_ = h.db.Create(&model.IssueTimeline{
			IssueID:     issue.ID,
			EventType:   "reopened",
			Description: fmt.Sprintf("修复后 24h 内错误复现 (occurrence #%d)", sig.OccurrenceCount),
		})
		// Re-triage
		if h.triage != nil {
			go h.enrichWithAI(issue, req)
		}
	}
}

func (h *IngestHandler) maybeCreateIssue(sig *model.ErrorSignature, req *IngestErrorReq) {
	// Check if within threshold window
	inWindow := time.Since(sig.FirstSeenAt) < thresholdWindow
	shouldCreate := sig.OccurrenceCount == thresholdCount || // exactly at threshold
		sig.OccurrenceCount%50 == 0 || // every 50th for persistent issues
		(!inWindow && sig.OccurrenceCount >= thresholdCount) // first error after window

	if !shouldCreate {
		return
	}

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
		Description: fmt.Sprintf("Issue auto-created (occurrence #%d, threshold=%d/5min)", sig.OccurrenceCount, thresholdCount),
	})

	// Notify
	go func() {
		url := getSetting(h.db, "notify_dingtalk_url")
		notify.IssueCreated(url, issue.ID.String(), req.ServiceName, issue.Title, issue.Severity, issue.Category, issue.Severity)
	}()

	if h.triage != nil {
		go h.enrichWithAI(issue, req)
	}
}

func (h *IngestHandler) enrichWithAI(issue model.Issue, req *IngestErrorReq) {
	result, err := h.triage.Classify(
		req.ServiceName, req.ErrorCode, req.Message,
		req.StackTrace, req.File, req.Handler, req.Line,
	)
	if err != nil {
		log.Printf("[sentinel] AI triage failed for issue %s: %v", issue.ID, err)
		return
	}

	h.db.Model(&issue).Updates(map[string]interface{}{
		"ai_category": result.Category, "ai_severity": result.Severity,
		"ai_auto_fixable": result.AutoFixable, "ai_confidence": result.Confidence,
		"ai_suspected_file": result.SuspectedFile, "ai_suspected_line": result.SuspectedLine,
		"ai_fix_suggestion": result.FixSuggestion,
		"severity": result.Severity, "category": result.Category,
	})

	_ = h.db.Create(&model.IssueTimeline{
		IssueID: issue.ID, EventType: "ai_triaged",
		Description: fmt.Sprintf("AI classified as %s/%s (conf: %d%%)", result.Category, result.Severity, result.Confidence),
	})

	log.Printf("[sentinel] AI enriched issue %s: %s/%s", issue.ID, result.Category, result.Severity)

	needsDeep := result.Severity == "high" || result.Severity == "critical" || result.AutoFixable == "yes"
	if !needsDeep { return }

	var svc model.Service
	if err := h.db.Where("name = ?", req.ServiceName).First(&svc).Error; err != nil { return }

	diagnoseInput := deepdiagnose.DiagnoseInput{
		ServiceName: req.ServiceName, ErrorCode: req.ErrorCode, Message: req.Message,
		StackTrace: req.StackTrace, RawLog: req.RawLog,
		File: req.File, Line: req.Line, Handler: req.Handler,
		RepoPath: svc.RepoLocalPath, DocsPath: svc.DocsPath,
	}

	deepResult, err := deepdiagnose.Diagnose(diagnoseInput)
	if err != nil {
		log.Printf("[sentinel] deep diagnosis failed for issue %s: %v", issue.ID, err)
		return
	}

	deepJSON, _ := json.Marshal(deepResult)
	h.db.Model(&issue).Update("deep_diagnosis", datatypes.JSON(deepJSON))

	_ = h.db.Create(&model.IssueTimeline{
		IssueID: issue.ID, EventType: "deep_diagnosed",
		Description: fmt.Sprintf("Claude Code 精诊完成 (conf: %d%%)", deepResult.Confidence),
	})
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

func getSetting(db *gorm.DB, key string) string {
	var s model.Setting
	if err := db.Where("key = ?", key).First(&s).Error; err != nil {
		return ""
	}
	return s.Value
}
