package database

import (
	"findit/backend/internal/model"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

var fixedCategories = []model.Category{
	{Name: "证件", Code: "document", Icon: "📄", Description: "身份证、护照、驾驶证、银行卡", Sort: 1},
	{Name: "摄影器材", Code: "camera", Icon: "📷", Description: "相机、镜头、SD卡、电池、三脚架配件", Sort: 2},
	{Name: "电子设备", Code: "electronics", Icon: "💻", Description: "手机、平板、U盘、移动硬盘", Sort: 3},
	{Name: "钥匙", Code: "key", Icon: "🔑", Description: "家门钥匙、车钥匙、办公室钥匙", Sort: 4},
	{Name: "文件资料", Code: "file", Icon: "📁", Description: "合同、证书、发票、纸质资料", Sort: 5},
	{Name: "贵重物品", Code: "valuable", Icon: "💎", Description: "珠宝、收藏品、贵重纪念品", Sort: 6},
	{Name: "其他", Code: "other", Icon: "📦", Description: "其他物品", Sort: 99},
}

func SeedCategories(db *gorm.DB) error {
	return db.Clauses(clause.OnConflict{
		Columns:   []clause.Column{{Name: "code"}},
		DoNothing: true,
	}).Create(&fixedCategories).Error
}
