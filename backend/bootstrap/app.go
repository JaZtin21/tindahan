package bootstrap

import (
	"log"
	mongoRepo "tindahan-backend/mongo"

	"go.mongodb.org/mongo-driver/mongo"
)

type Application struct {
	Env          *Env
	MongoDatabase *mongo.Database
}

func App() *Application {
	env := LoadEnv()
	
	// Connect to MongoDB
	db, err := mongoRepo.ConnectDB(env.MongoURI, env.MongoDBName)
	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}

	return &Application{
		Env:          env,
		MongoDatabase: db,
	}
}
