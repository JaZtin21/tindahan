package auth

import (
	"context"
	"encoding/json"
	"errors"
	"log"
	"net/http"
	"strings"
	"time"

	"tindahan-backend/domain"
	"tindahan-backend/internal/tokenutil"
	"tindahan-backend/repository"

	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"golang.org/x/crypto/bcrypt"
)

type AuthResolver struct {
	userRepo  repository.UserRepository
	jwtSecret string
}

func NewAuthResolver(db *mongo.Database, jwtSecret string) *AuthResolver {
	return &AuthResolver{
		userRepo:  repository.NewUserRepository(db),
		jwtSecret: jwtSecret,
	}
}

// hashPassword hashes a password using bcrypt
func hashPassword(password string) (string, error) {
	bytes, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	return string(bytes), err
}

// checkPasswordHash compares a password with a hash
func checkPasswordHash(password, hash string) bool {
	err := bcrypt.CompareHashAndPassword([]byte(hash), []byte(password))
	return err == nil
}

// Login resolves the login mutation (real DB implementation with bcrypt)
func (r *AuthResolver) Login(ctx context.Context, email, password string) (map[string]interface{}, error) {
	// Find user by email
	user, err := r.userRepo.GetUserByEmail(ctx, email)
	if err != nil {
		return map[string]interface{}{
			"success": false,
			"message": "Invalid email or password",
		}, err
	}

	// Check password with bcrypt
	if !checkPasswordHash(password, user.Password) {
		return map[string]interface{}{
			"success": false,
			"message": "Invalid email or password",
		}, nil
	}

	// Generate real JWT tokens
	accessToken, err := tokenutil.GenerateAccessToken(user.ID.Hex(), user.Email, user.Role, r.jwtSecret)
	if err != nil {
		return map[string]interface{}{
			"success": false,
			"message": "Failed to generate access token",
		}, err
	}

	refreshToken, err := tokenutil.GenerateRefreshToken(user.ID.Hex(), user.Email, user.Role, r.jwtSecret)
	if err != nil {
		return map[string]interface{}{
			"success": false,
			"message": "Failed to generate refresh token",
		}, err
	}

	return map[string]interface{}{
		"success": true,
		"message": "Login successful",
		"data": map[string]interface{}{
			"user": map[string]interface{}{
				"id":           user.ID.Hex(),
				"name":         user.FirstName + " " + user.LastName,
				"email":        user.Email,
				"firstName":    user.FirstName,
				"lastName":     user.LastName,
				"role":         user.Role,
				"profilePhoto": user.ProfilePhoto,
				"coverPhoto":   user.CoverPhoto,
				"isActive":     user.IsActive,
				"createdAt":    user.CreatedAt.Format(time.RFC3339),
				"updatedAt":    user.UpdatedAt.Format(time.RFC3339),
			},
			"accessToken":  accessToken,
			"refreshToken": refreshToken,
		},
	}, nil
}

