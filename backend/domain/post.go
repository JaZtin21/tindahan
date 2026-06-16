package domain

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type Post struct {
	ID        primitive.ObjectID   `bson:"_id,omitempty" json:"id"`
	Title     string               `bson:"title" json:"title" validate:"required,max=200"`
	Text      string               `bson:"text" json:"text" validate:"required,max=2000"`
	Photos    []string             `bson:"photos" json:"photos"`
	Types     []string             `bson:"types" json:"types"`
	AuthorID  primitive.ObjectID   `bson:"author_id" json:"author_id"`
	Location  *PostLocation        `bson:"location,omitempty" json:"location,omitempty"`
	Likes     int                  `bson:"likes" json:"likes"`
	LikedBy   []primitive.ObjectID `bson:"liked_by" json:"liked_by"`
	Comments  []Comment            `bson:"comments" json:"comments"`
	Quality   *int                 `bson:"quality,omitempty" json:"quality,omitempty"`
	CreatedAt time.Time            `bson:"created_at" json:"created_at"`
	UpdatedAt time.Time            `bson:"updated_at" json:"updated_at"`
}

type PostLocation struct {
	Lat  float64 `bson:"lat" json:"lat"`
	Lng  float64 `bson:"lng" json:"lng"`
	Name string  `bson:"name" json:"name"`
}

type Comment struct {
	ID        primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	Text      string             `bson:"text" json:"text" validate:"required,max=500"`
	AuthorID  primitive.ObjectID `bson:"author_id" json:"author_id"`
	CreatedAt time.Time          `bson:"created_at" json:"created_at"`
	UpdatedAt time.Time          `bson:"updated_at" json:"updated_at"`
}

// Post response structures for API
type PostResponse struct {
	ID           string            `json:"id"`
	Title        string            `json:"title"`
	Text         string            `json:"text"`
	Photos       []string          `json:"photos"`
	Types        []string          `json:"types"`
	AuthorID     string            `json:"author_id"`
	Author       UserResponse      `json:"author"`
	Location     *PostLocation     `json:"location,omitempty"`
	Likes        int               `json:"likes"`
	IsLiked      bool              `json:"is_liked"`
	Comments     []CommentResponse `json:"comments"`
	CommentCount int               `json:"comment_count"`
	Quality      *int              `json:"quality,omitempty"`
	CreatedAt    time.Time         `json:"created_at"`
	UpdatedAt    time.Time         `json:"updated_at"`
}

type CommentResponse struct {
	ID        string       `json:"id"`
	Text      string       `json:"text"`
	AuthorID  string       `json:"author_id"`
	Author    UserResponse `json:"author"`
	CreatedAt time.Time    `json:"created_at"`
	UpdatedAt time.Time    `json:"updated_at"`
}

// Request/Input types
type CreatePostRequest struct {
	Title    string        `json:"title" validate:"required,max=200"`
	Text     string        `json:"text" validate:"required,max=2000"`
	Photos   []string      `json:"photos"`
	Types    []string      `json:"types"`
	Location *PostLocation `json:"location,omitempty"`
}

type UpdatePostRequest struct {
	Title    *string       `json:"title,omitempty"`
	Text     *string       `json:"text,omitempty"`
	Photos   []string      `json:"photos,omitempty"`
	Types    []string      `json:"types,omitempty"`
	Location *PostLocation `json:"location,omitempty"`
}

type PostSearchRequest struct {
	Lat    float64 `json:"lat" form:"lat"`
	Lng    float64 `json:"lng" form:"lng"`
	Radius float64 `json:"radius" form:"radius"`
	Page   int     `json:"page" form:"page"`
	Limit  int     `json:"limit" form:"limit"`
}
