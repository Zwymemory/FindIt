package handler

import (
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"findit/backend/internal/middleware"
	"findit/backend/internal/model"
	"findit/backend/pkg/response"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

const maxPhotoSize = 5 << 20

var allowedPhotoTypes = map[string]string{
	"image/jpeg": ".jpg",
	"image/png":  ".png",
	"image/webp": ".webp",
}

type ItemHandler struct {
	db *gorm.DB
}

type savedPhoto struct {
	URL  string
	Path string
}

type createItemResponse struct {
	ID              uint64      `json:"id"`
	UserID          uint64      `json:"user_id"`
	CategoryID      uint64      `json:"category_id"`
	Name            string      `json:"name"`
	Remark          string      `json:"remark"`
	CoverImage      string      `json:"cover_image"`
	LatestLocation  string      `json:"latest_location"`
	ReminderEnabled bool        `json:"reminder_enabled"`
	ReminderDays    int         `json:"reminder_days"`
	LastConfirmedAt *time.Time  `json:"last_confirmed_at"`
	NextRemindAt    *time.Time  `json:"next_remind_at"`
	LocationRecord  recordInfo  `json:"location_record"`
	Images          []imageInfo `json:"images"`
}

type itemListResponse struct {
	List     []itemSummary `json:"list"`
	Page     int           `json:"page"`
	PageSize int           `json:"page_size"`
	Total    int64         `json:"total"`
}

type itemSummary struct {
	ID              uint64       `json:"id"`
	Category        categoryInfo `json:"category"`
	Name            string       `json:"name"`
	Remark          string       `json:"remark"`
	CoverImage      string       `json:"cover_image"`
	LatestLocation  string       `json:"latest_location"`
	ReminderEnabled bool         `json:"reminder_enabled"`
	ReminderDays    int          `json:"reminder_days"`
	LastConfirmedAt *time.Time   `json:"last_confirmed_at"`
	NextRemindAt    *time.Time   `json:"next_remind_at"`
	CreatedAt       time.Time    `json:"created_at"`
	UpdatedAt       time.Time    `json:"updated_at"`
}

type itemDetailResponse struct {
	ID              uint64       `json:"id"`
	Category        categoryInfo `json:"category"`
	Name            string       `json:"name"`
	Remark          string       `json:"remark"`
	CoverImage      string       `json:"cover_image"`
	LatestLocation  string       `json:"latest_location"`
	ReminderEnabled bool         `json:"reminder_enabled"`
	ReminderDays    int          `json:"reminder_days"`
	LastConfirmedAt *time.Time   `json:"last_confirmed_at"`
	NextRemindAt    *time.Time   `json:"next_remind_at"`
	CreatedAt       time.Time    `json:"created_at"`
	UpdatedAt       time.Time    `json:"updated_at"`
	Images          []imageInfo  `json:"images"`
	LatestRecord    *recordInfo  `json:"latest_record"`
}

type categoryInfo struct {
	ID          uint64 `json:"id"`
	Name        string `json:"name"`
	Code        string `json:"code"`
	Icon        string `json:"icon"`
	Description string `json:"description"`
	Sort        int    `json:"sort"`
}

type recordInfo struct {
	ID        uint64      `json:"id"`
	Location  string      `json:"location"`
	PhotoURL  string      `json:"photo_url"`
	Note      string      `json:"note"`
	Type      string      `json:"type"`
	CreatedAt time.Time   `json:"created_at"`
	Images    []imageInfo `json:"images"`
}

type imageInfo struct {
	ID        uint64    `json:"id"`
	ImageURL  string    `json:"image_url"`
	IsCover   bool      `json:"is_cover"`
	Sort      int       `json:"sort"`
	CreatedAt time.Time `json:"created_at"`
}

func NewItemHandler(db *gorm.DB) *ItemHandler {
	return &ItemHandler{db: db}
}

func (h *ItemHandler) Detail(c *gin.Context) {
	userID, ok := currentUserID(c)
	if !ok {
		response.Error(c, response.CodeUnauthorized, "unauthorized", http.StatusUnauthorized)
		return
	}

	itemID, err := parsePathID(c.Param("id"))
	if err != nil {
		response.Error(c, response.CodeInvalidParams, "invalid item id", http.StatusBadRequest)
		return
	}

	item, err := h.findOwnedItem(c, userID, itemID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			response.Error(c, response.CodeNotFound, "item not found", http.StatusNotFound)
			return
		}

		response.Error(c, response.CodeInternalError, "failed to query item", http.StatusInternalServerError)
		return
	}

	images, err := h.findItemImages(c, item.ID)
	if err != nil {
		response.Error(c, response.CodeInternalError, "failed to query item images", http.StatusInternalServerError)
		return
	}

	latestRecord, err := h.findLatestRecord(c, userID, item.ID)
	if err != nil {
		response.Error(c, response.CodeInternalError, "failed to query latest record", http.StatusInternalServerError)
		return
	}

	response.Success(c, toItemDetail(item, images, latestRecord))
}

