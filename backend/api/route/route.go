package route

import (
	"net/http"
	"tindahan-backend/api/handlers/middleware"
	"tindahan-backend/bootstrap"
	"tindahan-backend/graphql"

	"github.com/99designs/gqlgen/graphql/handler"
	"github.com/99designs/gqlgen/graphql/handler/transport"
	"github.com/99designs/gqlgen/graphql/playground"
	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
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
		Resolvers: graphql.NewResolver(app.MongoDatabase, app.Env.JWTSecret),
	}

	// Create GraphQL server with WebSocket support for subscriptions
	execSchema := graphql.NewExecutableSchema(graphqlConfig)
	graphqlHandler := handler.New(execSchema)

	// Add WebSocket transport for subscriptions (no auth required - public)
	graphqlHandler.AddTransport(transport.Websocket{
		KeepAlivePingInterval: 0,
		Upgrader: websocket.Upgrader{
			CheckOrigin: func(r *http.Request) bool {
				return true // Allow all origins
			},
			ReadBufferSize:  1024,
			WriteBufferSize: 1024,
		},
	})
	// Add standard HTTP transports
	graphqlHandler.AddTransport(transport.Options{})
	graphqlHandler.AddTransport(transport.GET{})
	graphqlHandler.AddTransport(transport.POST{})
	graphqlHandler.AddTransport(transport.MultipartForm{})

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

	// GraphQL endpoint handler - auth required for both WebSocket (subscriptions) and HTTP (queries/mutations)
	graphqlEndpointHandler := func(c *gin.Context) {
		// Check if it's a WebSocket upgrade request
		isWebSocket := c.GetHeader("Upgrade") == "websocket"

		// Apply auth middleware for both WebSocket and HTTP
		middleware.AuthMiddleware(app.Env.JWTSecret)(c)
		if c.IsAborted() {
			return
		}

		// Serve GraphQL (WebSocket or HTTP)
		if isWebSocket {
			graphqlHandler.ServeHTTP(c.Writer, c.Request)
		} else {
			graphqlHandler.ServeHTTP(c.Writer, c.Request)
		}
	}

	// Register for both GET and POST (GraphQL supports both)
	router.GET("/query", graphqlEndpointHandler)
	router.POST("/query", graphqlEndpointHandler)
}
