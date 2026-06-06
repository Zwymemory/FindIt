package database

import (
	"findit/backend/internal/model"

	"gorm.io/gorm"
)

func AutoMigrate(db *gorm.DB) error {
	return db.AutoMigrate(
		&model.User{},
		&model.Category{},
		&model.Item{},
		&model.LocationRecord{},
		&model.ItemImage{},
	)
}