func (h *ItemHandler) History(c *gin.Context) {
	userID, ok := currentUserID(c)
	if !ok {
		response.Error(c, response.CodeUnauthorized, "unauthorized", http.StatusUnauthorized)
		return
	}

	itemID, err := parsePathID(c.Param("id"))
	if err != nil {
		response.Error(c, response.CodeInvalidParams, "invalid item id", http.StatusBadRequest)
		return
	}

	item, err := h.findOwnedItem(c, userID, itemID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			response.Error(c, response.CodeNotFound, "item not found", http.StatusNotFound)
			return
		}

		response.Error(c, response.CodeInternalError, "failed to query item", http.StatusInternalServerError)
		return
	}

	var records []model.LocationRecord
	if err := h.db.WithContext(c.Request.Context()).
		Where("item_id = ? AND user_id = ?", item.ID, userID).
		Order("created_at DESC, id DESC").
		Find(&records).Error; err != nil {
		response.Error(c, response.CodeInternalError, "failed to query history", http.StatusInternalServerError)
		return
	}

	recordImages, err := h.findRecordImages(c, records)
	if err != nil {
		response.Error(c, response.CodeInternalError, "failed to query record images", http.StatusInternalServerError)
		return
	}

	history := make([]recordInfo, 0, len(records))
	for _, record := range records {
		history = append(history, toRecordInfo(record, recordImages[record.ID]))
	}

	response.Success(c, history)
}

func (h *ItemHandler) UpdateLocation(c *gin.Context) {
	userID, ok := currentUserID(c)
	if !ok {
		response.Error(c, response.CodeUnauthorized, "unauthorized", http.StatusUnauthorized)
		return
	}

	itemID, err := parsePathID(c.Param("id"))
	if err != nil {
		response.Error(c, response.CodeInvalidParams, "invalid item id", http.StatusBadRequest)
		return
	}

	item, err := h.findOwnedItem(c, userID, itemID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			response.Error(c, response.CodeNotFound, "item not found", http.StatusNotFound)
			return
		}

		response.Error(c, response.CodeInternalError, "failed to query item", http.StatusInternalServerError)
		return
	}

	location := strings.TrimSpace(c.PostForm("location"))
	if location == "" {
		response.Error(c, response.CodeInvalidParams, "location is required", http.StatusBadRequest)
		return
	}

	photos, err := saveUploadedPhotos(c)
	if err != nil {
		response.Error(c, response.CodeInvalidParams, err.Error(), http.StatusBadRequest)
		return
	}

	record, err := h.updateLocationInTransaction(c, item, userID, location, c.PostForm("note"), photos)
	if err != nil {
		cleanupSavedPhotos(photos)
		response.Error(c, response.CodeInternalError, "failed to update location", http.StatusInternalServerError)
		return
	}

	response.Success(c, record, http.StatusCreated)
}

