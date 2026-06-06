package model

import (
	"time"

	"gorm.io/gorm"
)

type User struct {
	ID           uint64         `gorm:"type:bigint unsigned;primaryKey;autoIncrement" json:"id"`
	Username     string         `gorm:"type:varchar(64);not null;uniqueIndex:uk_users_username" json:"username"`
	Email        string         `gorm:"type:varchar(128);not null;uniqueIndex:uk_users_email" json:"email"`
	PasswordHash string         `gorm:"type:varchar(255);not null" json:"-"`
	Avatar       string         `gorm:"type:varchar(255);default:''" json:"avatar"`
	CreatedAt    time.Time      `gorm:"type:datetime;not null;default:CURRENT_TIMESTAMP" json:"created_at"`
	UpdatedAt    time.Time      `gorm:"type:datetime;not null;default:CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP" json:"updated_at"`
	DeletedAt    gorm.DeletedAt `gorm:"type:datetime;index:idx_users_deleted_at" json:"-"`
}
