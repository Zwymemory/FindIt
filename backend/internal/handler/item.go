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

type recordInfo struct {
	ID       uint64 `json:"id"`
	Location string `json:"location"`
	PhotoURL string `json:"photo_url"`
	Note     string `json:"note"`
	Type     string `json:"type"`
}

type imageInfo struct {
	ID       uint64 `json:"id"`
	ImageURL string `json:"image_url"`
	IsCover  bool   `json:"is_cover"`
	Sort     int    `json:"sort"`
}

func NewItemHandler(db *gorm.DB) *ItemHandler {
	return &ItemHandler{db: db}
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
			ID:       image.ID,
			ImageURL: image.ImageURL,
			IsCover:  image.IsCover,
			Sort:     image.Sort,
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
			ID:       locationRecord.ID,
			Location: locationRecord.Location,
			PhotoURL: locationRecord.PhotoURL,
			Note:     locationRecord.Note,
			Type:     locationRecord.Type,
		},
		Images: images,
	}, nil
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
