package model

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type FixHistory struct {
	ID            uuid.UUID  `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	IssueID       uuid.UUID  `gorm:"type:uuid;index;not null" json:"issue_id"`
	FixType       string     `json:"fix_type"`
	RepoURL       string     `json:"repo_url"`
	BranchName    string     `json:"branch_name"`
	CommitSHA     string     `json:"commit_sha"`
	PRURL         string     `json:"pr_url"`
	PRStatus      string     `json:"pr_status"`
	DiffSizeLines int        `json:"diff_size_lines"`
	TestPassed    *bool      `json:"test_passed"`
	RetryCount    int        `gorm:"default:0" json:"retry_count"`
	ErrorMessage  string     `json:"error_message"`
	CreatedAt     time.Time  `json:"created_at"`
	CompletedAt   *time.Time `json:"completed_at"`
}

func (f *FixHistory) BeforeCreate(tx *gorm.DB) error {
	if f.ID == uuid.Nil {
		f.ID = uuid.New()
	}
	return nil
}
