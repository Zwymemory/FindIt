package model

import "time"

type Category struct {
	ID          uint64    `gorm:"type:bigint unsigned;primaryKey;autoIncrement" json:"id"`
	Name        string    `gorm:"type:varchar(32);not null;uniqueIndex:uk_categories_name" json:"name"`
	Code        string    `gorm:"type:varchar(32);not null;uniqueIndex:uk_categories_code" json:"code"`
	Icon        string    `gorm:"type:varchar(64);not null" json:"icon"`
	Description string    `gorm:"type:varchar(255);default:''" json:"description"`
	Sort        int       `gorm:"type:int;not null;default:0" json:"sort"`
	CreatedAt   time.Time `gorm:"type:datetime;not null;default:CURRENT_TIMESTAMP" json:"-"`
	UpdatedAt   time.Time `gorm:"type:datetime;not null;default:CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP" json:"-"`
}
