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

type ProductRepository interface {
	CreateProduct(ctx context.Context, product *domain.Product) error
	GetProductByID(ctx context.Context, productID primitive.ObjectID) (*domain.Product, error)
	UpdateProduct(ctx context.Context, productID primitive.ObjectID, updates *domain.UpdateProductRequest) error
	DeleteProduct(ctx context.Context, productID primitive.ObjectID) error
	SearchProducts(ctx context.Context, req *domain.ProductSearchRequest) ([]*domain.Product, int64, error)
	GetMyProducts(ctx context.Context, storeID primitive.ObjectID, page, limit int) ([]*domain.Product, int64, error)
}

type productRepository struct {
	collection *mongo.Collection
}

func NewProductRepository(db *mongo.Database) ProductRepository {
	return &productRepository{
		collection: db.Collection("products"),
	}
}

func (r *productRepository) CreateProduct(ctx context.Context, product *domain.Product) error {
	product.CreatedAt = time.Now()
	product.UpdatedAt = time.Now()
	product.IsActive = true
	
	_, err := r.collection.InsertOne(ctx, product)
	return err
}

func (r *productRepository) GetProductByID(ctx context.Context, productID primitive.ObjectID) (*domain.Product, error) {
	var product domain.Product
	err := r.collection.FindOne(ctx, bson.M{"_id": productID}).Decode(&product)
	if err != nil {
		return nil, err
	}
	return &product, nil
}

func (r *productRepository) UpdateProduct(ctx context.Context, productID primitive.ObjectID, updates *domain.UpdateProductRequest) error {
	updateDoc := bson.M{}
	
	if updates.Name != nil {
		updateDoc["name"] = *updates.Name
	}
	if updates.Description != nil {
		updateDoc["description"] = *updates.Description
	}
	if updates.Category != nil {
		updateDoc["category"] = *updates.Category
	}
	if updates.Price != nil {
		updateDoc["price"] = *updates.Price
	}
	if updates.ImageURL != nil {
		updateDoc["image_url"] = *updates.ImageURL
	}
	if updates.Stock != nil {
		updateDoc["stock"] = *updates.Stock
	}
	if updates.IsActive != nil {
		updateDoc["is_active"] = *updates.IsActive
	}
	
	updateDoc["updated_at"] = time.Now()
	
	_, err := r.collection.UpdateOne(
		ctx,
		bson.M{"_id": productID},
		bson.M{"$set": updateDoc},
	)
	return err
}

func (r *productRepository) DeleteProduct(ctx context.Context, productID primitive.ObjectID) error {
	_, err := r.collection.DeleteOne(ctx, bson.M{"_id": productID})
	return err
}

func (r *productRepository) SearchProducts(ctx context.Context, req *domain.ProductSearchRequest) ([]*domain.Product, int64, error) {
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
	
	// Store filter
	if req.StoreID != "" {
		storeID, err := primitive.ObjectIDFromHex(req.StoreID)
		if err == nil {
			filter["store_id"] = storeID
		}
	}
	
	// Price range filter
	if req.MinPrice > 0 || req.MaxPrice > 0 {
		priceFilter := bson.M{}
		if req.MinPrice > 0 {
			priceFilter["$gte"] = req.MinPrice
		}
		if req.MaxPrice > 0 {
			priceFilter["$lte"] = req.MaxPrice
		}
		filter["price"] = priceFilter
	}
	
	// Stock filter
	if req.InStock {
		filter["stock"] = bson.M{"$gt": 0}
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
		options.Find().SetSkip(int64(skip)).SetLimit(int64(req.Limit)).SetSort(bson.M{"created_at": -1}),
	)
	if err != nil {
		return nil, 0, err
	}
	defer cursor.Close(ctx)

	var products []*domain.Product
	for cursor.Next(ctx) {
		var product domain.Product
		if err := cursor.Decode(&product); err != nil {
			return nil, 0, err
		}
		products = append(products, &product)
	}

	total, err := r.collection.CountDocuments(ctx, filter)
	if err != nil {
		return nil, 0, err
	}

	return products, total, nil
}

func (r *productRepository) GetMyProducts(ctx context.Context, storeID primitive.ObjectID, page, limit int) ([]*domain.Product, int64, error) {
	if page <= 0 {
		page = 1
	}
	if limit <= 0 {
		limit = 10
	}
	
	skip := (page - 1) * limit
	
	cursor, err := r.collection.Find(
		ctx,
		bson.M{"store_id": storeID},
		options.Find().SetSkip(int64(skip)).SetLimit(int64(limit)).SetSort(bson.M{"created_at": -1}),
	)
	if err != nil {
		return nil, 0, err
	}
	defer cursor.Close(ctx)

	var products []*domain.Product
	for cursor.Next(ctx) {
		var product domain.Product
		if err := cursor.Decode(&product); err != nil {
			return nil, 0, err
		}
		products = append(products, &product)
	}

	total, err := r.collection.CountDocuments(ctx, bson.M{"store_id": storeID})
	if err != nil {
		return nil, 0, err
	}

	return products, total, nil
}
