package middleware

import (
	"net/http"
	"strings"

	"tindahan-backend/bootstrap"
	"tindahan-backend/internal/tokenutil"

	"github.com/gin-gonic/gin"
)

func JWTAuthMiddleware(app *bootstrap.Application) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Get token from header
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.JSON(http.StatusUnauthorized, gin.H{
				"success": false,
				"error":   "UNAUTHORIZED",
				"message": "Authorization header is required",
			})
			c.Abort()
			return
		}

		// Check if token has Bearer prefix
		tokenString := strings.Replace(authHeader, "Bearer ", "", 1)
		if tokenString == authHeader {
			c.JSON(http.StatusUnauthorized, gin.H{
				"success": false,
				"error":   "UNAUTHORIZED",
				"message": "Invalid token format. Use 'Bearer <token>'",
			})
			c.Abort()
			return
		}

		// Validate token
		claims, err := tokenutil.ValidateToken(tokenString, app.Env.JWTSecret)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{
				"success": false,
				"error":   "UNAUTHORIZED",
				"message": "Invalid or expired token",
			})
			c.Abort()
			return
		}

		// Set user context
		c.Set("user_id", claims.UserID)
		c.Set("email", claims.Email)
		c.Set("role", claims.Role)

		c.Next()
	}
}

func RequireRole(roles ...string) gin.HandlerFunc {
	return func(c *gin.Context) {
		userRole, exists := c.Get("role")
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{
				"success": false,
				"error":   "UNAUTHORIZED",
				"message": "User role not found",
			})
			c.Abort()
			return
		}

		// Check if user role is in allowed roles
		allowed := false
		for _, role := range roles {
			if userRole == role {
				allowed = true
				break
			}
		}

		if !allowed {
			c.JSON(http.StatusForbidden, gin.H{
				"success": false,
				"error":   "FORBIDDEN",
				"message": "Insufficient permissions",
			})
			c.Abort()
			return
		}

		c.Next()
	}
}
