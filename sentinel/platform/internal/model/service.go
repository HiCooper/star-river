package model

import (
	"time"

	"gorm.io/datatypes"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Service struct {
	ID          uuid.UUID      `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	Name        string         `gorm:"uniqueIndex;not null" json:"name"`
	DisplayName string         `json:"display_name"`
	RepoURL     string         `json:"repo_url"`
	RepoBranch  string         `gorm:"default:main" json:"repo_branch"`
	Language    string         `json:"language"`
	OwnerTeam   string         `json:"owner_team"`
	Status      string         `gorm:"default:active" json:"status"`
	ConfigJSON  datatypes.JSON `json:"config_json"`
	RepoLocalPath string         `json:"repo_local_path"`
	DocsPath      string         `json:"docs_path"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
}

func (s *Service) BeforeCreate(tx *gorm.DB) error {
	if s.ID == uuid.Nil {
		s.ID = uuid.New()
	}
	return nil
}
