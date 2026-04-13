package domain

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type BusinessHours struct {
	OpenTime  string   `bson:"open_time" json:"open_time"`
	CloseTime string   `bson:"close_time" json:"close_time"`
	Days      []string `bson:"days" json:"days"`
}

type PaymentMethods struct {
	Cash    bool `bson:"cash" json:"cash"`
	GCash   bool `bson:"gcash" json:"gcash"`
	Paymaya bool `bson:"paymaya" json:"paymaya"`
	Card    bool `bson:"card" json:"card"`
}

type DeliveryOptions struct {
	Available bool    `bson:"available" json:"available"`
	Radius    float64 `bson:"radius,omitempty" json:"radius,omitempty"`
	Fee       float64 `bson:"fee,omitempty" json:"fee,omitempty"`
	MinOrder  float64 `bson:"min_order,omitempty" json:"min_order,omitempty"`
}

type SocialMedia struct {
	Facebook  string `bson:"facebook,omitempty" json:"facebook,omitempty"`
	Instagram string `bson:"instagram,omitempty" json:"instagram,omitempty"`
}

type Verification struct {
	IsVerified     bool   `bson:"is_verified" json:"is_verified"`
	VerifiedDate   string `bson:"verified_date,omitempty" json:"verified_date,omitempty"`
	VerificationID string `bson:"verification_id,omitempty" json:"verification_id,omitempty"`
}

type ContactDetails struct {
	Phone   string `bson:"phone" json:"phone"`
	Email   string `bson:"email" json:"email"`
	Address string `bson:"address" json:"address"`
}

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
	// Additional fields for GraphQL compatibility
	CoverPhoto     string          `bson:"cover_photo,omitempty" json:"cover_photo,omitempty"`
	OtherPhotos    []string        `bson:"other_photos,omitempty" json:"other_photos,omitempty"`
	BusinessHours  BusinessHours   `bson:"business_hours,omitempty" json:"business_hours,omitempty"`
	BusinessType   string          `bson:"business_type,omitempty" json:"business_type,omitempty"`
	PaymentMethods PaymentMethods  `bson:"payment_methods,omitempty" json:"payment_methods,omitempty"`
	Delivery       DeliveryOptions `bson:"delivery,omitempty" json:"delivery,omitempty"`
	SocialMedia    SocialMedia     `bson:"social_media,omitempty" json:"social_media,omitempty"`
	Verification   Verification    `bson:"verification,omitempty" json:"verification,omitempty"`
	ContactDetails ContactDetails  `bson:"contact_details,omitempty" json:"contact_details,omitempty"`
	Status         string          `bson:"status,omitempty" json:"status,omitempty"`
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
	Name           *string          `json:"name"`
	Description    *string          `json:"description"`
	Address        *string          `json:"address"`
	City           *string          `json:"city"`
	Latitude       *float64         `json:"latitude"`
	Longitude      *float64         `json:"longitude"`
	Category       *string          `json:"category"`
	IsActive       *bool            `json:"is_active"`
	CoverPhoto     *string          `json:"cover_photo"`
	OtherPhotos    *[]string        `json:"other_photos"`
	BusinessHours  *BusinessHours   `json:"business_hours"`
	BusinessType   *string          `json:"business_type"`
	PaymentMethods *PaymentMethods  `json:"payment_methods"`
	Delivery       *DeliveryOptions `json:"delivery"`
	SocialMedia    *SocialMedia     `json:"social_media"`
	ContactDetails *ContactDetails  `json:"contact_details"`
	Status         *string          `json:"status"`
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
