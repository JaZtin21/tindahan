package mongo

import (
	"context"
	"fmt"
	"log"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

func ConnectDB(uri, dbName string) (*mongo.Database, error) {
	var client *mongo.Client
	var err error
	maxRetries := 5

	for i := 1; i <= maxRetries; i++ {
		// 1. Create a clean context for this entire attempt iteration
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)

		log.Printf("Connecting to MongoDB (Attempt %d/%d)...", i, maxRetries)
		client, err = mongo.Connect(ctx, options.Client().ApplyURI(uri))

		if err == nil {
			err = client.Ping(ctx, nil)
		}

		if err == nil {
			log.Println("Connected to MongoDB successfully!")
			db := client.Database(dbName)

			// 2. This runs perfectly now because ctx is STILL active and alive!
			if err := createGeospatialIndex(ctx, db); err != nil {
				log.Printf("Warning: Failed to create geospatial index: %v", err)
			}

			cancel() // Clean up context resources right before returning success
			return db, nil
		}

		log.Printf("MongoDB connection attempt %d failed: %v", i, err)
		
		cancel() // 3. Clean up the context for THIS attempt before moving to the next loop iteration

		if i < maxRetries {
			time.Sleep(2 * time.Second)
		}
	}

	// If all attempts failed, return the final error to let the app handle the failure
	return nil, fmt.Errorf("could not connect to MongoDB after %d attempts: %w", maxRetries, err)
}

func createGeospatialIndex(ctx context.Context, db *mongo.Database) error {
	storesCollection := db.Collection("stores")

	// Check if index already exists
	cursor, err := storesCollection.Indexes().List(ctx)
	if err != nil {
		return err
	}
	defer cursor.Close(ctx)

	indexExists := false
	for cursor.Next(ctx) {
		var index bson.M
		if err := cursor.Decode(&index); err != nil {
			continue
		}
		if name, ok := index["name"].(string); ok && name == "location_2dsphere" {
			indexExists = true
			break
		}
	}

	if indexExists {
		log.Println("Geospatial index already exists on stores collection")
		return nil
	}

	// Create 2dsphere index on location field
	indexModel := mongo.IndexModel{
		Keys:    bson.M{"location": "2dsphere"},
		Options: options.Index().SetName("location_2dsphere"),
	}

	_, err = storesCollection.Indexes().CreateOne(ctx, indexModel)
	if err != nil {
		return err
	}

	log.Println("Created geospatial index on stores collection")
	return nil
}
