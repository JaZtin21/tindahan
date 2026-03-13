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

type UserRepository interface {
	CreateUser(ctx context.Context, user *domain.User) error
	GetUserByEmail(ctx context.Context, email string) (*domain.User, error)
	GetUserByID(ctx context.Context, userID primitive.ObjectID) (*domain.User, error)
	UpdateUser(ctx context.Context, userID primitive.ObjectID, updates *domain.UpdateUserRequest) error
	GetAllUsers(ctx context.Context, page, limit int) ([]*domain.User, int64, error)
	UpdateUserStatus(ctx context.Context, userID primitive.ObjectID, isActive bool) error
}

type userRepository struct {
	collection *mongo.Collection
}

func NewUserRepository(db *mongo.Database) UserRepository {
	return &userRepository{
		collection: db.Collection("users"),
	}
}

func (r *userRepository) CreateUser(ctx context.Context, user *domain.User) error {
	user.CreatedAt = time.Now()
	user.UpdatedAt = time.Now()
	
	_, err := r.collection.InsertOne(ctx, user)
	return err
}

func (r *userRepository) GetUserByEmail(ctx context.Context, email string) (*domain.User, error) {
	var user domain.User
	err := r.collection.FindOne(ctx, bson.M{"email": email}).Decode(&user)
	if err != nil {
		return nil, err
	}
	return &user, nil
}

func (r *userRepository) GetUserByID(ctx context.Context, userID primitive.ObjectID) (*domain.User, error) {
	var user domain.User
	err := r.collection.FindOne(ctx, bson.M{"_id": userID}).Decode(&user)
	if err != nil {
		return nil, err
	}
	return &user, nil
}

func (r *userRepository) UpdateUser(ctx context.Context, userID primitive.ObjectID, updates *domain.UpdateUserRequest) error {
	updateDoc := bson.M{}
	
	if updates.FirstName != nil {
		updateDoc["first_name"] = *updates.FirstName
	}
	if updates.LastName != nil {
		updateDoc["last_name"] = *updates.LastName
	}
	if updates.Phone != nil {
		updateDoc["phone"] = *updates.Phone
	}
	if updates.IsActive != nil {
		updateDoc["is_active"] = *updates.IsActive
	}
	
	updateDoc["updated_at"] = time.Now()
	
	_, err := r.collection.UpdateOne(
		ctx,
		bson.M{"_id": userID},
		bson.M{"$set": updateDoc},
	)
	return err
}

func (r *userRepository) GetAllUsers(ctx context.Context, page, limit int) ([]*domain.User, int64, error) {
	skip := (page - 1) * limit
	
	cursor, err := r.collection.Find(
		ctx,
		bson.M{},
		options.Find().SetSkip(int64(skip)).SetLimit(int64(limit)).SetSort(bson.M{"created_at": -1}),
	)
	if err != nil {
		return nil, 0, err
	}
	defer cursor.Close(ctx)

	var users []*domain.User
	for cursor.Next(ctx) {
		var user domain.User
		if err := cursor.Decode(&user); err != nil {
			return nil, 0, err
		}
		users = append(users, &user)
	}

	total, err := r.collection.CountDocuments(ctx, bson.M{})
	if err != nil {
		return nil, 0, err
	}

	return users, total, nil
}

func (r *userRepository) UpdateUserStatus(ctx context.Context, userID primitive.ObjectID, isActive bool) error {
	_, err := r.collection.UpdateOne(
		ctx,
		bson.M{"_id": userID},
		bson.M{
			"$set": bson.M{
				"is_active":  isActive,
				"updated_at": time.Now(),
			},
		},
	)
	return err
}
