package auth

import (
	"context"
)

type AuthResolver struct{}

func NewAuthResolver() *AuthResolver {
	return &AuthResolver{}
}

// Login resolves the login mutation
func (r *AuthResolver) Login(ctx context.Context, email, password string) (map[string]interface{}, error) {
	return map[string]interface{}{
		"success": true,
		"message": "Login successful",
		"data": map[string]interface{}{
			"user": map[string]interface{}{
				"id":       "test-user-id",
				"name":     "Test User",
				"email":    email,
				"role":     "CUSTOMER",
				"isActive": true,
			},
			"accessToken":  "test-access-token",
			"refreshToken": "test-refresh-token",
		},
	}, nil
}

// Signup resolves the signup mutation
func (r *AuthResolver) Signup(ctx context.Context, name, email, password, role string) (map[string]interface{}, error) {
	return map[string]interface{}{
		"success": true,
		"message": "Signup successful",
		"data": map[string]interface{}{
			"user": map[string]interface{}{
				"id":       "new-user-id",
				"name":     name,
				"email":    email,
				"role":     role,
				"isActive": true,
			},
			"accessToken":  "new-access-token",
			"refreshToken": "new-refresh-token",
		},
	}, nil
}

// RefreshToken resolves the refreshToken mutation
func (r *AuthResolver) RefreshToken(ctx context.Context, refreshToken string) (map[string]interface{}, error) {
	return map[string]interface{}{
		"success": true,
		"message": "Token refreshed successfully",
		"data": map[string]interface{}{
			"accessToken":  "refreshed-access-token",
			"refreshToken": "refreshed-refresh-token",
		},
	}, nil
}
