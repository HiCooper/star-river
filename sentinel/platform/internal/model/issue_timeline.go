package model

import (
	"time"

	"gorm.io/datatypes"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type IssueTimeline struct {
	ID          uuid.UUID      `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	IssueID     uuid.UUID      `gorm:"type:uuid;index;not null" json:"issue_id"`
	EventType   string         `json:"event_type"`
	Description string         `json:"description"`
	Metadata    datatypes.JSON `json:"metadata"`
	CreatedAt   time.Time      `json:"created_at"`
}

func (t *IssueTimeline) BeforeCreate(tx *gorm.DB) error {
	if t.ID == uuid.Nil {
		t.ID = uuid.New()
	}
	return nil
}
