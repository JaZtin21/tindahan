package bootstrap

import (
	"log"
	"os"

	"github.com/joho/godotenv"
)

type Env struct {
	ServerPort string
	MongoURI   string
	MongoDBName string
	JWTSecret  string
}

func LoadEnv() *Env {
	// Load .env file
	err := godotenv.Load()
	if err != nil {
		log.Println("Warning: .env file not found")
	}

	return &Env{
		ServerPort: getEnv("SERVER_PORT", "8080"),
		MongoURI:   getEnv("MONGO_URI", "mongodb://localhost:27017"),
		MongoDBName: getEnv("MONGO_DB_NAME", "tindahan_db"),
		JWTSecret:  getEnv("JWT_SECRET", "tindahan-secret-key"),
	}
}

func getEnv(key, defaultValue string) string {
	if value, exists := os.LookupEnv(key); exists {
		return value
	}
	return defaultValue
}
