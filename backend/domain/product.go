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
	SubCategory string             `bson:"sub_category" json:"sub_category"`
	Price       float64            `bson:"price" json:"price" validate:"required,min=0"`
	ImageURL    string             `bson:"image_url" json:"image_url"`
	CoverPhoto  string             `bson:"cover_photo" json:"cover_photo"`
	OtherPhotos []string           `bson:"other_photos" json:"other_photos"`
	StoreID     primitive.ObjectID `bson:"store_id" json:"store_id" validate:"required"`
	Stock       int                `bson:"stock" json:"stock" validate:"min=0"`
	SKU         string             `bson:"sku" json:"sku"`
	Barcode     string             `bson:"barcode" json:"barcode"`
	Weight      float64            `bson:"weight" json:"weight"`
	Unit        string             `bson:"unit" json:"unit"`
	ExpiryDate  *time.Time         `bson:"expiry_date" json:"expiry_date"`
	Supplier    string             `bson:"supplier" json:"supplier"`
	Brand       string             `bson:"brand" json:"brand"`
	Origin      string             `bson:"origin" json:"origin"`
	Tags        []string           `bson:"tags" json:"tags"`
	IsActive    bool               `bson:"is_active" json:"is_active"`
	Rating      float64            `bson:"rating" json:"rating"`
	Discount    Discount           `bson:"discount" json:"discount"`
	CreatedAt   time.Time          `bson:"created_at" json:"created_at"`
	UpdatedAt   time.Time          `bson:"updated_at" json:"updated_at"`
}

type Discount struct {
	Percentage float64    `bson:"percentage" json:"percentage"`
	ValidUntil *time.Time `bson:"valid_until" json:"valid_until"`
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
	CoverPhoto  *string  `json:"cover_photo"`
	Stock       *int     `json:"stock"`
	IsActive    *bool    `json:"is_active"`
}

type ProductSearchRequest struct {
	Query    string  `json:"query" form:"query"`
	Category string  `json:"category" form:"category"`
	StoreID  string  `json:"store_id" form:"store_id"`
	MinPrice float64 `json:"min_price" form:"min_price"`
	MaxPrice float64 `json:"max_price" form:"max_price"`
	InStock  bool    `json:"in_stock" form:"in_stock"`
	Page     int     `json:"page" form:"page"`
	Limit    int     `json:"limit" form:"limit"`
}
