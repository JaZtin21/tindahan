package controller

import (
	"net/http"
	"strconv"

	"tindahan-backend/domain"
	"tindahan-backend/usecase"

	"github.com/gin-gonic/gin"
	"github.com/go-playground/validator/v10"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

type ProductController interface {
	CreateProduct(c *gin.Context)
	GetProductByID(c *gin.Context)
	UpdateProduct(c *gin.Context)
	DeleteProduct(c *gin.Context)
	SearchProducts(c *gin.Context)
	GetMyProducts(c *gin.Context)
}

type productController struct {
	productUsecase usecase.ProductUsecase
	validator      *validator.Validate
}

func NewProductController(productUsecase usecase.ProductUsecase) ProductController {
	return &productController{
		productUsecase: productUsecase,
		validator:      validator.New(),
	}
}

func (pc *productController) CreateProduct(c *gin.Context) {
	var req domain.CreateProductRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, domain.NewErrorResponse("VALIDATION_ERROR", "Invalid request format", err.Error()))
		return
	}

	if err := pc.validator.Struct(&req); err != nil {
		c.JSON(http.StatusBadRequest, domain.NewErrorResponse("VALIDATION_ERROR", "Validation failed", err.Error()))
		return
	}

	storeID, err := primitive.ObjectIDFromHex(req.StoreID)
	if err != nil {
		c.JSON(http.StatusBadRequest, domain.NewErrorResponse("INVALID_STORE_ID", "Invalid store ID", nil))
		return
	}

	response, err := pc.productUsecase.CreateProduct(c.Request.Context(), &req, storeID)
	if err != nil {
		c.JSON(http.StatusBadRequest, domain.NewErrorResponse("CREATE_ERROR", "Failed to create product", err.Error()))
		return
	}

	c.JSON(http.StatusCreated, domain.NewSuccessResponse("Product created successfully", response))
}

func (pc *productController) GetProductByID(c *gin.Context) {
	productIDStr := c.Param("id")
	productID, err := primitive.ObjectIDFromHex(productIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, domain.NewErrorResponse("INVALID_PRODUCT_ID", "Invalid product ID", nil))
		return
	}

	response, err := pc.productUsecase.GetProductByID(c.Request.Context(), productID)
	if err != nil {
		c.JSON(http.StatusNotFound, domain.NewErrorResponse("PRODUCT_NOT_FOUND", "Product not found", err.Error()))
		return
	}

	c.JSON(http.StatusOK, domain.NewSuccessResponse("Product retrieved successfully", response))
}

func (pc *productController) UpdateProduct(c *gin.Context) {
	userIDStr, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, domain.NewErrorResponse("UNAUTHORIZED", "User not authenticated", nil))
		return
	}

	userID, err := primitive.ObjectIDFromHex(userIDStr.(string))
	if err != nil {
		c.JSON(http.StatusBadRequest, domain.NewErrorResponse("INVALID_USER_ID", "Invalid user ID", nil))
		return
	}

	productIDStr := c.Param("id")
	productID, err := primitive.ObjectIDFromHex(productIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, domain.NewErrorResponse("INVALID_PRODUCT_ID", "Invalid product ID", nil))
		return
	}

	var req domain.UpdateProductRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, domain.NewErrorResponse("VALIDATION_ERROR", "Invalid request format", err.Error()))
		return
	}

	if err := pc.validator.Struct(&req); err != nil {
		c.JSON(http.StatusBadRequest, domain.NewErrorResponse("VALIDATION_ERROR", "Validation failed", err.Error()))
		return
	}

	response, err := pc.productUsecase.UpdateProduct(c.Request.Context(), productID, userID, &req)
	if err != nil {
		c.JSON(http.StatusBadRequest, domain.NewErrorResponse("UPDATE_ERROR", "Failed to update product", err.Error()))
		return
	}

	c.JSON(http.StatusOK, domain.NewSuccessResponse("Product updated successfully", response))
}

func (pc *productController) DeleteProduct(c *gin.Context) {
	userIDStr, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, domain.NewErrorResponse("UNAUTHORIZED", "User not authenticated", nil))
		return
	}

	userID, err := primitive.ObjectIDFromHex(userIDStr.(string))
	if err != nil {
		c.JSON(http.StatusBadRequest, domain.NewErrorResponse("INVALID_USER_ID", "Invalid user ID", nil))
		return
	}

	productIDStr := c.Param("id")
	productID, err := primitive.ObjectIDFromHex(productIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, domain.NewErrorResponse("INVALID_PRODUCT_ID", "Invalid product ID", nil))
		return
	}

	err = pc.productUsecase.DeleteProduct(c.Request.Context(), productID, userID)
	if err != nil {
		c.JSON(http.StatusBadRequest, domain.NewErrorResponse("DELETE_ERROR", "Failed to delete product", err.Error()))
		return
	}

	c.JSON(http.StatusOK, domain.NewSuccessResponse("Product deleted successfully", nil))
}

func (pc *productController) SearchProducts(c *gin.Context) {
	var req domain.ProductSearchRequest
	
	// Bind query parameters
	req.Query = c.Query("query")
	req.Category = c.Query("category")
	req.StoreID = c.Query("store_id")
	req.MinPrice, _ = strconv.ParseFloat(c.Query("min_price"), 64)
	req.MaxPrice, _ = strconv.ParseFloat(c.Query("max_price"), 64)
	req.InStock = c.Query("in_stock") == "true"
	req.Page, _ = strconv.Atoi(c.DefaultQuery("page", "1"))
	req.Limit, _ = strconv.Atoi(c.DefaultQuery("limit", "10"))

	if req.Page < 1 {
		req.Page = 1
	}
	if req.Limit < 1 || req.Limit > 50 {
		req.Limit = 10
	}

	products, total, err := pc.productUsecase.SearchProducts(c.Request.Context(), &req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, domain.NewErrorResponse("SEARCH_ERROR", "Failed to search products", err.Error()))
		return
	}

	response := domain.NewPaginationResponse(req.Page, req.Limit, total, products)
	c.JSON(http.StatusOK, domain.NewSuccessResponse("Products retrieved successfully", response))
}

func (pc *productController) GetMyProducts(c *gin.Context) {
	// Get store ID from query parameter
	storeIDStr := c.Query("store_id")
	if storeIDStr == "" {
		c.JSON(http.StatusBadRequest, domain.NewErrorResponse("MISSING_STORE_ID", "Store ID is required", nil))
		return
	}

	storeID, err := primitive.ObjectIDFromHex(storeIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, domain.NewErrorResponse("INVALID_STORE_ID", "Invalid store ID", nil))
		return
	}

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))

	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 50 {
		limit = 10
	}

	products, total, err := pc.productUsecase.GetMyProducts(c.Request.Context(), storeID, page, limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, domain.NewErrorResponse("GET_ERROR", "Failed to get products", err.Error()))
		return
	}

	response := domain.NewPaginationResponse(page, limit, total, products)
	c.JSON(http.StatusOK, domain.NewSuccessResponse("Products retrieved successfully", response))
}