// Signup resolves the signup mutation (real DB implementation with bcrypt)
func (r *AuthResolver) Signup(ctx context.Context, firstName, lastName, email, password, role string) (map[string]interface{}, error) {
	log.Printf("🔍 SIGNUP START: firstName=%s, lastName=%s, email=%s, role=%s", firstName, lastName, email, role)

	// Check if user already exists
	existingUser, err := r.userRepo.GetUserByEmail(ctx, email)
	if err != nil {
		log.Printf("❌ SIGNUP ERROR checking existing user: %v", err)
	} else if existingUser != nil {
		log.Printf("⚠️ SIGNUP: User already exists with email %s", email)
		return map[string]interface{}{
			"success": false,
			"message": "User with this email already exists",
		}, nil
	}

	// Hash password with bcrypt
	hashedPassword, err := hashPassword(password)
	if err != nil {
		log.Printf("❌ SIGNUP ERROR hashing password: %v", err)
		return map[string]interface{}{
			"success": false,
			"message": "Failed to hash password",
		}, err
	}

	// Create new user
	now := time.Now()
	user := &domain.User{
		ID:        primitive.NewObjectID(),
		FirstName: firstName,
		LastName:  lastName,
		Email:     email,
		Password:  hashedPassword,
		Role:      role,
		IsActive:  true,
		CreatedAt: now,
		UpdatedAt: now,
	}

	log.Printf("✅ SIGNUP: Created user object - ID=%s, CreatedAt=%v", user.ID.Hex(), user.CreatedAt)

	// Save to database
	if err := r.userRepo.CreateUser(ctx, user); err != nil {
		log.Printf("❌ SIGNUP ERROR creating user in DB: %v", err)
		return map[string]interface{}{
			"success": false,
			"message": "Failed to create user: " + err.Error(),
		}, err
	}

	log.Printf("✅ SIGNUP: User saved to database successfully")

	// Generate real JWT tokens
	accessToken, err := tokenutil.GenerateAccessToken(user.ID.Hex(), user.Email, user.Role, r.jwtSecret)
	if err != nil {
		log.Printf("❌ SIGNUP ERROR generating access token: %v", err)
		return map[string]interface{}{
			"success": false,
			"message": "Failed to generate access token",
		}, err
	}

	refreshToken, err := tokenutil.GenerateRefreshToken(user.ID.Hex(), user.Email, user.Role, r.jwtSecret)
	if err != nil {
		log.Printf("❌ SIGNUP ERROR generating refresh token: %v", err)
		return map[string]interface{}{
			"success": false,
			"message": "Failed to generate refresh token",
		}, err
	}

	// Prepare response data with proper structure
	responseData := map[string]interface{}{
		"user": map[string]interface{}{
			"id":           user.ID.Hex(),
			"name":         user.FirstName + " " + user.LastName,
			"email":        user.Email,
			"firstName":    user.FirstName,
			"lastName":     user.LastName,
			"role":         user.Role,
			"profilePhoto": user.ProfilePhoto,
			"coverPhoto":   user.CoverPhoto,
			"isActive":     user.IsActive,
			"createdAt":    user.CreatedAt.Format(time.RFC3339),
			"updatedAt":    user.UpdatedAt.Format(time.RFC3339),
		},
		"accessToken":  accessToken,
		"refreshToken": refreshToken,
	}

	log.Printf("✅ SIGNUP SUCCESS: Response data prepared - user createdAt=%v", responseData["user"].(map[string]interface{})["createdAt"])

	return map[string]interface{}{
		"success": true,
		"message": "Signup successful",
		"data":    responseData,
	}, nil
}

// RefreshToken resolves the refreshToken mutation
func (r *AuthResolver) RefreshToken(ctx context.Context, refreshToken string) (map[string]interface{}, error) {
	log.Printf("🔍 REFRESH TOKEN: Starting token refresh")

	// Verify the refresh token and extract user info
	claims, err := tokenutil.ValidateToken(refreshToken, r.jwtSecret)
	if err != nil {
		log.Printf("❌ REFRESH TOKEN: Invalid refresh token: %v", err)
		return map[string]interface{}{
			"success": false,
			"message": "Invalid refresh token",
		}, nil
	}

	userID := claims.UserID
	email := claims.Email
	role := claims.Role

	log.Printf("✅ REFRESH TOKEN: Token verified for user %s", email)

	// Generate new access token
	newAccessToken, err := tokenutil.GenerateAccessToken(userID, email, role, r.jwtSecret)
	if err != nil {
		log.Printf("❌ REFRESH TOKEN: Failed to generate access token: %v", err)
		return map[string]interface{}{
			"success": false,
			"message": "Failed to generate access token",
		}, err
	}

	// Generate new refresh token (token rotation for security)
	newRefreshToken, err := tokenutil.GenerateRefreshToken(userID, email, role, r.jwtSecret)
	if err != nil {
		log.Printf("❌ REFRESH TOKEN: Failed to generate refresh token: %v", err)
		return map[string]interface{}{
			"success": false,
			"message": "Failed to generate refresh token",
		}, err
	}

	log.Printf("✅ REFRESH TOKEN: New tokens generated successfully")

	return map[string]interface{}{
		"success": true,
		"message": "Token refreshed successfully",
		"data": map[string]interface{}{
			"accessToken":  newAccessToken,
			"refreshToken": newRefreshToken,
		},
	}, nil
}