func (h *ItemHandler) List(c *gin.Context) {
	userID, ok := currentUserID(c)
	if !ok {
		response.Error(c, response.CodeUnauthorized, "unauthorized", http.StatusUnauthorized)
		return
	}

	page, err := parseOptionalInt(c.Query("page"), 1)
	if err != nil || page <= 0 {
		response.Error(c, response.CodeInvalidParams, "page must be a positive integer", http.StatusBadRequest)
		return
	}

	pageSize, err := parseOptionalInt(c.Query("page_size"), 10)
	if err != nil || pageSize <= 0 {
		response.Error(c, response.CodeInvalidParams, "page_size must be a positive integer", http.StatusBadRequest)
		return
	}

	query := h.db.WithContext(c.Request.Context()).Model(&model.Item{}).Where("items.user_id = ?", userID)

	if strings.TrimSpace(c.Query("category_id")) != "" {
		categoryID, err := strconv.ParseUint(strings.TrimSpace(c.Query("category_id")), 10, 64)
		if err != nil || categoryID == 0 {
			response.Error(c, response.CodeInvalidParams, "category_id must be a positive integer", http.StatusBadRequest)
			return
		}

		query = query.Where("items.category_id = ?", categoryID)
	}

	if keyword := strings.TrimSpace(c.Query("keyword")); keyword != "" {
		like := "%" + keyword + "%"
		query = query.Where(
			`items.name LIKE ?
				OR items.remark LIKE ?
				OR items.latest_location LIKE ?
				OR EXISTS (
					SELECT 1
					FROM location_records
					WHERE location_records.item_id = items.id
						AND location_records.user_id = items.user_id
						AND (location_records.location LIKE ? OR location_records.note LIKE ?)
				)`,
			like,
			like,
			like,
			like,
			like,
		)
	}

	var total int64
	if err := query.Session(&gorm.Session{}).Distinct("items.id").Count(&total).Error; err != nil {
		response.Error(c, response.CodeInternalError, "failed to count items", http.StatusInternalServerError)
		return
	}

	var items []model.Item
	if err := query.
		Preload("Category").
		Order("items.updated_at DESC").
		Limit(pageSize).
		Offset((page - 1) * pageSize).
		Find(&items).Error; err != nil {
		response.Error(c, response.CodeInternalError, "failed to query items", http.StatusInternalServerError)
		return
	}

	list := make([]itemSummary, 0, len(items))
	for _, item := range items {
		list = append(list, toItemSummary(item))
	}

	response.Success(c, itemListResponse{
		List:     list,
		Page:     page,
		PageSize: pageSize,
		Total:    total,
	})
}

func (h *ItemHandler) Create(c *gin.Context) {
	userID, ok := currentUserID(c)
	if !ok {
		response.Error(c, response.CodeUnauthorized, "unauthorized", http.StatusUnauthorized)
		return
	}

	categoryID, err := parseRequiredUint(c.PostForm("category_id"), "category_id")
	if err != nil {
		response.Error(c, response.CodeInvalidParams, err.Error(), http.StatusBadRequest)
		return
	}

	name := strings.TrimSpace(c.PostForm("name"))
	location := strings.TrimSpace(c.PostForm("location"))
	if name == "" {
		response.Error(c, response.CodeInvalidParams, "name is required", http.StatusBadRequest)
		return
	}
	if location == "" {
		response.Error(c, response.CodeInvalidParams, "location is required", http.StatusBadRequest)
		return
	}

	reminderEnabled, err := parseOptionalBool(c.PostForm("reminder_enabled"), true)
	if err != nil {
		response.Error(c, response.CodeInvalidParams, "reminder_enabled must be a boolean", http.StatusBadRequest)
		return
	}

	reminderDays, err := parseOptionalInt(c.PostForm("reminder_days"), 30)
	if err != nil || reminderDays <= 0 {
		response.Error(c, response.CodeInvalidParams, "reminder_days must be a positive integer", http.StatusBadRequest)
		return
	}

	var category model.Category
	if err := h.db.First(&category, categoryID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			response.Error(c, response.CodeInvalidParams, "category not found", http.StatusBadRequest)
			return
		}

		response.Error(c, response.CodeInternalError, "failed to query category", http.StatusInternalServerError)
		return
	}

	photos, err := saveUploadedPhotos(c)
	if err != nil {
		response.Error(c, response.CodeInvalidParams, err.Error(), http.StatusBadRequest)
		return
	}

	result, err := h.createItemInTransaction(c, userID, categoryID, name, c.PostForm("remark"), location, c.PostForm("note"), reminderEnabled, reminderDays, photos)
	if err != nil {
		cleanupSavedPhotos(photos)
		response.Error(c, response.CodeInternalError, "failed to create item", http.StatusInternalServerError)
		return
	}

	response.Success(c, result, http.StatusCreated)
}

