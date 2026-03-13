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

type StoreRepository interface {
	CreateStore(ctx context.Context, store *domain.Store) error
	GetStoreByID(ctx context.Context, storeID primitive.ObjectID) (*domain.Store, error)
	UpdateStore(ctx context.Context, storeID primitive.ObjectID, updates *domain.UpdateStoreRequest) error
	DeleteStore(ctx context.Context, storeID primitive.ObjectID) error
	SearchStores(ctx context.Context, req *domain.StoreSearchRequest) ([]*domain.Store, int64, error)
	GetMyStores(ctx context.Context, ownerID primitive.ObjectID, page, limit int) ([]*domain.Store, int64, error)
}

type storeRepository struct {
	collection *mongo.Collection
}

func NewStoreRepository(db *mongo.Database) StoreRepository {
	return &storeRepository{
		collection: db.Collection("stores"),
	}
}

func (r *storeRepository) CreateStore(ctx context.Context, store *domain.Store) error {
	store.CreatedAt = time.Now()
	store.UpdatedAt = time.Now()
	store.IsActive = true
	store.Rating = 0.0
	
	_, err := r.collection.InsertOne(ctx, store)
	return err
}

func (r *storeRepository) GetStoreByID(ctx context.Context, storeID primitive.ObjectID) (*domain.Store, error) {
	var store domain.Store
	err := r.collection.FindOne(ctx, bson.M{"_id": storeID}).Decode(&store)
	if err != nil {
		return nil, err
	}
	return &store, nil
}

func (r *storeRepository) UpdateStore(ctx context.Context, storeID primitive.ObjectID, updates *domain.UpdateStoreRequest) error {
	updateDoc := bson.M{}
	
	if updates.Name != nil {
		updateDoc["name"] = *updates.Name
	}
	if updates.Description != nil {
		updateDoc["description"] = *updates.Description
	}
	if updates.Address != nil {
		updateDoc["address"] = *updates.Address
	}
	if updates.City != nil {
		updateDoc["city"] = *updates.City
	}
	if updates.Latitude != nil {
		updateDoc["latitude"] = *updates.Latitude
	}
	if updates.Longitude != nil {
		updateDoc["longitude"] = *updates.Longitude
	}
	if updates.Category != nil {
		updateDoc["category"] = *updates.Category
	}
	if updates.IsActive != nil {
		updateDoc["is_active"] = *updates.IsActive
	}
	
	updateDoc["updated_at"] = time.Now()
	
	_, err := r.collection.UpdateOne(
		ctx,
		bson.M{"_id": storeID},
		bson.M{"$set": updateDoc},
	)
	return err
}

func (r *storeRepository) DeleteStore(ctx context.Context, storeID primitive.ObjectID) error {
	_, err := r.collection.DeleteOne(ctx, bson.M{"_id": storeID})
	return err
}

func (r *storeRepository) SearchStores(ctx context.Context, req *domain.StoreSearchRequest) ([]*domain.Store, int64, error) {
	filter := bson.M{"is_active": true}
	
	// Text search
	if req.Query != "" {
		filter["$or"] = []bson.M{
			{"name": bson.M{"$regex": req.Query, "$options": "i"}},
			{"description": bson.M{"$regex": req.Query, "$options": "i"}},
			{"category": bson.M{"$regex": req.Query, "$options": "i"}},
		}
	}
	
	// Category filter
	if req.Category != "" {
		filter["category"] = req.Category
	}
	
	// City filter
	if req.City != "" {
		filter["city"] = req.City
	}
	
	// Location-based search
	if req.Lat != 0 && req.Lng != 0 && req.Radius > 0 {
		filter["location"] = bson.M{
			"$nearSphere": bson.M{
				"$geometry": bson.M{
					"type":        "Point",
					"coordinates": []float64{req.Lng, req.Lat},
				},
				"$maxDistance": req.Radius * 1000, // Convert km to meters
			},
		}
	}
	
	// Pagination
	if req.Page <= 0 {
		req.Page = 1
	}
	if req.Limit <= 0 {
		req.Limit = 10
	}
	
	skip := (req.Page - 1) * req.Limit
	
	cursor, err := r.collection.Find(
		ctx,
		filter,
		options.Find().SetSkip(int64(skip)).SetLimit(int64(req.Limit)).SetSort(bson.M{"rating": -1}),
	)
	if err != nil {
		return nil, 0, err
	}
	defer cursor.Close(ctx)

	var stores []*domain.Store
	for cursor.Next(ctx) {
		var store domain.Store
		if err := cursor.Decode(&store); err != nil {
			return nil, 0, err
		}
		stores = append(stores, &store)
	}

	total, err := r.collection.CountDocuments(ctx, filter)
	if err != nil {
		return nil, 0, err
	}

	return stores, total, nil
}

func (r *storeRepository) GetMyStores(ctx context.Context, ownerID primitive.ObjectID, page, limit int) ([]*domain.Store, int64, error) {
	if page <= 0 {
		page = 1
	}
	if limit <= 0 {
		limit = 10
	}
	
	skip := (page - 1) * limit
	
	cursor, err := r.collection.Find(
		ctx,
		bson.M{"owner_id": ownerID},
		options.Find().SetSkip(int64(skip)).SetLimit(int64(limit)).SetSort(bson.M{"created_at": -1}),
	)
	if err != nil {
		return nil, 0, err
	}
	defer cursor.Close(ctx)

	var stores []*domain.Store
	for cursor.Next(ctx) {
		var store domain.Store
		if err := cursor.Decode(&store); err != nil {
			return nil, 0, err
		}
		stores = append(stores, &store)
	}

	total, err := r.collection.CountDocuments(ctx, bson.M{"owner_id": ownerID})
	if err != nil {
		return nil, 0, err
	}

	return stores, total, nil
}
