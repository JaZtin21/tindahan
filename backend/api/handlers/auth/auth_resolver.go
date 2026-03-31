package auth

import (
	"context"
	"log"
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
				"id":        user.ID.Hex(),
				"name":      user.FirstName + " " + user.LastName,
				"email":     user.Email,
				"role":      user.Role,
				"isActive":  user.IsActive,
				"createdAt": user.CreatedAt.Format(time.RFC3339),
				"updatedAt": user.UpdatedAt.Format(time.RFC3339),
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
			"id":        user.ID.Hex(),
			"name":      user.FirstName + " " + user.LastName,
			"email":     user.Email,
			"role":      user.Role,
			"isActive":  user.IsActive,
			"createdAt": user.CreatedAt.Format(time.RFC3339),
			"updatedAt": user.UpdatedAt.Format(time.RFC3339),
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
	return map[string]interface{}{
		"success": true,
		"message": "Token refreshed successfully",
		"data": map[string]interface{}{
			"accessToken":  "refreshed-access-token",
			"refreshToken": "refreshed-refresh-token",
		},
	}, nil
}
