package model

import (
	"time"

	"gorm.io/gorm"
)

type Item struct {
	ID              uint64         `gorm:"type:bigint unsigned;primaryKey;autoIncrement" json:"id"`
	UserID          uint64         `gorm:"type:bigint unsigned;not null;index:idx_items_user_id;index:idx_items_user_updated_at,priority:1" json:"user_id"`
	CategoryID      uint64         `gorm:"type:bigint unsigned;not null;index:idx_items_category_id" json:"category_id"`
	Name            string         `gorm:"type:varchar(128);not null" json:"name"`
	Remark          string         `gorm:"type:varchar(512);default:''" json:"remark"`
	CoverImage      string         `gorm:"type:varchar(255);default:''" json:"cover_image"`
	LatestLocation  string         `gorm:"type:varchar(255);not null" json:"latest_location"`
	ReminderEnabled bool           `gorm:"type:tinyint(1);not null;default:1" json:"reminder_enabled"`
	ReminderDays    int            `gorm:"type:int;not null;default:30" json:"reminder_days"`
	LastConfirmedAt *time.Time     `gorm:"type:datetime" json:"last_confirmed_at"`
	NextRemindAt    *time.Time     `gorm:"type:datetime;index:idx_items_next_remind_at" json:"next_remind_at"`
	CreatedAt       time.Time      `gorm:"type:datetime;not null;default:CURRENT_TIMESTAMP" json:"created_at"`
	UpdatedAt       time.Time      `gorm:"type:datetime;not null;default:CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;index:idx_items_user_updated_at,priority:2" json:"updated_at"`
	DeletedAt       gorm.DeletedAt `gorm:"type:datetime;index:idx_items_deleted_at" json:"-"`

	User     User     `gorm:"constraint:OnUpdate:RESTRICT,OnDelete:RESTRICT;" json:"-"`
	Category Category `gorm:"constraint:OnUpdate:RESTRICT,OnDelete:RESTRICT;" json:"-"`
}
