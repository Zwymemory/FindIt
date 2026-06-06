package handler

import (
	"net/http"

	"findit/backend/pkg/response"

	"github.com/gin-gonic/gin"
)

func Ping(c *gin.Context) {
	response.Success(c, gin.H{
		"message": "pong",
		"status":  "ok",
	}, http.StatusOK)
}
