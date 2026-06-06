package handler

import (
	"net/http"

	"findit/backend/internal/model"
	"findit/backend/pkg/response"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type CategoryHandler struct {
	db *gorm.DB
}

func NewCategoryHandler(db *gorm.DB) *CategoryHandler {
	return &CategoryHandler{db: db}
}

func (h *CategoryHandler) List(c *gin.Context) {
	var categories []model.Category
	if err := h.db.Order("sort ASC").Find(&categories).Error; err != nil {
		response.Error(c, response.CodeInternalError, "failed to query categories", http.StatusInternalServerError)
		return
	}

	response.Success(c, categories)
}
