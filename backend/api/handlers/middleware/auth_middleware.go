package middleware

import (
	"context"
	"log"
	"net/http"
	"strings"
	"tindahan-backend/internal/tokenutil"

	"github.com/gin-gonic/gin"
)

// Context keys
type contextKey string

const UserIDKey contextKey = "userID"
const UserEmailKey contextKey = "userEmail"
const UserRoleKey contextKey = "userRole"

// AuthMiddleware validates JWT token and extracts user info
func AuthMiddleware(jwtSecret string) gin.HandlerFunc {
	return func(c *gin.Context) {
		log.Printf("[AUTH] Request to %s %s", c.Request.Method, c.Request.URL.Path)

		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			log.Println("[AUTH] No Authorization header found")
			c.Next()
			return
		}
		log.Println("[AUTH] Authorization header found")

		// Extract token from "Bearer <token>"
		parts := strings.SplitN(authHeader, " ", 2)
		if len(parts) != 2 || strings.ToLower(parts[0]) != "bearer" {
			log.Printf("[AUTH] ERROR: Invalid authorization header format: %s", authHeader[:min(len(authHeader), 20)])
			c.JSON(http.StatusUnauthorized, gin.H{
				"errors": []gin.H{
					{
						"message": "Invalid authorization header format",
						"extensions": gin.H{
							"code": "UNAUTHENTICATED",
						},
					},
				},
			})
			c.Abort()
			return
		}

		tokenString := parts[1]
		log.Printf("[AUTH] Token extracted, validating... (token length: %d)", len(tokenString))
		claims, err := tokenutil.ValidateToken(tokenString, jwtSecret)
		if err != nil {
			log.Printf("[AUTH] ERROR: Token validation failed: %v", err)
			errorMsg := "Invalid or expired token"
			if err.Error() == "token has expired" {
				errorMsg = "JWT expired"
			}
			c.JSON(http.StatusUnauthorized, gin.H{
				"errors": []gin.H{
					{
						"message": errorMsg,
						"extensions": gin.H{
							"code": "UNAUTHENTICATED",
						},
					},
				},
			})
			c.Abort()
			return
		}
		log.Printf("[AUTH] Token validated successfully for userID=%s, email=%s", claims.UserID, claims.Email)

		// Add user info to context
		ctx := context.WithValue(c.Request.Context(), UserIDKey, claims.UserID)
		ctx = context.WithValue(ctx, UserEmailKey, claims.Email)
		ctx = context.WithValue(ctx, UserRoleKey, claims.Role)
		c.Request = c.Request.WithContext(ctx)
		log.Println("[AUTH] User info added to context")

		c.Next()
	}
}

// RequireAuth ensures user is authenticated
func RequireAuth() gin.HandlerFunc {
	return func(c *gin.Context) {
		userID := c.Request.Context().Value(UserIDKey)
		if userID == nil {
			log.Printf("[AUTH] ERROR: Authentication required for %s %s", c.Request.Method, c.Request.URL.Path)
			c.JSON(http.StatusUnauthorized, gin.H{
				"error": "Authentication required",
			})
			c.Abort()
			return
		}
		log.Printf("[AUTH] Access granted to userID=%s for %s %s", userID, c.Request.Method, c.Request.URL.Path)
		c.Next()
	}
}

// min returns the minimum of two integers
func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}

// GetUserID extracts user ID from context
func GetUserID(ctx context.Context) string {
	if userID, ok := ctx.Value(UserIDKey).(string); ok {
		return userID
	}
	return ""
}

// GetUserEmail extracts user email from context
func GetUserEmail(ctx context.Context) string {
	if email, ok := ctx.Value(UserEmailKey).(string); ok {
		return email
	}
	return ""
}

// GetUserRole extracts user role from context
func GetUserRole(ctx context.Context) string {
	if role, ok := ctx.Value(UserRoleKey).(string); ok {
		return role
	}
	return ""
}
