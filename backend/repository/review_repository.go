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

type ReviewRepository interface {
	CreateReview(ctx context.Context, review *domain.Review) error
	GetReviewByID(ctx context.Context, reviewID primitive.ObjectID) (*domain.Review, error)
	GetReviewsByStore(ctx context.Context, storeID primitive.ObjectID, page, limit int) ([]*domain.Review, int64, error)
	GetReviewsByUser(ctx context.Context, userID primitive.ObjectID, page, limit int) ([]*domain.Review, int64, error)
	UpdateReview(ctx context.Context, reviewID primitive.ObjectID, updates *domain.UpdateReviewRequest) error
	DeleteReview(ctx context.Context, reviewID primitive.ObjectID) error
	HasUserReviewedStore(ctx context.Context, userID, storeID primitive.ObjectID) (bool, error)
	GetReviewStats(ctx context.Context, storeID primitive.ObjectID) (*domain.ReviewStats, error)
}

type reviewRepository struct {
	collection *mongo.Collection
}

func NewReviewRepository(db *mongo.Database) ReviewRepository {
	return &reviewRepository{
		collection: db.Collection("reviews"),
	}
}

func (r *reviewRepository) CreateReview(ctx context.Context, review *domain.Review) error {
	review.CreatedAt = time.Now()
	review.UpdatedAt = time.Now()
	result, err := r.collection.InsertOne(ctx, review)
	if err != nil {
		return err
	}
	// Set the generated ID back on the review struct
	if oid, ok := result.InsertedID.(primitive.ObjectID); ok {
		review.ID = oid
	}
	return nil
}

func (r *reviewRepository) GetReviewByID(ctx context.Context, reviewID primitive.ObjectID) (*domain.Review, error) {
	var review domain.Review
	err := r.collection.FindOne(ctx, bson.M{"_id": reviewID}).Decode(&review)
	if err != nil {
		return nil, err
	}
	return &review, nil
}

func (r *reviewRepository) GetReviewsByStore(ctx context.Context, storeID primitive.ObjectID, page, limit int) ([]*domain.Review, int64, error) {
	if page <= 0 {
		page = 1
	}
	if limit <= 0 {
		limit = 10
	}
	skip := (page - 1) * limit

	filter := bson.M{"store_id": storeID}
	opts := options.Find().
		SetSkip(int64(skip)).
		SetLimit(int64(limit)).
		SetSort(bson.M{"created_at": -1})

	cursor, err := r.collection.Find(ctx, filter, opts)
	if err != nil {
		return nil, 0, err
	}
	defer cursor.Close(ctx)

	var reviews []*domain.Review
	for cursor.Next(ctx) {
		var review domain.Review
		if err := cursor.Decode(&review); err != nil {
			return nil, 0, err
		}
		reviews = append(reviews, &review)
	}

	total, err := r.collection.CountDocuments(ctx, filter)
	if err != nil {
		return nil, 0, err
	}

	return reviews, total, nil
}

func (r *reviewRepository) GetReviewsByUser(ctx context.Context, userID primitive.ObjectID, page, limit int) ([]*domain.Review, int64, error) {
	if page <= 0 {
		page = 1
	}
	if limit <= 0 {
		limit = 10
	}
	skip := (page - 1) * limit

	filter := bson.M{"user_id": userID}
	opts := options.Find().
		SetSkip(int64(skip)).
		SetLimit(int64(limit)).
		SetSort(bson.M{"created_at": -1})

	cursor, err := r.collection.Find(ctx, filter, opts)
	if err != nil {
		return nil, 0, err
	}
	defer cursor.Close(ctx)

	var reviews []*domain.Review
	for cursor.Next(ctx) {
		var review domain.Review
		if err := cursor.Decode(&review); err != nil {
			return nil, 0, err
		}
		reviews = append(reviews, &review)
	}

	total, err := r.collection.CountDocuments(ctx, filter)
	if err != nil {
		return nil, 0, err
	}

	return reviews, total, nil
}

func (r *reviewRepository) UpdateReview(ctx context.Context, reviewID primitive.ObjectID, updates *domain.UpdateReviewRequest) error {
	updateDoc := bson.M{}

	if updates.Rating != nil {
		updateDoc["rating"] = *updates.Rating
	}
	if updates.Text != nil {
		updateDoc["text"] = *updates.Text
	}
	if updates.Photos != nil {
		updateDoc["photos"] = updates.Photos
	}
	updateDoc["updated_at"] = time.Now()

	_, err := r.collection.UpdateOne(
		ctx,
		bson.M{"_id": reviewID},
		bson.M{"$set": updateDoc},
	)
	return err
}

func (r *reviewRepository) DeleteReview(ctx context.Context, reviewID primitive.ObjectID) error {
	_, err := r.collection.DeleteOne(ctx, bson.M{"_id": reviewID})
	return err
}

func (r *reviewRepository) HasUserReviewedStore(ctx context.Context, userID, storeID primitive.ObjectID) (bool, error) {
	count, err := r.collection.CountDocuments(ctx, bson.M{
		"user_id":  userID,
		"store_id": storeID,
	})
	if err != nil {
		return false, err
	}
	return count > 0, nil
}

func (r *reviewRepository) GetReviewStats(ctx context.Context, storeID primitive.ObjectID) (*domain.ReviewStats, error) {
	pipeline := []bson.M{
		{"$match": bson.M{"store_id": storeID}},
		{"$group": bson.M{
			"_id":   "$rating",
			"count": bson.M{"$sum": 1},
		}},
	}

	cursor, err := r.collection.Aggregate(ctx, pipeline)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	stats := &domain.ReviewStats{}
	var totalRating int64 = 0
	var totalCount int64 = 0

	for cursor.Next(ctx) {
		var result struct {
			ID    int   `bson:"_id"`
			Count int64 `bson:"count"`
		}
		if err := cursor.Decode(&result); err != nil {
			continue
		}

		totalCount += result.Count
		totalRating += int64(result.ID) * result.Count

		switch result.ID {
		case 5:
			stats.FiveStars = result.Count
		case 4:
			stats.FourStars = result.Count
		case 3:
			stats.ThreeStars = result.Count
		case 2:
			stats.TwoStars = result.Count
		case 1:
			stats.OneStar = result.Count
		}
	}

	stats.TotalReviews = totalCount
	if totalCount > 0 {
		stats.AverageRating = float64(totalRating) / float64(totalCount)
	}

	return stats, nil
}
