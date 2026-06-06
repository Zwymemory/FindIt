package middleware

import (
	"net/http"
	"strings"

	jwtutil "findit/backend/pkg/jwt"
	"findit/backend/pkg/response"

	"github.com/gin-gonic/gin"
)

const UserIDKey = "user_id"

func Auth(secret string) gin.HandlerFunc {
	return func(c *gin.Context) {
		header := c.GetHeader("Authorization")
		if header == "" {
			response.Error(c, response.CodeUnauthorized, "authorization header is required", http.StatusUnauthorized)
			return
		}

		parts := strings.Fields(header)
		if len(parts) != 2 || !strings.EqualFold(parts[0], "Bearer") {
			response.Error(c, response.CodeUnauthorized, "invalid authorization header", http.StatusUnauthorized)
			return
		}

		claims, err := jwtutil.ParseToken(parts[1], secret)
		if err != nil {
			response.Error(c, response.CodeUnauthorized, "invalid token", http.StatusUnauthorized)
			return
		}

		c.Set(UserIDKey, claims.UserID)
		c.Next()
	}
}
