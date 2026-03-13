package main

import (
	"log"
	"tindahan-backend/api/route"
	"tindahan-backend/bootstrap"

	"github.com/gin-gonic/gin"
)

func main() {
	// Load environment variables and database
	app := bootstrap.App()

	// Initialize Gin router
	gin.SetMode(gin.ReleaseMode)
	router := gin.New()

	// Add middleware
	router.Use(gin.Logger())
	router.Use(gin.Recovery())

	// Setup routes
	route.Setup(router, app)

	// Start server
	log.Println("Server starting on port :8080")
	if err := router.Run(":8080"); err != nil {
		log.Fatal("Failed to start server:", err)
	}
}
