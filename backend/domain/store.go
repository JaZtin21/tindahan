package domain

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type Store struct {
	ID          primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	Name        string             `bson:"name" json:"name" validate:"required,min=2,max=100"`
	Description string             `bson:"description" json:"description"`
	Address     string             `bson:"address" json:"address" validate:"required"`
	City        string             `bson:"city" json:"city" validate:"required"`
	Latitude    float64            `bson:"latitude" json:"latitude" validate:"required,min=-90,max=90"`
	Longitude   float64            `bson:"longitude" json:"longitude" validate:"required,min=-180,max=180"`
	OwnerID     primitive.ObjectID `bson:"owner_id" json:"owner_id"`
	Category    string             `bson:"category" json:"category"`
	Rating      float64            `bson:"rating" json:"rating"`
	IsActive    bool               `bson:"is_active" json:"is_active"`
	CreatedAt   time.Time          `bson:"created_at" json:"created_at"`
	UpdatedAt   time.Time          `bson:"updated_at" json:"updated_at"`
}

type StoreResponse struct {
	ID          string    `json:"id"`
	Name        string    `json:"name"`
	Description string    `json:"description"`
	Address     string    `json:"address"`
	City        string    `json:"city"`
	Latitude    float64   `json:"latitude"`
	Longitude   float64   `json:"longitude"`
	OwnerID     string    `json:"owner_id"`
	Category    string    `json:"category"`
	Rating      float64   `json:"rating"`
	IsActive    bool      `json:"is_active"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

type CreateStoreRequest struct {
	Name        string  `json:"name" validate:"required,min=2,max=100"`
	Description string  `json:"description"`
	Address     string  `json:"address" validate:"required"`
	City        string  `json:"city" validate:"required"`
	Latitude    float64 `json:"latitude" validate:"required,min=-90,max=90"`
	Longitude   float64 `json:"longitude" validate:"required,min=-180,max=180"`
	Category    string  `json:"category"`
}

type UpdateStoreRequest struct {
	Name        *string `json:"name"`
	Description *string `json:"description"`
	Address     *string `json:"address"`
	City        *string `json:"city"`
	Latitude    *float64 `json:"latitude"`
	Longitude   *float64 `json:"longitude"`
	Category    *string `json:"category"`
	IsActive    *bool   `json:"is_active"`
}

type StoreSearchRequest struct {
	Query    string  `json:"query" form:"query"`
	Category string  `json:"category" form:"category"`
	City     string  `json:"city" form:"city"`
	Lat      float64 `json:"lat" form:"lat"`
	Lng      float64 `json:"lng" form:"lng"`
	Radius   float64 `json:"radius" form:"radius"`
	Page     int     `json:"page" form:"page"`
	Limit    int     `json:"limit" form:"limit"`
}
