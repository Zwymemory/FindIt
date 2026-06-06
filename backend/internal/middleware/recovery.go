package middleware

import (
	"log"
	"net/http"

	"findit/backend/pkg/response"

	"github.com/gin-gonic/gin"
)

func Recovery() gin.HandlerFunc {
	return gin.CustomRecovery(func(c *gin.Context, recovered any) {
		log.Printf("panic recovered: %v", recovered)
		response.Error(c, response.CodeInternalError, "internal server error", http.StatusInternalServerError)
	})
}
