package model

import (
	"gorm.io/gorm"
)

type Setting struct {
	Key   string `gorm:"primaryKey" json:"key"`
	Value string `json:"value"`
}

func (s *Setting) BeforeCreate(tx *gorm.DB) error {
	return nil
}

// Preload default settings if not exist
func SeedSettings(db *gorm.DB) {
	defaults := map[string]string{
		"notify_dingtalk_url": "",
		"notify_slack_url":    "",
		"notify_feishu_url":   "",
	}
	for k, v := range defaults {
		db.FirstOrCreate(&Setting{Key: k}, Setting{Key: k, Value: v})
	}
}
