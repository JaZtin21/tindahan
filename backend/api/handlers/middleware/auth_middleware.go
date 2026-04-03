package middleware

import (
	"context"
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
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.Next()
			return
		}

		// Extract token from "Bearer <token>"
		parts := strings.SplitN(authHeader, " ", 2)
		if len(parts) != 2 || strings.ToLower(parts[0]) != "bearer" {
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
		claims, err := tokenutil.ValidateToken(tokenString, jwtSecret)
		if err != nil {
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

		// Add user info to context
		ctx := context.WithValue(c.Request.Context(), UserIDKey, claims.UserID)
		ctx = context.WithValue(ctx, UserEmailKey, claims.Email)
		ctx = context.WithValue(ctx, UserRoleKey, claims.Role)
		c.Request = c.Request.WithContext(ctx)

		c.Next()
	}
}

// RequireAuth ensures user is authenticated
func RequireAuth() gin.HandlerFunc {
	return func(c *gin.Context) {
		userID := c.Request.Context().Value(UserIDKey)
		if userID == nil {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error": "Authentication required",
			})
			c.Abort()
			return
		}
		c.Next()
	}
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
