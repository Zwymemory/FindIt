package handler

import (
	"errors"
	"net/http"
	"strings"

	"findit/backend/internal/config"
	"findit/backend/internal/middleware"
	"findit/backend/internal/model"
	jwtutil "findit/backend/pkg/jwt"
	"findit/backend/pkg/response"

	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

type AuthHandler struct {
	db     *gorm.DB
	jwtCfg config.JWTConfig
}

type registerRequest struct {
	Username string `json:"username" binding:"required"`
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required"`
}

type loginRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required"`
}

type userResponse struct {
	ID       uint64 `json:"id"`
	Username string `json:"username"`
	Email    string `json:"email"`
	Avatar   string `json:"avatar"`
}

func NewAuthHandler(db *gorm.DB, jwtCfg config.JWTConfig) *AuthHandler {
	return &AuthHandler{
		db:     db,
		jwtCfg: jwtCfg,
	}
}

func (h *AuthHandler) Register(c *gin.Context) {
	var req registerRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, response.CodeInvalidParams, "invalid request body", http.StatusBadRequest)
		return
	}

	req.Username = strings.TrimSpace(req.Username)
	req.Email = strings.TrimSpace(req.Email)
	if req.Username == "" || req.Email == "" || req.Password == "" {
		response.Error(c, response.CodeInvalidParams, "username, email and password are required", http.StatusBadRequest)
		return
	}

	var count int64
	if err := h.db.Model(&model.User{}).Where("email = ?", req.Email).Count(&count).Error; err != nil {
		response.Error(c, response.CodeInternalError, "failed to check email", http.StatusInternalServerError)
		return
	}
	if count > 0 {
		response.Error(c, response.CodeInvalidParams, "email already exists", http.StatusBadRequest)
		return
	}

	if err := h.db.Model(&model.User{}).Where("username = ?", req.Username).Count(&count).Error; err != nil {
		response.Error(c, response.CodeInternalError, "failed to check username", http.StatusInternalServerError)
		return
	}
	if count > 0 {
		response.Error(c, response.CodeInvalidParams, "username already exists", http.StatusBadRequest)
		return
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		response.Error(c, response.CodeInternalError, "failed to hash password", http.StatusInternalServerError)
		return
	}

	user := model.User{
		Username:     req.Username,
		Email:        req.Email,
		PasswordHash: string(hash),
	}
	if err := h.db.Create(&user).Error; err != nil {
		response.Error(c, response.CodeInternalError, "failed to create user", http.StatusInternalServerError)
		return
	}

	response.Success(c, toUserResponse(user), http.StatusCreated)
}

func (h *AuthHandler) Login(c *gin.Context) {
	var req loginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, response.CodeInvalidParams, "invalid request body", http.StatusBadRequest)
		return
	}

	var user model.User
	if err := h.db.Where("email = ?", strings.TrimSpace(req.Email)).First(&user).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			response.Error(c, response.CodeUnauthorized, "invalid email or password", http.StatusUnauthorized)
			return
		}

		response.Error(c, response.CodeInternalError, "failed to query user", http.StatusInternalServerError)
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)); err != nil {
		response.Error(c, response.CodeUnauthorized, "invalid email or password", http.StatusUnauthorized)
		return
	}

	token, err := jwtutil.GenerateToken(user.ID, h.jwtCfg.Secret, h.jwtCfg.ExpireDuration())
	if err != nil {
		response.Error(c, response.CodeInternalError, "failed to generate token", http.StatusInternalServerError)
		return
	}

	response.Success(c, gin.H{
		"token": token,
		"user":  toUserResponse(user),
	})
}

func (h *AuthHandler) Profile(c *gin.Context) {
	value, ok := c.Get(middleware.UserIDKey)
	if !ok {
		response.Error(c, response.CodeUnauthorized, "unauthorized", http.StatusUnauthorized)
		return
	}

	userID, ok := value.(uint64)
	if !ok {
		response.Error(c, response.CodeUnauthorized, "invalid token user", http.StatusUnauthorized)
		return
	}

	var user model.User
	if err := h.db.First(&user, userID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			response.Error(c, response.CodeUnauthorized, "user not found", http.StatusUnauthorized)
			return
		}

		response.Error(c, response.CodeInternalError, "failed to query user", http.StatusInternalServerError)
		return
	}

	response.Success(c, toUserResponse(user))
}

func toUserResponse(user model.User) userResponse {
	return userResponse{
		ID:       user.ID,
		Username: user.Username,
		Email:    user.Email,
		Avatar:   user.Avatar,
	}
}