func (h *ItemHandler) createItemInTransaction(c *gin.Context, userID uint64, categoryID uint64, name string, remark string, location string, note string, reminderEnabled bool, reminderDays int, photos []savedPhoto) (*createItemResponse, error) {
	now := time.Now()
	var nextRemindAt *time.Time
	if reminderEnabled {
		next := now.AddDate(0, 0, reminderDays)
		nextRemindAt = &next
	}

	coverImage := ""
	if len(photos) > 0 {
		coverImage = photos[0].URL
	}

	item := model.Item{
		UserID:          userID,
		CategoryID:      categoryID,
		Name:            name,
		Remark:          remark,
		CoverImage:      coverImage,
		LatestLocation:  location,
		ReminderEnabled: reminderEnabled,
		ReminderDays:    reminderDays,
		LastConfirmedAt: &now,
		NextRemindAt:    nextRemindAt,
	}

	locationRecord := model.LocationRecord{}
	itemImages := make([]model.ItemImage, 0, len(photos))

	err := h.db.WithContext(c.Request.Context()).Transaction(func(tx *gorm.DB) error {
		if err := tx.Select(
			"UserID",
			"CategoryID",
			"Name",
			"Remark",
			"CoverImage",
			"LatestLocation",
			"ReminderEnabled",
			"ReminderDays",
			"LastConfirmedAt",
			"NextRemindAt",
		).Create(&item).Error; err != nil {
			return err
		}
		if err := tx.Model(&item).UpdateColumn("reminder_enabled", reminderEnabled).Error; err != nil {
			return err
		}
		item.ReminderEnabled = reminderEnabled

		photoURL := ""
		if len(photos) > 0 {
			photoURL = photos[0].URL
		}

		locationRecord = model.LocationRecord{
			ItemID:   item.ID,
			UserID:   userID,
			Location: location,
			PhotoURL: photoURL,
			Note:     note,
			Type:     "create",
		}
		if err := tx.Create(&locationRecord).Error; err != nil {
			return err
		}

		for i, photo := range photos {
			itemImages = append(itemImages, model.ItemImage{
				ItemID:   item.ID,
				RecordID: &locationRecord.ID,
				UserID:   userID,
				ImageURL: photo.URL,
				IsCover:  i == 0,
				Sort:     i + 1,
			})
		}
		if len(itemImages) > 0 {
			if err := tx.Create(&itemImages).Error; err != nil {
				return err
			}
		}

		return nil
	})
	if err != nil {
		return nil, err
	}

	images := make([]imageInfo, 0, len(itemImages))
	for _, image := range itemImages {
		images = append(images, imageInfo{
			ID:        image.ID,
			ImageURL:  image.ImageURL,
			IsCover:   image.IsCover,
			Sort:      image.Sort,
			CreatedAt: image.CreatedAt,
		})
	}

	return &createItemResponse{
		ID:              item.ID,
		UserID:          item.UserID,
		CategoryID:      item.CategoryID,
		Name:            item.Name,
		Remark:          item.Remark,
		CoverImage:      item.CoverImage,
		LatestLocation:  item.LatestLocation,
		ReminderEnabled: item.ReminderEnabled,
		ReminderDays:    item.ReminderDays,
		LastConfirmedAt: item.LastConfirmedAt,
		NextRemindAt:    item.NextRemindAt,
		LocationRecord: recordInfo{
			ID:        locationRecord.ID,
			Location:  locationRecord.Location,
			PhotoURL:  locationRecord.PhotoURL,
			Note:      locationRecord.Note,
			Type:      locationRecord.Type,
			CreatedAt: locationRecord.CreatedAt,
			Images:    images,
		},
		Images: images,
	}, nil
}

func (h *ItemHandler) updateLocationInTransaction(c *gin.Context, item model.Item, userID uint64, location string, note string, photos []savedPhoto) (*recordInfo, error) {
	now := time.Now()
	var nextRemindAt *time.Time
	if item.ReminderEnabled {
		next := now.AddDate(0, 0, item.ReminderDays)
		nextRemindAt = &next
	}

	photoURL := ""
	if len(photos) > 0 {
		photoURL = photos[0].URL
	}

	locationRecord := model.LocationRecord{
		ItemID:    item.ID,
		UserID:    userID,
		Location:  location,
		PhotoURL:  photoURL,
		Note:      note,
		Type:      "move",
		CreatedAt: now,
	}
	itemImages := make([]model.ItemImage, 0, len(photos))

	err := h.db.WithContext(c.Request.Context()).Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(&locationRecord).Error; err != nil {
			return err
		}

		for i, photo := range photos {
			itemImages = append(itemImages, model.ItemImage{
				ItemID:    item.ID,
				RecordID:  &locationRecord.ID,
				UserID:    userID,
				ImageURL:  photo.URL,
				IsCover:   i == 0,
				Sort:      i + 1,
				CreatedAt: now,
			})
		}
		if len(itemImages) > 0 {
			if err := tx.Create(&itemImages).Error; err != nil {
				return err
			}
		}

		updates := map[string]any{
			"latest_location":   location,
			"last_confirmed_at": now,
			"next_remind_at":    nextRemindAt,
		}
		if len(photos) > 0 {
			updates["cover_image"] = photos[0].URL
		}

		return tx.Model(&model.Item{}).
			Where("id = ? AND user_id = ?", item.ID, userID).
			Updates(updates).Error
	})
	if err != nil {
		return nil, err
	}

	images := toImageInfos(itemImages)
	record := toRecordInfo(locationRecord, images)
	return &record, nil
}

