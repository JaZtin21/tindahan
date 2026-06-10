package main

import (
	"context"
	"log"
	"os"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

func main() {
	// Get MongoDB connection string from environment
	mongoURI := os.Getenv("MONGODB_URI")
	if mongoURI == "" {
		mongoURI = "mongodb://localhost:27017"
	}

	dbName := os.Getenv("DB_NAME")
	if dbName == "" {
		dbName = "tindahan_db"
	}

	// Connect to MongoDB
	client, err := mongo.Connect(context.Background(), options.Client().ApplyURI(mongoURI))
	if err != nil {
		log.Fatalf("Failed to connect to MongoDB: %v", err)
	}
	defer client.Disconnect(context.Background())

	db := client.Database(dbName)
	storesCollection := db.Collection("stores")

	// Create geospatial index
	indexModel := mongo.IndexModel{
		Keys:    bson.M{"location": "2dsphere"},
		Options: options.Index().SetName("location_2dsphere"),
	}

	_, err = storesCollection.Indexes().CreateOne(context.Background(), indexModel)
	if err != nil {
		log.Printf("Warning: Failed to create geospatial index: %v", err)
	} else {
		log.Println("Created geospatial index on stores collection")
	}

	// Migrate existing stores to have location field
	cursor, err := storesCollection.Find(context.Background(), bson.M{
		"latitude":  bson.M{"$ne": 0},
		"longitude": bson.M{"$ne": 0},
		"location":  bson.M{"$exists": false},
	})
	if err != nil {
		log.Fatalf("Failed to find stores: %v", err)
	}
	defer cursor.Close(context.Background())

	var stores []bson.M
	if err := cursor.All(context.Background(), &stores); err != nil {
		log.Fatalf("Failed to decode stores: %v", err)
	}

	log.Printf("Found %d stores to migrate", len(stores))

	for _, store := range stores {
		lat, ok1 := store["latitude"].(float64)
		lng, ok2 := store["longitude"].(float64)
		id, ok3 := store["_id"]

		if !ok1 || !ok2 || !ok3 {
			log.Printf("Skipping store with invalid data: %v", store["_id"])
			continue
		}

		if lat == 0 || lng == 0 {
			log.Printf("Skipping store with zero coordinates: %v", store["_id"])
			continue
		}

		location := bson.M{
			"type":        "Point",
			"coordinates": []float64{lng, lat}, // GeoJSON uses [longitude, latitude]
		}

		_, err := storesCollection.UpdateOne(
			context.Background(),
			bson.M{"_id": id},
			bson.M{"$set": bson.M{"location": location}},
		)
		if err != nil {
			log.Printf("Failed to update store %v: %v", id, err)
		} else {
			log.Printf("Migrated store %v", id)
		}
	}

	log.Println("Migration completed")
}
