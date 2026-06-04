package mongo

import (
	"context"
	"log"
	"fmt" 
	"time"

	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

func ConnectDB(uri, dbName string) (*mongo.Database, error) {
	var client *mongo.Client
	var err error
	maxRetries := 5

	for i := 1; i <= maxRetries; i++ {
		// Use a short timeout for each individual connection attempt
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		
		log.Printf("Connecting to MongoDB (Attempt %d/%d)...", i, maxRetries)
		client, err = mongo.Connect(ctx, options.Client().ApplyURI(uri))
		
		if err == nil {
			// Always ping to confirm the connection is actually usable
			err = client.Ping(ctx, nil)
		}
		
		cancel() // Free context resources immediately

		if err == nil {
			log.Println("Connected to MongoDB successfully!")
			return client.Database(dbName), nil
		}

		log.Printf("MongoDB connection attempt %d failed: %v", i, err)
		
		// Wait 2 seconds before trying the next attempt (skip waiting on the last loop)
		if i < maxRetries {
			time.Sleep(2 * time.Second)
		}
	}

	// If all attempts failed, return the final error to let the app handle the failure
	return nil, fmt.Errorf("could not connect to MongoDB after %d attempts: %w", maxRetries, err)
}