func currentUserID(c *gin.Context) (uint64, bool) {
	value, ok := c.Get(middleware.UserIDKey)
	if !ok {
		return 0, false
	}

	userID, ok := value.(uint64)
	return userID, ok
}

func parseRequiredUint(value string, name string) (uint64, error) {
	parsed, err := strconv.ParseUint(strings.TrimSpace(value), 10, 64)
	if err != nil || parsed == 0 {
		return 0, fmt.Errorf("%s is required", name)
	}

	return parsed, nil
}

func parsePathID(value string) (uint64, error) {
	parsed, err := strconv.ParseUint(strings.TrimSpace(value), 10, 64)
	if err != nil || parsed == 0 {
		return 0, fmt.Errorf("invalid id")
	}

	return parsed, nil
}

func parseOptionalBool(value string, fallback bool) (bool, error) {
	if strings.TrimSpace(value) == "" {
		return fallback, nil
	}

	return strconv.ParseBool(value)
}

func parseOptionalInt(value string, fallback int) (int, error) {
	if strings.TrimSpace(value) == "" {
		return fallback, nil
	}

	return strconv.Atoi(value)
}

func saveUploadedPhotos(c *gin.Context) ([]savedPhoto, error) {
	form, err := c.MultipartForm()
	if err != nil {
		if errors.Is(err, http.ErrNotMultipart) {
			return nil, nil
		}

		return nil, err
	}

	files := form.File["photos"]
	photos := make([]savedPhoto, 0, len(files))
	for _, file := range files {
		photo, err := saveUploadedPhoto(file)
		if err != nil {
			cleanupSavedPhotos(photos)
			return nil, err
		}

		photos = append(photos, photo)
	}

	return photos, nil
}

func saveUploadedPhoto(file *multipart.FileHeader) (savedPhoto, error) {
	if file.Size > maxPhotoSize {
		return savedPhoto{}, fmt.Errorf("photo %s exceeds 5MB", file.Filename)
	}

	src, err := file.Open()
	if err != nil {
		return savedPhoto{}, err
	}
	defer src.Close()

	buffer := make([]byte, 512)
	n, err := src.Read(buffer)
	if err != nil && !errors.Is(err, io.EOF) {
		return savedPhoto{}, err
	}

	contentType := http.DetectContentType(buffer[:n])
	ext, ok := allowedPhotoTypes[contentType]
	if !ok {
		return savedPhoto{}, fmt.Errorf("photo %s must be jpg, jpeg, png or webp", file.Filename)
	}

	if _, err := src.Seek(0, io.SeekStart); err != nil {
		return savedPhoto{}, err
	}

	now := time.Now()
	relativeDir := filepath.Join("uploads", "items", now.Format("2006"), now.Format("01"))
	if err := os.MkdirAll(relativeDir, 0755); err != nil {
		return savedPhoto{}, err
	}

	filename, err := randomFilename(ext)
	if err != nil {
		return savedPhoto{}, err
	}

	relativePath := filepath.Join(relativeDir, filename)
	dst, err := os.Create(relativePath)
	if err != nil {
		return savedPhoto{}, err
	}
	defer dst.Close()

	if _, err := io.Copy(dst, src); err != nil {
		return savedPhoto{}, err
	}

	url := "/" + filepath.ToSlash(relativePath)
	return savedPhoto{
		URL:  url,
		Path: relativePath,
	}, nil
}

func randomFilename(ext string) (string, error) {
	bytes := make([]byte, 16)
	if _, err := rand.Read(bytes); err != nil {
		return "", err
	}

	return fmt.Sprintf("%d_%s%s", time.Now().UnixNano(), hex.EncodeToString(bytes), ext), nil
}

func cleanupSavedPhotos(photos []savedPhoto) {
	for _, photo := range photos {
		_ = os.Remove(photo.Path)
	}
}

func (h *ItemHandler) findOwnedItem(c *gin.Context, userID uint64, itemID uint64) (model.Item, error) {
	var item model.Item
	err := h.db.WithContext(c.Request.Context()).
		Preload("Category").
		Where("id = ? AND user_id = ?", itemID, userID).
		First(&item).Error

	return item, err
}

