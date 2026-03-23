package middleware

import (
	"tindahan-backend/bootstrap"
	"github.com/gin-gonic/gin"
)

// StoreOwnerMiddleware validates if user owns the store
func StoreOwnerMiddleware(app *bootstrap.Application) gin.HandlerFunc {
	return func(c *gin.Context) {
		// TODO: Implement actual ownership validation
		// For now, allow all users (placeholder)
		c.Next()
	}
}

// ProductOwnerMiddleware validates if user owns the product
func ProductOwnerMiddleware(app *bootstrap.Application) gin.HandlerFunc {
	return func(c *gin.Context) {
		// TODO: Implement actual ownership validation
		// For now, allow all users (placeholder)
		c.Next()
	}
}
