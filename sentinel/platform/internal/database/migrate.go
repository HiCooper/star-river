package database

import (
	"github.com/hydra/sentinel-service/internal/model"
	"gorm.io/gorm"
)

func RunMigrations(db *gorm.DB) error {
	return db.AutoMigrate(
		&model.Service{},
		&model.ErrorSignature{},
		&model.Issue{},
		&model.IssueTimeline{},
		&model.FixHistory{},
		&model.SafetyRule{},
	)
}
