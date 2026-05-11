package domain

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// InquiryStatus represents the status of an inquiry
type InquiryStatus string

const (
	InquiryStatusPending   InquiryStatus = "PENDING"
	InquiryStatusResponded InquiryStatus = "RESPONDED"
	InquiryStatusResolved  InquiryStatus = "RESOLVED"
	InquiryStatusClosed    InquiryStatus = "CLOSED"
)

// Inquiry represents a customer inquiry about a shop/item
type Inquiry struct {
	ID        primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	UserID    primitive.ObjectID `bson:"user_id" json:"userId"`
	ShopID    primitive.ObjectID `bson:"shop_id" json:"shopId"`
	Item      string             `bson:"item" json:"item"`
	Message   string             `bson:"message" json:"message"`
	Status    InquiryStatus      `bson:"status" json:"status"`
	Replies   []InquiryReply     `bson:"replies" json:"replies"`
	CreatedAt time.Time          `bson:"created_at" json:"createdAt"`
	UpdatedAt time.Time          `bson:"updated_at" json:"updatedAt"`
}

// InquiryReply represents a reply to an inquiry
type InquiryReply struct {
	ID        primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	InquiryID primitive.ObjectID `bson:"inquiry_id" json:"inquiryId"`
	AuthorID  primitive.ObjectID `bson:"author_id" json:"authorId"`
	Message   string             `bson:"message" json:"message"`
	CreatedAt time.Time          `bson:"created_at" json:"createdAt"`
}

// CreateInquiryRequest represents the request to create an inquiry
type CreateInquiryRequest struct {
	ShopID  string
	UserID  string
	Item    string
	Message string
}

// ReplyToInquiryRequest represents the request to reply to an inquiry
type ReplyToInquiryRequest struct {
	InquiryID string
	AuthorID  string
	Message   string
}

// UpdateInquiryStatusRequest represents the request to update inquiry status
type UpdateInquiryStatusRequest struct {
	InquiryID string
	Status    InquiryStatus
}

// InquirySearchRequest represents the search/filter request for inquiries
type InquirySearchRequest struct {
	ShopID string
	UserID string
	Status *InquiryStatus
	Page   int
	Limit  int
}
