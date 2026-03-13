package domain

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type Product struct {
	ID          primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	Name        string             `bson:"name" json:"name" validate:"required,min=2,max=100"`
	Description string             `bson:"description" json:"description"`
	Category    string             `bson:"category" json:"category"`
	Price       float64            `bson:"price" json:"price" validate:"required,min=0"`
	ImageURL    string             `bson:"image_url" json:"image_url"`
	StoreID     primitive.ObjectID `bson:"store_id" json:"store_id" validate:"required"`
	Stock       int                `bson:"stock" json:"stock" validate:"min=0"`
	IsActive    bool               `bson:"is_active" json:"is_active"`
	CreatedAt   time.Time          `bson:"created_at" json:"created_at"`
	UpdatedAt   time.Time          `bson:"updated_at" json:"updated_at"`
}

type ProductResponse struct {
	ID          string    `json:"id"`
	Name        string    `json:"name"`
	Description string    `json:"description"`
	Category    string    `json:"category"`
	Price       float64   `json:"price"`
	ImageURL    string    `json:"image_url"`
	StoreID     string    `json:"store_id"`
	StoreName   string    `json:"store_name"`
	Stock       int       `json:"stock"`
	IsActive    bool      `json:"is_active"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

type CreateProductRequest struct {
	Name        string  `json:"name" validate:"required,min=2,max=100"`
	Description string  `json:"description"`
	Category    string  `json:"category"`
	Price       float64 `json:"price" validate:"required,min=0"`
	ImageURL    string  `json:"image_url"`
	StoreID     string  `json:"store_id" validate:"required"`
	Stock       int     `json:"stock" validate:"min=0"`
}

type UpdateProductRequest struct {
	Name        *string  `json:"name"`
	Description *string  `json:"description"`
	Category    *string  `json:"category"`
	Price       *float64 `json:"price"`
	ImageURL    *string  `json:"image_url"`
	Stock       *int     `json:"stock"`
	IsActive    *bool    `json:"is_active"`
}

type ProductSearchRequest struct {
	Query    string `json:"query" form:"query"`
	Category string `json:"category" form:"category"`
	StoreID  string `json:"store_id" form:"store_id"`
	MinPrice float64 `json:"min_price" form:"min_price"`
	MaxPrice float64 `json:"max_price" form:"max_price"`
	InStock  bool   `json:"in_stock" form:"in_stock"`
	Page     int    `json:"page" form:"page"`
	Limit    int    `json:"limit" form:"limit"`
}
