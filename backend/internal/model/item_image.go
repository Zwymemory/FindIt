package model

import "time"

type ItemImage struct {
	ID        uint64    `gorm:"type:bigint unsigned;primaryKey;autoIncrement" json:"id"`
	ItemID    uint64    `gorm:"type:bigint unsigned;not null;index:idx_item_images_item_id" json:"item_id"`
	RecordID  *uint64   `gorm:"type:bigint unsigned;index:idx_item_images_record_id" json:"record_id"`
	UserID    uint64    `gorm:"type:bigint unsigned;not null;index:idx_item_images_user_id" json:"user_id"`
	ImageURL  string    `gorm:"type:varchar(255);not null" json:"image_url"`
	IsCover   bool      `gorm:"type:tinyint(1);not null;default:0" json:"is_cover"`
	Sort      int       `gorm:"type:int;not null;default:0" json:"sort"`
	CreatedAt time.Time `gorm:"type:datetime;not null;default:CURRENT_TIMESTAMP" json:"created_at"`

	Item   Item            `gorm:"constraint:OnUpdate:RESTRICT,OnDelete:RESTRICT;" json:"-"`
	Record *LocationRecord `gorm:"foreignKey:RecordID;constraint:OnUpdate:RESTRICT,OnDelete:RESTRICT;" json:"-"`
	User   User            `gorm:"constraint:OnUpdate:RESTRICT,OnDelete:RESTRICT;" json:"-"`
}
