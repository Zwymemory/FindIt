package router

import (
	"time"

	"findit/backend/internal/config"
	"findit/backend/internal/handler"
	"findit/backend/internal/middleware"
	"findit/backend/pkg/response"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/redis/go-redis/v9"
	"gorm.io/gorm"
)

type Dependencies struct {
	Config *config.Config
	MySQL  *gorm.DB
	Redis  *redis.Client
}

func New(deps Dependencies) *gin.Engine {
	gin.SetMode(deps.Config.Server.Mode)

	r := gin.New()
	r.MaxMultipartMemory = 8 << 20
	r.Use(gin.Logger())
	r.Use(middleware.Recovery())
	r.Use(cors.New(cors.Config{
		AllowOrigins:     deps.Config.CORS.AllowOrigins,
		AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	}))

	api := r.Group("/api")
	{
		api.GET("/ping", handler.Ping)

		authHandler := handler.NewAuthHandler(deps.MySQL, deps.Config.JWT)
		auth := api.Group("/auth")
		{
			auth.POST("/register", authHandler.Register)
			auth.POST("/login", authHandler.Login)
			auth.GET("/profile", middleware.Auth(deps.Config.JWT.Secret), authHandler.Profile)
		}

		categoryHandler := handler.NewCategoryHandler(deps.MySQL)
		api.GET("/categories", categoryHandler.List)

		itemHandler := handler.NewItemHandler(deps.MySQL)
		api.GET("/items", middleware.Auth(deps.Config.JWT.Secret), itemHandler.List)
		api.POST("/items", middleware.Auth(deps.Config.JWT.Secret), itemHandler.Create)
		api.GET("/items/:id", middleware.Auth(deps.Config.JWT.Secret), itemHandler.Detail)
		api.GET("/items/:id/history", middleware.Auth(deps.Config.JWT.Secret), itemHandler.History)
		api.POST("/items/:id/location", middleware.Auth(deps.Config.JWT.Secret), itemHandler.UpdateLocation)
		api.POST("/items/:id/confirm", middleware.Auth(deps.Config.JWT.Secret), itemHandler.Confirm)
		api.GET("/reminders", middleware.Auth(deps.Config.JWT.Secret), itemHandler.Reminders)
	}

	r.Static("/uploads", "./uploads")

	r.NoRoute(func(c *gin.Context) {
		response.Error(c, response.CodeNotFound, "route not found", 404)
	})

	return r
}
