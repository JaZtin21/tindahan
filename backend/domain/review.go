package domain

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// Review represents a user review for a store
type Review struct {
	ID        primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	StoreID   primitive.ObjectID `bson:"store_id" json:"store_id" validate:"required"`
	UserID    primitive.ObjectID `bson:"user_id" json:"user_id" validate:"required"`
	Rating    int                `bson:"rating" json:"rating" validate:"required,min=1,max=5"`
	Text      string             `bson:"text" json:"text" validate:"max=2000"`
	Photos    []string           `bson:"photos" json:"photos"`
	CreatedAt time.Time          `bson:"created_at" json:"created_at"`
	UpdatedAt time.Time          `bson:"updated_at" json:"updated_at"`
}

// ReviewResponse is the API response structure
type ReviewResponse struct {
	ID        string       `json:"id"`
	StoreID   string       `json:"store_id"`
	UserID    string       `json:"user_id"`
	User      UserResponse `json:"user"`
	Rating    int          `json:"rating"`
	Text      string       `json:"text"`
	Photos    []string     `json:"photos"`
	CreatedAt time.Time    `json:"created_at"`
	UpdatedAt time.Time    `json:"updated_at"`
}

// CreateReviewRequest is the input for creating a review
type CreateReviewRequest struct {
	StoreID string   `json:"store_id" validate:"required"`
	Rating  int      `json:"rating" validate:"required,min=1,max=5"`
	Text    string   `json:"text" validate:"max=2000"`
	Photos  []string `json:"photos"`
}

// UpdateReviewRequest is the input for updating a review
type UpdateReviewRequest struct {
	Rating *int      `json:"rating,omitempty" validate:"omitempty,min=1,max=5"`
	Text   *string   `json:"text,omitempty" validate:"omitempty,max=2000"`
	Photos []string  `json:"photos,omitempty"`
}

// ReviewStats holds aggregate review data for a store
type ReviewStats struct {
	AverageRating float64 `json:"average_rating"`
	TotalReviews  int64   `json:"total_reviews"`
	FiveStars     int64   `json:"five_stars"`
	FourStars     int64   `json:"four_stars"`
	ThreeStars    int64   `json:"three_stars"`
	TwoStars      int64   `json:"two_stars"`
	OneStar       int64   `json:"one_star"`
}
