package model

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type ErrorSignature struct {
	ID              uuid.UUID  `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	ServiceName     string     `gorm:"uniqueIndex:idx_service_sig;not null" json:"service_name"`
	Signature       string     `gorm:"uniqueIndex:idx_service_sig;not null" json:"signature"`
	ErrorCode       string     `json:"error_code"`
	ErrorCategory   string     `json:"error_category"`
	NormalizedMsg   string     `json:"normalized_msg"`
	FirstFile       string     `json:"first_file"`
	FirstFunction   string     `json:"first_function"`
	FirstLine       int        `json:"first_line"`
	OccurrenceCount int64      `gorm:"default:1" json:"occurrence_count"`
	FirstSeenAt     time.Time  `json:"first_seen_at"`
	LastSeenAt      time.Time  `json:"last_seen_at"`
	ResolvedAt      *time.Time `json:"resolved_at"`
	CreatedAt       time.Time  `json:"created_at"`
	UpdatedAt       time.Time  `json:"updated_at"`
}

func (e *ErrorSignature) BeforeCreate(tx *gorm.DB) error {
	if e.ID == uuid.Nil {
		e.ID = uuid.New()
	}
	return nil
}
