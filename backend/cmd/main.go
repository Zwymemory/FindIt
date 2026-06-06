package main

import (
	"context"
	"errors"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"findit/backend/internal/config"
	"findit/backend/internal/database"
	"findit/backend/internal/router"
)

func main() {
	cfg, err := config.Load("config.yaml")
	if err != nil {
		log.Fatalf("load config: %v", err)
	}

	mysqlDB, err := database.NewMySQL(cfg.MySQL)
	if err != nil {
		log.Fatalf("connect mysql: %v", err)
	}

	if err := database.AutoMigrate(mysqlDB); err != nil {
		log.Fatalf("auto migrate database: %v", err)
	}

	if err := database.SeedCategories(mysqlDB); err != nil {
		log.Fatalf("seed categories: %v", err)
	}

	redisClient, err := database.NewRedis(cfg.Redis)
	if err != nil {
		log.Fatalf("connect redis: %v", err)
	}

	engine := router.New(router.Dependencies{
		Config: cfg,
		MySQL:  mysqlDB,
		Redis:  redisClient,
	})

	server := &http.Server{
		Addr:              cfg.Server.Address(),
		Handler:           engine,
		ReadHeaderTimeout: 5 * time.Second,
	}

	go func() {
		log.Printf("FindIt backend listening on %s", cfg.Server.Address())
		if err := server.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			log.Fatalf("start server: %v", err)
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := database.CloseMySQL(mysqlDB); err != nil {
		log.Printf("close mysql: %v", err)
	}

	if err := redisClient.Close(); err != nil {
		log.Printf("close redis: %v", err)
	}

	if err := server.Shutdown(ctx); err != nil {
		log.Fatalf("shutdown server: %v", err)
	}

	fmt.Println("FindIt backend stopped")
}
