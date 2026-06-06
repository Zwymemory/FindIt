package jwt

import (
	"errors"
	"time"

	gjwt "github.com/golang-jwt/jwt/v5"
)

type Claims struct {
	UserID uint64 `json:"user_id"`
	gjwt.RegisteredClaims
}

func GenerateToken(userID uint64, secret string, expiresIn time.Duration) (string, error) {
	if secret == "" {
		return "", errors.New("jwt secret is empty")
	}

	now := time.Now()
	claims := Claims{
		UserID: userID,
		RegisteredClaims: gjwt.RegisteredClaims{
			ExpiresAt: gjwt.NewNumericDate(now.Add(expiresIn)),
			IssuedAt:  gjwt.NewNumericDate(now),
		},
	}

	token := gjwt.NewWithClaims(gjwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(secret))
}

func ParseToken(tokenString string, secret string) (*Claims, error) {
	if secret == "" {
		return nil, errors.New("jwt secret is empty")
	}

	token, err := gjwt.ParseWithClaims(tokenString, &Claims{}, func(token *gjwt.Token) (any, error) {
		if _, ok := token.Method.(*gjwt.SigningMethodHMAC); !ok {
			return nil, errors.New("unexpected signing method")
		}

		return []byte(secret), nil
	})
	if err != nil {
		return nil, err
	}

	claims, ok := token.Claims.(*Claims)
	if !ok || !token.Valid {
		return nil, errors.New("invalid token")
	}

	return claims, nil
}
