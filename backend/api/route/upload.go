package route

import (
	"net/http"
	"time"

	"tindahan-backend/api/handlers/middleware"
	"tindahan-backend/bootstrap"
	"tindahan-backend/domain"
	"tindahan-backend/internal/imageutil"
	"tindahan-backend/repository"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

// UploadHandler handles image uploads for users
type UploadHandler struct {
	env      *bootstrap.Env
	userRepo repository.UserRepository
	uploader *imageutil.ImageUploader
}

// NewUploadHandler creates a new upload handler
func NewUploadHandler(env *bootstrap.Env, userRepo repository.UserRepository) *UploadHandler {
	var uploader *imageutil.ImageUploader
	if env.CloudinaryCloudName != "" && env.CloudinaryAPIKey != "" && env.CloudinaryAPISecret != "" {
		uploader, _ = imageutil.NewImageUploader(
			env.CloudinaryCloudName,
			env.CloudinaryAPIKey,
			env.CloudinaryAPISecret,
			env.CloudinaryFolder,
		)
	}
	return &UploadHandler{
		env:      env,
		userRepo: userRepo,
		uploader: uploader,
	}
}

// UploadProfilePhoto handles profile photo uploads
func (h *UploadHandler) UploadProfilePhoto(c *gin.Context) {
	userID := middleware.GetUserID(c.Request.Context())
	if userID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"error":   "Authentication required",
		})
		return
	}

	if h.uploader == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{
			"success": false,
			"error":   "Image upload service not configured",
		})
		return
	}

	file, header, err := c.Request.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "No file provided",
		})
		return
	}
	defer file.Close()

	folder := h.env.CloudinaryFolder + "/" + userID + "/profile"
	userUploader := h.uploader.WithFolder(folder)

	result, err := userUploader.UploadImage(c.Request.Context(), file, header.Filename)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Upload failed: " + err.Error(),
		})
		return
	}

	userObjectID, err := primitive.ObjectIDFromHex(userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Invalid user ID",
		})
		return
	}

	err = h.userRepo.UpdateUserPhotos(c.Request.Context(), userObjectID, &result.URL, nil)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to update user: " + err.Error(),
		})
		return
	}

	user, err := h.userRepo.GetUserByID(c.Request.Context(), userObjectID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to fetch updated user: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"url":     result.URL,
		"message": "Profile photo uploaded successfully",
		"user":    userToMap(user),
	})
}

// UploadCoverPhoto handles cover photo uploads
func (h *UploadHandler) UploadCoverPhoto(c *gin.Context) {
	userID := middleware.GetUserID(c.Request.Context())
	if userID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"error":   "Authentication required",
		})
		return
	}

	if h.uploader == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{
			"success": false,
			"error":   "Image upload service not configured",
		})
		return
	}

	file, header, err := c.Request.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "No file provided",
		})
		return
	}
	defer file.Close()

	folder := h.env.CloudinaryFolder + "/" + userID + "/cover"
	userUploader := h.uploader.WithFolder(folder)

	result, err := userUploader.UploadImage(c.Request.Context(), file, header.Filename)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Upload failed: " + err.Error(),
		})
		return
	}

	userObjectID, err := primitive.ObjectIDFromHex(userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Invalid user ID",
		})
		return
	}

	err = h.userRepo.UpdateUserPhotos(c.Request.Context(), userObjectID, nil, &result.URL)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to update user: " + err.Error(),
		})
		return
	}

	user, err := h.userRepo.GetUserByID(c.Request.Context(), userObjectID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to fetch updated user: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"url":     result.URL,
		"message": "Cover photo uploaded successfully",
		"user":    userToMap(user),
	})
}

// userToMap converts a domain.User to a map matching the me API response format
func userToMap(user *domain.User) map[string]interface{} {
	return map[string]interface{}{
		"id":           user.ID.Hex(),
		"firstName":    user.FirstName,
		"lastName":     user.LastName,
		"name":         user.FirstName + " " + user.LastName,
		"email":        user.Email,
		"phone":        user.Phone,
		"birthday":     user.Birthday,
		"role":         user.Role,
		"profilePhoto": user.ProfilePhoto,
		"coverPhoto":   user.CoverPhoto,
		"isActive":     user.IsActive,
		"createdAt":    user.CreatedAt.Format(time.RFC3339),
		"updatedAt":    user.UpdatedAt.Format(time.RFC3339),
	}
}

// UploadReviewPhoto handles review photo uploads
func (h *UploadHandler) UploadReviewPhoto(c *gin.Context) {
	userID := middleware.GetUserID(c.Request.Context())
	if userID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"error":   "Authentication required",
		})
		return
	}

	if h.uploader == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{
			"success": false,
			"error":   "Image upload service not configured",
		})
		return
	}

	file, header, err := c.Request.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "No file provided",
		})
		return
	}
	defer file.Close()

	folder := h.env.CloudinaryFolder + "/" + userID + "/reviews"
	userUploader := h.uploader.WithFolder(folder)

	result, err := userUploader.UploadImage(c.Request.Context(), file, header.Filename)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Upload failed: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"url":     result.URL,
		"message": "Review photo uploaded successfully",
	})
}

// SetupUploadRoutes registers the upload routes
func SetupUploadRoutes(router *gin.Engine, env *bootstrap.Env, userRepo repository.UserRepository) {
	handler := NewUploadHandler(env, userRepo)

	// Require authentication for upload endpoints
	authMiddleware := middleware.AuthMiddleware(env.JWTSecret)
	requireAuth := middleware.RequireAuth()

	api := router.Group("/api")
	api.Use(authMiddleware, requireAuth)
	{
		api.POST("/upload/profile-photo", handler.UploadProfilePhoto)
		api.POST("/upload/cover-photo", handler.UploadCoverPhoto)
		api.POST("/upload/review-photo", handler.UploadReviewPhoto)
	}
}
