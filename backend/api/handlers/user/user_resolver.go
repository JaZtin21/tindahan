package user

import (
	"context"
	"time"

	"tindahan-backend/domain"
	"tindahan-backend/repository"

	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"golang.org/x/crypto/bcrypt"
)

type UserResolver struct {
	userRepo repository.UserRepository
}

func NewUserResolver(db *mongo.Database) *UserResolver {
	return &UserResolver{
		userRepo: repository.NewUserRepository(db),
	}
}

// Me resolves the current user query (real DB implementation)
func (r *UserResolver) Me(ctx context.Context, userId string) (map[string]interface{}, error) {
	// Convert userId to ObjectID
	userObjectID, err := primitive.ObjectIDFromHex(userId)
	if err != nil {
		return map[string]interface{}{
			"success": false,
			"message": "Invalid user ID format",
		}, err
	}

	// Fetch from database
	user, err := r.userRepo.GetUserByID(ctx, userObjectID)
	if err != nil {
		return map[string]interface{}{
			"success": false,
			"message": "User not found",
		}, err
	}

	return map[string]interface{}{
		"success": true,
		"message": "Profile retrieved successfully",
		"data": map[string]interface{}{
			"id":        user.ID.Hex(),
			"firstName": user.FirstName,
			"lastName":  user.LastName,
			"name":      user.FirstName + " " + user.LastName,
			"email":     user.Email,
			"phone":     user.Phone,
			"role":      user.Role,
			"isActive":  user.IsActive,
			"createdAt": user.CreatedAt.Format(time.RFC3339),
			"updatedAt": user.UpdatedAt.Format(time.RFC3339),
		},
	}, nil
}

// Users resolves the users query (admin only) (real DB implementation)
func (r *UserResolver) Users(ctx context.Context, page, limit int) (map[string]interface{}, error) {
	// Fetch from database
	users, total, err := r.userRepo.GetAllUsers(ctx, page, limit)
	if err != nil {
		return map[string]interface{}{
			"success": false,
			"message": "Failed to fetch users: " + err.Error(),
		}, err
	}

	// Convert to response format
	data := make([]map[string]interface{}, len(users))
	for i, user := range users {
		data[i] = map[string]interface{}{
			"id":        user.ID.Hex(),
			"firstName": user.FirstName,
			"lastName":  user.LastName,
			"name":      user.FirstName + " " + user.LastName,
			"email":     user.Email,
			"phone":     user.Phone,
			"role":      user.Role,
			"isActive":  user.IsActive,
		}
	}

	return map[string]interface{}{
		"success": true,
		"message": "Users retrieved successfully",
		"data":    data,
		"total":   total,
	}, nil
}

// UpdateProfile resolves the updateProfile mutation (real DB implementation)
func (r *UserResolver) UpdateProfile(ctx context.Context, userId string, firstName, lastName, phone string) (map[string]interface{}, error) {
	// Convert userId to ObjectID
	userObjectID, err := primitive.ObjectIDFromHex(userId)
	if err != nil {
		return map[string]interface{}{
			"success": false,
			"message": "Invalid user ID format",
		}, err
	}

	// Build update request
	updates := &domain.UpdateUserRequest{}
	if firstName != "" {
		updates.FirstName = &firstName
	}
	if lastName != "" {
		updates.LastName = &lastName
	}
	if phone != "" {
		updates.Phone = &phone
	}

	// Update in database
	if err := r.userRepo.UpdateUser(ctx, userObjectID, updates); err != nil {
		return map[string]interface{}{
			"success": false,
			"message": "Failed to update profile: " + err.Error(),
		}, err
	}

	// Fetch updated user
	user, err := r.userRepo.GetUserByID(ctx, userObjectID)
	if err != nil {
		return map[string]interface{}{
			"success": true,
			"message": "Profile updated but failed to fetch updated data",
			"data": map[string]interface{}{
				"id":        userId,
				"firstName": firstName,
				"lastName":  lastName,
				"phone":     phone,
			},
		}, nil
	}

	return map[string]interface{}{
		"success": true,
		"message": "Profile updated successfully",
		"data": map[string]interface{}{
			"id":        user.ID.Hex(),
			"firstName": user.FirstName,
			"lastName":  user.LastName,
			"name":      user.FirstName + " " + user.LastName,
			"email":     user.Email,
			"phone":     user.Phone,
			"role":      user.Role,
			"isActive":  user.IsActive,
			"updatedAt": user.UpdatedAt.Format(time.RFC3339),
		},
	}, nil
}

// UpdateUserStatus resolves the updateUserStatus mutation (admin only) (real DB implementation)
func (r *UserResolver) UpdateUserStatus(ctx context.Context, id string, isActive bool) (map[string]interface{}, error) {
	// Convert id to ObjectID
	userObjectID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return map[string]interface{}{
			"success": false,
			"message": "Invalid user ID format",
		}, err
	}

	// Update in database
	if err := r.userRepo.UpdateUserStatus(ctx, userObjectID, isActive); err != nil {
		return map[string]interface{}{
			"success": false,
			"message": "Failed to update user status: " + err.Error(),
		}, err
	}

	return map[string]interface{}{
		"success": true,
		"message": "User status updated successfully",
		"data": map[string]interface{}{
			"id":       id,
			"isActive": isActive,
		},
	}, nil
}

// CreateUser creates a new user (real DB implementation with bcrypt)
func (r *UserResolver) CreateUser(ctx context.Context, firstName, lastName, email, password, role string) (map[string]interface{}, error) {
	// Check if user already exists
	existingUser, _ := r.userRepo.GetUserByEmail(ctx, email)
	if existingUser != nil {
		return map[string]interface{}{
			"success": false,
			"message": "User with this email already exists",
		}, nil
	}

	// Hash password with bcrypt
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return map[string]interface{}{
			"success": false,
			"message": "Failed to hash password",
		}, err
	}

	// Create new user
	user := &domain.User{
		ID:        primitive.NewObjectID(),
		FirstName: firstName,
		LastName:  lastName,
		Email:     email,
		Password:  string(hashedPassword),
		Role:      role,
		IsActive:  true,
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	// Save to database
	if err := r.userRepo.CreateUser(ctx, user); err != nil {
		return map[string]interface{}{
			"success": false,
			"message": "Failed to create user: " + err.Error(),
		}, err
	}

	return map[string]interface{}{
		"success": true,
		"message": "User created successfully",
		"data": map[string]interface{}{
			"id":        user.ID.Hex(),
			"firstName": user.FirstName,
			"lastName":  user.LastName,
			"name":      user.FirstName + " " + user.LastName,
			"email":     user.Email,
			"role":      user.Role,
			"isActive":  user.IsActive,
		},
	}, nil
}

// DeleteUser deletes a user (real DB implementation)
func (r *UserResolver) DeleteUser(ctx context.Context, id string) (map[string]interface{}, error) {
	// Convert id to ObjectID
	userObjectID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return map[string]interface{}{
			"success": false,
			"message": "Invalid user ID format",
		}, err
	}

	// Delete from database
	if err := r.userRepo.DeleteUser(ctx, userObjectID); err != nil {
		return map[string]interface{}{
			"success": false,
			"message": "Failed to delete user: " + err.Error(),
		}, err
	}

	return map[string]interface{}{
		"success": true,
		"message": "User deleted successfully",
	}, nil
}
