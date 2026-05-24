package model

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type SafetyRule struct {
	ID          uuid.UUID `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	ServiceName string    `json:"service_name"`
	RuleType    string    `json:"rule_type"`
	RuleValue   string    `json:"rule_value"`
	Priority    int       `gorm:"default:0" json:"priority"`
	Enabled     bool      `gorm:"default:true" json:"enabled"`
	CreatedAt   time.Time `json:"created_at"`
}

func (s *SafetyRule) BeforeCreate(tx *gorm.DB) error {
	if s.ID == uuid.Nil {
		s.ID = uuid.New()
	}
	return nil
}