func (h *ItemHandler) findItemImages(c *gin.Context, itemID uint64) ([]model.ItemImage, error) {
	var images []model.ItemImage
	err := h.db.WithContext(c.Request.Context()).
		Where("item_id = ?", itemID).
		Order("sort ASC, id ASC").
		Find(&images).Error

	return images, err
}

func (h *ItemHandler) findLatestRecord(c *gin.Context, userID uint64, itemID uint64) (*recordInfo, error) {
	var record model.LocationRecord
	err := h.db.WithContext(c.Request.Context()).
		Where("item_id = ? AND user_id = ?", itemID, userID).
		Order("created_at DESC, id DESC").
		First(&record).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}

		return nil, err
	}

	imagesByRecord, err := h.findRecordImages(c, []model.LocationRecord{record})
	if err != nil {
		return nil, err
	}

	latestRecord := toRecordInfo(record, imagesByRecord[record.ID])
	return &latestRecord, nil
}

func (h *ItemHandler) findRecordImages(c *gin.Context, records []model.LocationRecord) (map[uint64][]imageInfo, error) {
	recordImages := make(map[uint64][]imageInfo, len(records))
	if len(records) == 0 {
		return recordImages, nil
	}

	recordIDs := make([]uint64, 0, len(records))
	for _, record := range records {
		recordIDs = append(recordIDs, record.ID)
	}

	var images []model.ItemImage
	if err := h.db.WithContext(c.Request.Context()).
		Where("record_id IN ?", recordIDs).
		Order("record_id ASC, sort ASC, id ASC").
		Find(&images).Error; err != nil {
		return nil, err
	}

	for _, image := range images {
		if image.RecordID == nil {
			continue
		}

		recordImages[*image.RecordID] = append(recordImages[*image.RecordID], toImageInfo(image))
	}

	return recordImages, nil
}

func toItemSummary(item model.Item) itemSummary {
	return itemSummary{
		ID:              item.ID,
		Category:        toCategoryInfo(item.Category),
		Name:            item.Name,
		Remark:          item.Remark,
		CoverImage:      item.CoverImage,
		LatestLocation:  item.LatestLocation,
		ReminderEnabled: item.ReminderEnabled,
		ReminderDays:    item.ReminderDays,
		LastConfirmedAt: item.LastConfirmedAt,
		NextRemindAt:    item.NextRemindAt,
		CreatedAt:       item.CreatedAt,
		UpdatedAt:       item.UpdatedAt,
	}
}

func toItemDetail(item model.Item, images []model.ItemImage, latestRecord *recordInfo) itemDetailResponse {
	return itemDetailResponse{
		ID:              item.ID,
		Category:        toCategoryInfo(item.Category),
		Name:            item.Name,
		Remark:          item.Remark,
		CoverImage:      item.CoverImage,
		LatestLocation:  item.LatestLocation,
		ReminderEnabled: item.ReminderEnabled,
		ReminderDays:    item.ReminderDays,
		LastConfirmedAt: item.LastConfirmedAt,
		NextRemindAt:    item.NextRemindAt,
		CreatedAt:       item.CreatedAt,
		UpdatedAt:       item.UpdatedAt,
		Images:          toImageInfos(images),
		LatestRecord:    latestRecord,
	}
}

func toRecordInfo(record model.LocationRecord, images []imageInfo) recordInfo {
	if images == nil {
		images = []imageInfo{}
	}

	return recordInfo{
		ID:        record.ID,
		Location:  record.Location,
		PhotoURL:  record.PhotoURL,
		Note:      record.Note,
		Type:      record.Type,
		CreatedAt: record.CreatedAt,
		Images:    images,
	}
}

func toCategoryInfo(category model.Category) categoryInfo {
	return categoryInfo{
		ID:          category.ID,
		Name:        category.Name,
		Code:        category.Code,
		Icon:        category.Icon,
		Description: category.Description,
		Sort:        category.Sort,
	}
}

func toImageInfos(images []model.ItemImage) []imageInfo {
	result := make([]imageInfo, 0, len(images))
	for _, image := range images {
		result = append(result, toImageInfo(image))
	}

	return result
}

func toImageInfo(image model.ItemImage) imageInfo {
	return imageInfo{
		ID:        image.ID,
		ImageURL:  image.ImageURL,
		IsCover:   image.IsCover,
		Sort:      image.Sort,
		CreatedAt: image.CreatedAt,
	}
}
