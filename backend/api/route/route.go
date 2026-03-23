package route

import (
	"tindahan-backend/bootstrap"
	"tindahan-backend/graphql"

	"github.com/99designs/gqlgen/graphql/handler"
	"github.com/99designs/gqlgen/graphql/playground"
	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

func Setup(router *gin.Engine, app *bootstrap.Application) {
	// CORS middleware
	router.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"*"},
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Accept", "Authorization"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
	}))

	// Initialize GraphQL setup
	graphqlConfig := graphql.Config{
		Resolvers: graphql.NewResolver(),
	}

	graphqlHandler := handler.NewDefaultServer(graphql.NewExecutableSchema(graphqlConfig))

	// Health check
	router.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"status":  "ok",
			"message": "Tindahan API is running",
		})
	})

	// GraphQL endpoints - separate playground from GraphQL endpoint
	playgroundHandler := playground.Handler("GraphQL Playground", "/query")
	router.GET("/playground", gin.WrapH(playgroundHandler))
	router.POST("/query", gin.WrapH(graphqlHandler))
}
