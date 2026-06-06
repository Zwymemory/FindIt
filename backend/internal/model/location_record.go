package model

import "time"

type LocationRecord struct {
	ID        uint64    `gorm:"type:bigint unsigned;primaryKey;autoIncrement" json:"id"`
	ItemID    uint64    `gorm:"type:bigint unsigned;not null;index:idx_location_records_item_id;index:idx_location_records_item_created_at,priority:1" json:"item_id"`
	UserID    uint64    `gorm:"type:bigint unsigned;not null;index:idx_location_records_user_id" json:"user_id"`
	Location  string    `gorm:"type:varchar(255);not null" json:"location"`
	PhotoURL  string    `gorm:"type:varchar(255);default:''" json:"photo_url"`
	Note      string    `gorm:"type:varchar(512);default:''" json:"note"`
	Type      string    `gorm:"type:varchar(32);not null;default:'move'" json:"type"`
	CreatedAt time.Time `gorm:"type:datetime;not null;default:CURRENT_TIMESTAMP;index:idx_location_records_created_at;index:idx_location_records_item_created_at,priority:2" json:"created_at"`

	Item Item `gorm:"constraint:OnUpdate:RESTRICT,OnDelete:RESTRICT;" json:"-"`
	User User `gorm:"constraint:OnUpdate:RESTRICT,OnDelete:RESTRICT;" json:"-"`
}
