package user

import (
	"context"
)

type UserResolver struct{}

func NewUserResolver() *UserResolver {
	return &UserResolver{}
}

// Me resolves the current user query
func (r *UserResolver) Me(ctx context.Context) (map[string]interface{}, error) {
	return map[string]interface{}{
		"success": true,
		"message": "Profile retrieved successfully",
		"data": map[string]interface{}{
			"id":       "test-id",
			"name":     "Test User",
			"email":    "test@example.com",
			"phone":    "1234567890",
			"role":     "CUSTOMER",
			"shops":    []string{"shop1", "shop2"},
			"createdAt": "2023-01-01T00:00:00Z",
			"updatedAt": "2023-01-01T00:00:00Z",
			"isActive": true,
		},
	}, nil
}

// Users resolves the users query (admin only)
func (r *UserResolver) Users(ctx context.Context, page, limit int) ([]map[string]interface{}, error) {
	return []map[string]interface{}{
		{
			"id":       "test-id",
			"name":     "Test User",
			"email":    "test@example.com",
			"role":     "CUSTOMER",
			"isActive": true,
		},
	}, nil
}

// UpdateProfile resolves the updateProfile mutation
func (r *UserResolver) UpdateProfile(ctx context.Context, name string) (map[string]interface{}, error) {
	return map[string]interface{}{
		"success": true,
		"message": "Profile updated successfully",
		"data": map[string]interface{}{
			"id":       "test-user-id",
			"name":     name,
			"email":    "test@example.com",
			"role":     "CUSTOMER",
			"isActive": true,
		},
	}, nil
}

// UpdateUserStatus resolves the updateUserStatus mutation (admin only)
func (r *UserResolver) UpdateUserStatus(ctx context.Context, id string, isActive bool) (map[string]interface{}, error) {
	return map[string]interface{}{
		"success": true,
		"message": "User status updated successfully",
		"data": map[string]interface{}{
			"id":       id,
			"isActive": isActive,
		},
	}, nil
}
