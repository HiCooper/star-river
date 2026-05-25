package model

import (
	"time"

	"gorm.io/datatypes"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Issue struct {
	ID          uuid.UUID  `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	ServiceName string     `gorm:"index;not null" json:"service_name"`
	SignatureID *uuid.UUID `gorm:"type:uuid" json:"signature_id"`
	Title       string     `json:"title"`
	Description string     `json:"description"`
	Category    string     `gorm:"default:unknown" json:"category"`
	Severity    string     `gorm:"default:medium" json:"severity"`
	Status      string     `gorm:"default:open;index" json:"status"`

	AICategory       string         `json:"ai_category"`
	AISeverity       string         `json:"ai_severity"`
	AIAutoFixable    string         `json:"ai_auto_fixable"`
	AIConfidence     int            `json:"ai_confidence"`
	AISuspectedFile  string         `json:"ai_suspected_file"`
	AISuspectedLine  int            `json:"ai_suspected_line"`
	AIFixSuggestion  string         `json:"ai_fix_suggestion"`
	AIRawResponse    datatypes.JSON `json:"ai_raw_response"`

	FixType      string  `json:"fix_type"`
	FixPRURL     string  `json:"fix_pr_url"`
	FixBranch    string  `json:"fix_branch"`
	FixCommitSHA string  `json:"fix_commit_sha"`
	FixStatus    string  `json:"fix_status"`
	FixLog        datatypes.JSON `json:"fix_log"`
	DeepDiagnosis   datatypes.JSON `json:"deep_diagnosis"`

	ReviewStatus string     `gorm:"default:pending" json:"review_status"`
	ReviewedBy   string     `json:"reviewed_by"`
	ReviewedAt   *time.Time `json:"reviewed_at"`

	FirstSeenAt time.Time  `json:"first_seen_at"`
	LastSeenAt  time.Time  `json:"last_seen_at"`
	ResolvedAt  *time.Time `json:"resolved_at"`
	CreatedAt   time.Time  `json:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at"`

	Signature *ErrorSignature `gorm:"foreignKey:SignatureID" json:"signature,omitempty"`
}

func (i *Issue) BeforeCreate(tx *gorm.DB) error {
	if i.ID == uuid.Nil {
		i.ID = uuid.New()
	}
	return nil
}