// GoogleLogin resolves the googleLogin mutation by verifying Google ID token
func (r *AuthResolver) GoogleLogin(ctx context.Context, credential, role string) (map[string]interface{}, error) {
	log.Printf("🔍 GOOGLE LOGIN: Starting token verification")

	// Step 1: Verify Google ID Token by calling Google's tokeninfo endpoint
	googleUserInfo, err := verifyGoogleIDToken(credential)
	if err != nil {
		log.Printf("❌ GOOGLE LOGIN: Token verification failed: %v", err)
		return map[string]interface{}{
			"success": false,
			"message": "Invalid Google token: " + err.Error(),
		}, nil
	}

	log.Printf("✅ GOOGLE LOGIN: Token verified for email: %s", googleUserInfo.Email)

	// Step 2: Find or create user in database
	user, err := r.findOrCreateGoogleUser(ctx, googleUserInfo, role)
	if err != nil {
		log.Printf("❌ GOOGLE LOGIN: User creation failed: %v", err)
		return map[string]interface{}{
			"success": false,
			"message": "Failed to create/find user: " + err.Error(),
		}, nil
	}

	log.Printf("✅ GOOGLE LOGIN: User ready - ID=%s, Email=%s", user.ID.Hex(), user.Email)

	// Step 3: Generate JWT access and refresh tokens
	accessToken, err := tokenutil.GenerateAccessToken(user.ID.Hex(), user.Email, user.Role, r.jwtSecret)
	if err != nil {
		return map[string]interface{}{
			"success": false,
			"message": "Failed to generate access token",
		}, err
	}

	refreshToken, err := tokenutil.GenerateRefreshToken(user.ID.Hex(), user.Email, user.Role, r.jwtSecret)
	if err != nil {
		return map[string]interface{}{
			"success": false,
			"message": "Failed to generate refresh token",
		}, err
	}

	log.Printf("🔍 GOOGLE LOGIN RESPONSE: UserID=%s, ProfilePhoto='%s', CoverPhoto='%s'", user.ID.Hex(), user.ProfilePhoto, user.CoverPhoto)

	return map[string]interface{}{
		"success": true,
		"message": "Google login successful",
		"data": map[string]interface{}{
			"user": map[string]interface{}{
				"id":           user.ID.Hex(),
				"name":         user.FirstName + " " + user.LastName,
				"email":        user.Email,
				"firstName":    user.FirstName,
				"lastName":     user.LastName,
				"role":         user.Role,
				"profilePhoto": user.ProfilePhoto,
				"coverPhoto":   user.CoverPhoto,
				"isActive":     user.IsActive,
				"createdAt":    user.CreatedAt.Format(time.RFC3339),
				"updatedAt":    user.UpdatedAt.Format(time.RFC3339),
			},
			"accessToken":  accessToken,
			"refreshToken": refreshToken,
		},
	}, nil
}

// GoogleUserInfo holds user info from Google's tokeninfo endpoint
type GoogleUserInfo struct {
	Email   string `json:"email"`
	Name    string `json:"name"`
	Picture string `json:"picture"`
	Sub     string `json:"sub"` // Google's unique user ID
}

// verifyGoogleIDToken verifies the Google ID token with Google's API
func verifyGoogleIDToken(idToken string) (*GoogleUserInfo, error) {
	url := "https://oauth2.googleapis.com/tokeninfo?id_token=" + idToken

	resp, err := http.Get(url)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, errors.New("invalid token - Google API returned " + resp.Status)
	}

	var userInfo GoogleUserInfo
	if err := json.NewDecoder(resp.Body).Decode(&userInfo); err != nil {
		return nil, err
	}

	if userInfo.Email == "" {
		return nil, errors.New("no email in Google token")
	}

	return &userInfo, nil
}

// findOrCreateGoogleUser finds existing user by email or creates new one from Google data
func (r *AuthResolver) findOrCreateGoogleUser(ctx context.Context, googleInfo *GoogleUserInfo, role string) (*domain.User, error) {
	// Try to find existing user
	existingUser, err := r.userRepo.GetUserByEmail(ctx, googleInfo.Email)
	if err == nil && existingUser != nil {
		return existingUser, nil
	}

	// Create new user from Google data

	// Parse name into first/last
	firstName := ""
	lastName := ""
	if len(googleInfo.Name) > 0 {
		parts := splitName(googleInfo.Name)
		if len(parts) > 0 {
			firstName = parts[0]
		}
		if len(parts) > 1 {
			// Join middle names with last name, or just use last part
			lastName = parts[len(parts)-1]
		}
	}

	// Fallback: if no name provided, use email prefix as first name
	if firstName == "" {
		parts := strings.Split(googleInfo.Email, "@")
		if len(parts) > 0 {
			firstName = parts[0]
		}
	}

	// Default role if not specified
	if role == "" {
		role = "CUSTOMER"
	}

	now := time.Now()
	user := &domain.User{
		ID:           primitive.NewObjectID(),
		FirstName:    firstName,
		LastName:     lastName,
		Email:        googleInfo.Email,
		Password:     "",                 // No password for Google users
		ProfilePhoto: googleInfo.Picture, // Store Google profile picture
		Role:         role,
		IsActive:     true,
		CreatedAt:    now,
		UpdatedAt:    now,
	}

	if err := r.userRepo.CreateUser(ctx, user); err != nil {
		return nil, err
	}
	return user, nil
}

// splitName splits a full name into parts
func splitName(name string) []string {
	var parts []string
	start := 0
	for i := 0; i < len(name); i++ {
		if name[i] == ' ' {
			if i > start {
				parts = append(parts, name[start:i])
			}
			start = i + 1
		}
	}
	if start < len(name) {
		parts = append(parts, name[start:])
	}
	return parts
}
