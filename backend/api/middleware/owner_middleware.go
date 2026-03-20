package middleware

import (
	"net/http"
	"strconv"

	"tindahan-backend/bootstrap"
	"tindahan-backend/repository"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

// OwnerMiddleware validates if user owns the resource
// For now, it allows everyone (as requested), but can be easily enabled
func OwnerMiddleware(app *bootstrap.Application) gin.HandlerFunc {
	return func(c *gin.Context) {
		// TODO: Enable ownership validation when ready
		// For now, allow everyone to access
		
		// Future implementation:
		/*
		userIDStr, exists := c.Get("user_id")
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{
				"success": false,
				"error":   "UNAUTHORIZED",
				"message": "User not authenticated",
			})
			c.Abort()
			return
		}

		userID, err := primitive.ObjectIDFromHex(userIDStr.(string))
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"success": false,
				"error":   "INVALID_USER_ID",
				"message": "Invalid user ID",
			})
			c.Abort()
			return
		}

		// Get resource ID from URL parameter
		resourceID := c.Param("id")
		if resourceID == "" {
			c.JSON(http.StatusBadRequest, gin.H{
				"success": false,
				"error":   "INVALID_RESOURCE_ID",
				"message": "Resource ID is required",
			})
			c.Abort()
			return
		}

		// Parse resource ID
		resourceObjID, err := primitive.ObjectIDFromHex(resourceID)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"success": false,
				"error":   "INVALID_RESOURCE_ID",
				"message": "Invalid resource ID format",
			})
			c.Abort()
			return
		}

		// Check ownership based on resource type
		resourceType := c.Param("type") // Could be "store" or "product"
		switch resourceType {
		case "store":
			storeRepo := repository.NewStoreRepository(app.MongoDatabase)
			store, err := storeRepo.GetStoreByID(resourceObjID)
			if err != nil {
				c.JSON(http.StatusNotFound, gin.H{
					"success": false,
					"error":   "RESOURCE_NOT_FOUND",
					"message": "Store not found",
				})
				c.Abort()
				return
			}
			
			if store.OwnerID != userID {
				c.JSON(http.StatusForbidden, gin.H{
					"success": false,
					"error":   "FORBIDDEN",
					"message": "You don't own this store",
				})
				c.Abort()
				return
			}

		case "product":
			productRepo := repository.NewProductRepository(app.MongoDatabase)
			product, err := productRepo.GetProductByID(resourceObjID)
			if err != nil {
				c.JSON(http.StatusNotFound, gin.H{
					"success": false,
					"error":   "RESOURCE_NOT_FOUND",
					"message": "Product not found",
				})
				c.Abort()
				return
			}
			
			// Get store to check ownership
			storeRepo := repository.NewStoreRepository(app.MongoDatabase)
			store, err := storeRepo.GetStoreByID(product.StoreID)
			if err != nil {
				c.JSON(http.StatusNotFound, gin.H{
					"success": false,
					"error":   "RESOURCE_NOT_FOUND",
					"message": "Store not found",
				})
				c.Abort()
				return
			}
			
			if store.OwnerID != userID {
				c.JSON(http.StatusForbidden, gin.H{
					"success": false,
					"error":   "FORBIDDEN",
					"message": "You don't own this product",
				})
				c.Abort()
				return
			}

		default:
			c.JSON(http.StatusBadRequest, gin.H{
				"success": false,
				"error":   "INVALID_RESOURCE_TYPE",
				"message": "Invalid resource type",
			})
			c.Abort()
			return
		}
		*/

		// For now, allow everyone
		c.Next()
	}
}

// StoreOwnerMiddleware validates if user owns the store
func StoreOwnerMiddleware(app *bootstrap.Application) gin.HandlerFunc {
	return func(c *gin.Context) {
		// TODO: Enable store ownership validation when ready
		// For now, allow everyone to access
		
		c.Next()
	}
}

// ProductOwnerMiddleware validates if user owns the product (via store ownership)
func ProductOwnerMiddleware(app *bootstrap.Application) gin.HandlerFunc {
	return func(c *gin.Context) {
		// TODO: Enable product ownership validation when ready
		// For now, allow everyone to access
		
		c.Next()
	}
}
