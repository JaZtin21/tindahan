package repository

import (
	"context"
	"time"

	"tindahan-backend/domain"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

type InquiryRepository interface {
	CreateInquiry(ctx context.Context, inquiry *domain.Inquiry) error
	GetInquiryByID(ctx context.Context, inquiryID primitive.ObjectID) (*domain.Inquiry, error)
	GetInquiriesForShop(ctx context.Context, shopID primitive.ObjectID, page, limit int) ([]*domain.Inquiry, int64, error)
	GetInquiriesByUser(ctx context.Context, userID primitive.ObjectID, page, limit int) ([]*domain.Inquiry, int64, error)
	AddReply(ctx context.Context, inquiryID primitive.ObjectID, reply domain.InquiryReply) error
	UpdateStatus(ctx context.Context, inquiryID primitive.ObjectID, status domain.InquiryStatus) error
	WatchInquiries(ctx context.Context, shopID primitive.ObjectID) (*mongo.ChangeStream, error)
	WatchReplies(ctx context.Context, inquiryID primitive.ObjectID) (*mongo.ChangeStream, error)
}

type inquiryRepository struct {
	collection *mongo.Collection
}

func NewInquiryRepository(db *mongo.Database) InquiryRepository {
	return &inquiryRepository{
		collection: db.Collection("inquiries"),
	}
}

func (r *inquiryRepository) CreateInquiry(ctx context.Context, inquiry *domain.Inquiry) error {
	inquiry.CreatedAt = time.Now()
	inquiry.UpdatedAt = time.Now()
	inquiry.Status = domain.InquiryStatusPending
	inquiry.Replies = []domain.InquiryReply{}

	_, err := r.collection.InsertOne(ctx, inquiry)
	return err
}

func (r *inquiryRepository) GetInquiryByID(ctx context.Context, inquiryID primitive.ObjectID) (*domain.Inquiry, error) {
	var inquiry domain.Inquiry
	err := r.collection.FindOne(ctx, bson.M{"_id": inquiryID}).Decode(&inquiry)
	if err != nil {
		return nil, err
	}
	return &inquiry, nil
}

func (r *inquiryRepository) GetInquiriesForShop(ctx context.Context, shopID primitive.ObjectID, page, limit int) ([]*domain.Inquiry, int64, error) {
	skip := (page - 1) * limit

	// Get total count
	total, err := r.collection.CountDocuments(ctx, bson.M{"shop_id": shopID})
	if err != nil {
		return nil, 0, err
	}

	// Get inquiries with pagination
	opts := options.Find().
		SetSkip(int64(skip)).
		SetLimit(int64(limit)).
		SetSort(bson.M{"created_at": -1})

	cursor, err := r.collection.Find(ctx, bson.M{"shop_id": shopID}, opts)
	if err != nil {
		return nil, 0, err
	}
	defer cursor.Close(ctx)

	var inquiries []*domain.Inquiry
	if err := cursor.All(ctx, &inquiries); err != nil {
		return nil, 0, err
	}

	return inquiries, total, nil
}

func (r *inquiryRepository) GetInquiriesByUser(ctx context.Context, userID primitive.ObjectID, page, limit int) ([]*domain.Inquiry, int64, error) {
	skip := (page - 1) * limit

	// Get total count
	total, err := r.collection.CountDocuments(ctx, bson.M{"user_id": userID})
	if err != nil {
		return nil, 0, err
	}

	// Get inquiries with pagination
	opts := options.Find().
		SetSkip(int64(skip)).
		SetLimit(int64(limit)).
		SetSort(bson.M{"created_at": -1})

	cursor, err := r.collection.Find(ctx, bson.M{"user_id": userID}, opts)
	if err != nil {
		return nil, 0, err
	}
	defer cursor.Close(ctx)

	var inquiries []*domain.Inquiry
	if err := cursor.All(ctx, &inquiries); err != nil {
		return nil, 0, err
	}

	return inquiries, total, nil
}

func (r *inquiryRepository) AddReply(ctx context.Context, inquiryID primitive.ObjectID, reply domain.InquiryReply) error {
	reply.CreatedAt = time.Now()
	reply.InquiryID = inquiryID

	filter := bson.M{"_id": inquiryID}
	update := bson.M{
		"$push": bson.M{"replies": reply},
		"$set":  bson.M{"updated_at": time.Now(), "status": domain.InquiryStatusResponded},
	}

	_, err := r.collection.UpdateOne(ctx, filter, update)
	return err
}

func (r *inquiryRepository) UpdateStatus(ctx context.Context, inquiryID primitive.ObjectID, status domain.InquiryStatus) error {
	filter := bson.M{"_id": inquiryID}
	update := bson.M{
		"$set": bson.M{
			"status":     status,
			"updated_at": time.Now(),
		},
	}

	_, err := r.collection.UpdateOne(ctx, filter, update)
	return err
}

func (r *inquiryRepository) WatchInquiries(ctx context.Context, shopID primitive.ObjectID) (*mongo.ChangeStream, error) {
	pipeline := mongo.Pipeline{
		{{Key: "$match", Value: bson.M{
			"operationType": bson.M{"$in": []string{"insert", "update", "replace"}},
			"fullDocument.shop_id": shopID,
		}}},
	}

	return r.collection.Watch(ctx, pipeline)
}

func (r *inquiryRepository) WatchReplies(ctx context.Context, inquiryID primitive.ObjectID) (*mongo.ChangeStream, error) {
	pipeline := mongo.Pipeline{
		{{Key: "$match", Value: bson.M{
			"operationType":         bson.M{"$in": []string{"update"}},
			"documentKey._id":       inquiryID,
			"updateDescription.updatedFields.replies": bson.M{"$exists": true},
		}}},
	}

	return r.collection.Watch(ctx, pipeline)
}
