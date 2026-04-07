package repository

import (
	"context"
	"math"
	"time"

	"tindahan-backend/domain"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

type PostRepository interface {
	CreatePost(ctx context.Context, post *domain.Post) error
	GetPostByID(ctx context.Context, postID primitive.ObjectID) (*domain.Post, error)
	UpdatePost(ctx context.Context, postID primitive.ObjectID, updates bson.M) error
	DeletePost(ctx context.Context, postID primitive.ObjectID) error
	GetPosts(ctx context.Context, page, limit int) ([]*domain.Post, int64, error)
	GetMyPosts(ctx context.Context, authorID primitive.ObjectID, page, limit int) ([]*domain.Post, int64, error)
	GetPostsNearLocation(ctx context.Context, lat, lng, radius float64, page, limit int) ([]*domain.Post, int64, error)
	LikePost(ctx context.Context, postID, userID primitive.ObjectID) error
	UnlikePost(ctx context.Context, postID, userID primitive.ObjectID) error
	IsPostLikedByUser(ctx context.Context, postID, userID primitive.ObjectID) (bool, error)
}

type postRepository struct {
	collection *mongo.Collection
}

func NewPostRepository(db *mongo.Database) PostRepository {
	return &postRepository{
		collection: db.Collection("posts"),
	}
}

func (r *postRepository) CreatePost(ctx context.Context, post *domain.Post) error {
	post.CreatedAt = time.Now()
	post.UpdatedAt = time.Now()
	post.Likes = 0
	post.LikedBy = []primitive.ObjectID{}
	post.Comments = []domain.Comment{}

	_, err := r.collection.InsertOne(ctx, post)
	return err
}

func (r *postRepository) GetPostByID(ctx context.Context, postID primitive.ObjectID) (*domain.Post, error) {
	var post domain.Post
	err := r.collection.FindOne(ctx, bson.M{"_id": postID}).Decode(&post)
	if err != nil {
		return nil, err
	}
	return &post, nil
}

func (r *postRepository) UpdatePost(ctx context.Context, postID primitive.ObjectID, updates bson.M) error {
	updates["updated_at"] = time.Now()
	_, err := r.collection.UpdateOne(ctx, bson.M{"_id": postID}, bson.M{"$set": updates})
	return err
}

func (r *postRepository) DeletePost(ctx context.Context, postID primitive.ObjectID) error {
	_, err := r.collection.DeleteOne(ctx, bson.M{"_id": postID})
	return err
}

func (r *postRepository) GetPosts(ctx context.Context, page, limit int) ([]*domain.Post, int64, error) {
	skip := (page - 1) * limit

	findOptions := options.Find().
		SetSkip(int64(skip)).
		SetLimit(int64(limit)).
		SetSort(bson.M{"created_at": -1})

	cursor, err := r.collection.Find(ctx, bson.M{}, findOptions)
	if err != nil {
		return nil, 0, err
	}
	defer cursor.Close(ctx)

	var posts []*domain.Post
	if err = cursor.All(ctx, &posts); err != nil {
		return nil, 0, err
	}

	total, err := r.collection.CountDocuments(ctx, bson.M{})
	if err != nil {
		return nil, 0, err
	}

	return posts, total, nil
}

func (r *postRepository) GetMyPosts(ctx context.Context, authorID primitive.ObjectID, page, limit int) ([]*domain.Post, int64, error) {
	skip := (page - 1) * limit

	findOptions := options.Find().
		SetSkip(int64(skip)).
		SetLimit(int64(limit)).
		SetSort(bson.M{"created_at": -1})

	cursor, err := r.collection.Find(ctx, bson.M{"author_id": authorID}, findOptions)
	if err != nil {
		return nil, 0, err
	}
	defer cursor.Close(ctx)

	var posts []*domain.Post
	if err = cursor.All(ctx, &posts); err != nil {
		return nil, 0, err
	}

	total, err := r.collection.CountDocuments(ctx, bson.M{"author_id": authorID})
	if err != nil {
		return nil, 0, err
	}

	return posts, total, nil
}

func (r *postRepository) GetPostsNearLocation(ctx context.Context, lat, lng, radius float64, page, limit int) ([]*domain.Post, int64, error) {
	skip := (page - 1) * limit

	// Convert radius from meters to degrees (approximate)
	radiusInDegrees := radius / 111320.0

	// Create geospatial query
	filter := bson.M{
		"location": bson.M{
			"$near": bson.M{
				"$geometry": bson.M{
					"type":        "Point",
					"coordinates": []float64{lng, lat},
				},
				"$maxDistance": radius,
			},
		},
	}

	findOptions := options.Find().
		SetSkip(int64(skip)).
		SetLimit(int64(limit)).
		SetSort(bson.M{"created_at": -1})

	cursor, err := r.collection.Find(ctx, filter, findOptions)
	if err != nil {
		// If geospatial query fails (e.g., no index), fall back to coordinate-based filter
		return r.getPostsByCoordinateRange(ctx, lat, lng, radiusInDegrees, page, limit)
	}
	defer cursor.Close(ctx)

	var posts []*domain.Post
	if err = cursor.All(ctx, &posts); err != nil {
		return nil, 0, err
	}

	total, err := r.collection.CountDocuments(ctx, filter)
	if err != nil {
		return nil, 0, err
	}

	return posts, total, nil
}

func (r *postRepository) getPostsByCoordinateRange(ctx context.Context, lat, lng, radiusInDegrees float64, page, limit int) ([]*domain.Post, int64, error) {
	skip := (page - 1) * limit

	filter := bson.M{
		"location.lat": bson.M{"$gte": lat - radiusInDegrees, "$lte": lat + radiusInDegrees},
		"location.lng": bson.M{"$gte": lng - radiusInDegrees, "$lte": lng + radiusInDegrees},
	}

	findOptions := options.Find().
		SetSkip(int64(skip)).
		SetLimit(int64(limit)).
		SetSort(bson.M{"created_at": -1})

	cursor, err := r.collection.Find(ctx, filter, findOptions)
	if err != nil {
		return nil, 0, err
	}
	defer cursor.Close(ctx)

	var posts []*domain.Post
	if err = cursor.All(ctx, &posts); err != nil {
		return nil, 0, err
	}

	// Filter posts by actual distance
	var filteredPosts []*domain.Post
	for _, post := range posts {
		if post.Location != nil {
			distance := calculateDistance(lat, lng, post.Location.Lat, post.Location.Lng)
			if distance <= radiusInDegrees*111320 { // Convert back to meters for comparison
				filteredPosts = append(filteredPosts, post)
			}
		}
	}

	total := int64(len(filteredPosts))
	return filteredPosts, total, nil
}

func calculateDistance(lat1, lng1, lat2, lng2 float64) float64 {
	const earthRadius = 6371000 // meters

	lat1Rad := lat1 * math.Pi / 180
	lat2Rad := lat2 * math.Pi / 180
	deltaLat := (lat2 - lat1) * math.Pi / 180
	deltaLng := (lng2 - lng1) * math.Pi / 180

	a := math.Sin(deltaLat/2)*math.Sin(deltaLat/2) +
		math.Cos(lat1Rad)*math.Cos(lat2Rad)*
			math.Sin(deltaLng/2)*math.Sin(deltaLng/2)
	c := 2 * math.Atan2(math.Sqrt(a), math.Sqrt(1-a))

	return earthRadius * c
}

func (r *postRepository) LikePost(ctx context.Context, postID, userID primitive.ObjectID) error {
	filter := bson.M{"_id": postID}
	update := bson.M{
		"$addToSet": bson.M{"liked_by": userID},
		"$inc":    bson.M{"likes": 1},
	}
	_, err := r.collection.UpdateOne(ctx, filter, update)
	return err
}

func (r *postRepository) UnlikePost(ctx context.Context, postID, userID primitive.ObjectID) error {
	filter := bson.M{"_id": postID}
	update := bson.M{
		"$pull": bson.M{"liked_by": userID},
		"$inc":  bson.M{"likes": -1},
	}
	_, err := r.collection.UpdateOne(ctx, filter, update)
	return err
}

func (r *postRepository) IsPostLikedByUser(ctx context.Context, postID, userID primitive.ObjectID) (bool, error) {
	filter := bson.M{
		"_id":      postID,
		"liked_by": userID,
	}
	count, err := r.collection.CountDocuments(ctx, filter)
	if err != nil {
		return false, err
	}
	return count > 0, nil
}
