package main

import (
	"context"
	"log"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

func main() {
	// STRICT HARDCODED LOCAL VALUES ONLY
	mongoURI := "mongodb://admin:password@127.0.0.1:27017/tindahan_db?authSource=admin&replicaSet=rs0&directConnection=true"
	dbName := "tindahan_db"

	log.Printf("Running migration strictly on LOCAL database: %s", dbName)

	// Force driver to ignore any replica set discovery redirects
	clientOpts := options.Client().ApplyURI(mongoURI).SetDirect(true)

	client, err := mongo.Connect(context.Background(), clientOpts)
	if err != nil {
		log.Fatalf("Failed to connect to MongoDB: %v", err)
	}
	defer client.Disconnect(context.Background())

	// Force connection test immediately
	err = client.Ping(context.Background(), nil)
	if err != nil {
		log.Fatalf("Database check failed. Is your local Docker container running? Error: %v", err)
	}

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
			"coordinates": []float64{lng, lat},
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

	log.Println("Migration completed successfully!")
}
