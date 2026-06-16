package domain

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type User struct {
	ID           primitive.ObjectID   `bson:"_id,omitempty" json:"id"`
	FirstName    string               `bson:"first_name" json:"first_name" validate:"required,min=2,max=50"`
	LastName     string               `bson:"last_name" json:"last_name" validate:"required,min=2,max=50"`
	Email        string               `bson:"email" json:"email" validate:"required,email"`
	Password     string               `bson:"password" json:"-" validate:"required,min=6"`
	Phone        string               `bson:"phone" json:"phone"`
	Birthday     string               `bson:"birthday,omitempty" json:"birthday,omitempty"`
	ProfilePhoto string               `bson:"profile_photo,omitempty" json:"profile_photo,omitempty"`
	CoverPhoto   string               `bson:"cover_photo,omitempty" json:"cover_photo,omitempty"`
	Role         string               `bson:"role" json:"role"` // "owner", "customer", "admin"
	IsActive     bool                 `bson:"is_active" json:"is_active"`
	Followers    []primitive.ObjectID `bson:"followers,omitempty" json:"followers,omitempty"`
	Following    []primitive.ObjectID `bson:"following,omitempty" json:"following,omitempty"`
	Priority     *int                 `bson:"priority,omitempty" json:"priority,omitempty"`
	CreatedAt    time.Time            `bson:"created_at" json:"created_at"`
	UpdatedAt    time.Time            `bson:"updated_at" json:"updated_at"`
}

type UserResponse struct {
	ID           string    `json:"id"`
	FirstName    string    `json:"first_name"`
	LastName     string    `json:"last_name"`
	Email        string    `json:"email"`
	Phone        string    `json:"phone"`
	Birthday     string    `json:"birthday"`
	ProfilePhoto string    `json:"profile_photo"`
	CoverPhoto   string    `json:"cover_photo"`
	Role         string    `json:"role"`
	IsActive     bool      `json:"is_active"`
	Priority     *int      `json:"priority,omitempty"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}

type SignupRequest struct {
	FirstName string `json:"first_name" validate:"required,min=2,max=50"`
	LastName  string `json:"last_name" validate:"required,min=2,max=50"`
	Email     string `json:"email" validate:"required,email"`
	Password  string `json:"password" validate:"required,min=6"`
	Phone     string `json:"phone"`
	Role      string `json:"role" validate:"oneof=owner customer"`
}

type LoginRequest struct {
	Email    string `json:"email" validate:"required,email"`
	Password string `json:"password" validate:"required"`
}

type LoginResponse struct {
	User         UserResponse `json:"user"`
	AccessToken  string       `json:"access_token"`
	RefreshToken string       `json:"refresh_token"`
}

type RefreshTokenRequest struct {
	RefreshToken string `json:"refresh_token" validate:"required"`
}

type UpdateUserRequest struct {
	FirstName *string `json:"first_name"`
	LastName  *string `json:"last_name"`
	Phone     *string `json:"phone"`
	Birthday  *string `json:"birthday"`
	IsActive  *bool   `json:"is_active"`
}
