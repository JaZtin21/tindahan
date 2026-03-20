package route

import (
	"tindahan-backend/api/controller"
	"tindahan-backend/api/middleware"
	"tindahan-backend/bootstrap"
	"tindahan-backend/repository"
	"tindahan-backend/usecase"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

func Setup(router *gin.Engine, app *bootstrap.Application) {
	// CORS middleware
	router.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"http://localhost:3000", "http://localhost:5173"},
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
	}))

	// Initialize repositories
	userRepository := repository.NewUserRepository(app.MongoDatabase)
	storeRepository := repository.NewStoreRepository(app.MongoDatabase)
	productRepository := repository.NewProductRepository(app.MongoDatabase)

	// Initialize use cases
	userUsecase := usecase.NewUserUsecase(userRepository, app.Env.JWTSecret)
	storeUsecase := usecase.NewStoreUsecase(storeRepository)
	productUsecase := usecase.NewProductUsecase(productRepository, storeRepository)

	// Initialize controllers
	userController := controller.NewUserController(userUsecase)
	storeController := controller.NewStoreController(storeUsecase)
	productController := controller.NewProductController(productUsecase)

	// API version
	v1 := router.Group("/api/v1")
	{
		// Public routes
		authGroup := v1.Group("/auth")
		{
			authGroup.POST("/signup", userController.Signup)
			authGroup.POST("/login", userController.Login)
			authGroup.POST("/refresh", userController.RefreshToken)
		}

		// Public store search
		v1.GET("/stores", storeController.SearchStores)
		v1.GET("/stores/:id", storeController.GetStoreByID)

		// Public product search
		v1.GET("/products", productController.SearchProducts)
		v1.GET("/products/:id", productController.GetProductByID)

		// Protected routes
		protected := v1.Group("")
		protected.Use(middleware.JWTAuthMiddleware(app))
		{
			// User routes
			userGroup := protected.Group("/user")
			{
				userGroup.GET("/profile", userController.GetProfile)
				userGroup.PUT("/profile", userController.UpdateProfile)
			}

			// Owner-specific routes
			ownerGroup := protected.Group("/owner")
			ownerGroup.Use(middleware.RequireRole("owner", "admin"))
			{
				// Shop management
				ownerGroup.POST("/shops", storeController.CreateStore)
				ownerGroup.PUT("/shops/:id", storeController.UpdateStore, middleware.StoreOwnerMiddleware(app))
				ownerGroup.DELETE("/shops/:id", storeController.DeleteStore, middleware.StoreOwnerMiddleware(app))
				ownerGroup.GET("/shops", storeController.GetMyStores)
				ownerGroup.GET("/shops/:id", storeController.GetStoreByID, middleware.StoreOwnerMiddleware(app))

				// Product management
				productGroup := ownerGroup.Group("/products")
				{
					productGroup.POST("", productController.CreateProduct)
					productGroup.PUT("/:id", productController.UpdateProduct, middleware.ProductOwnerMiddleware(app))
					productGroup.DELETE("/:id", productController.DeleteProduct, middleware.ProductOwnerMiddleware(app))
					productGroup.GET("", productController.GetMyProducts)
					productGroup.GET("/:id", productController.GetProductByID, middleware.ProductOwnerMiddleware(app))
				}

				// Owner profile management
				ownerGroup.GET("/profile", userController.GetProfile)
				ownerGroup.PUT("/profile", userController.UpdateProfile)
			}

			// Store owner routes (legacy - kept for compatibility)
			storeOwnerGroup := protected.Group("")
			storeOwnerGroup.Use(middleware.RequireRole("owner", "admin"))
			{
				// Store management
				storeOwnerGroup.POST("/stores", storeController.CreateStore)
				storeOwnerGroup.PUT("/stores/:id", storeController.UpdateStore)
				storeOwnerGroup.DELETE("/stores/:id", storeController.DeleteStore)
				storeOwnerGroup.GET("/my-stores", storeController.GetMyStores)

				// Product management
				productOwnerGroup := storeOwnerGroup.Group("/products")
				{
					productOwnerGroup.POST("", productController.CreateProduct)
					productOwnerGroup.PUT("/:id", productController.UpdateProduct)
					productOwnerGroup.DELETE("/:id", productController.DeleteProduct)
					productOwnerGroup.GET("/my-products", productController.GetMyProducts)
				}
			}

			// Admin routes
			adminGroup := protected.Group("")
			adminGroup.Use(middleware.RequireRole("admin"))
			{
				adminGroup.GET("/users", userController.GetAllUsers)
				adminGroup.PUT("/users/:id/status", userController.UpdateUserStatus)
			}
		}
	}

	// Health check
	router.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"status":  "ok",
			"message": "Tindahan API is running",
		})
	})
}
