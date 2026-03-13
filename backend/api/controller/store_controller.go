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

type StoreController interface {
	CreateStore(c *gin.Context)
	GetStoreByID(c *gin.Context)
	UpdateStore(c *gin.Context)
	DeleteStore(c *gin.Context)
	SearchStores(c *gin.Context)
	GetMyStores(c *gin.Context)
}

type storeController struct {
	storeUsecase usecase.StoreUsecase
	validator    *validator.Validate
}

func NewStoreController(storeUsecase usecase.StoreUsecase) StoreController {
	return &storeController{
		storeUsecase: storeUsecase,
		validator:    validator.New(),
	}
}

func (sc *storeController) CreateStore(c *gin.Context) {
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

	var req domain.CreateStoreRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, domain.NewErrorResponse("VALIDATION_ERROR", "Invalid request format", err.Error()))
		return
	}

	if err := sc.validator.Struct(&req); err != nil {
		c.JSON(http.StatusBadRequest, domain.NewErrorResponse("VALIDATION_ERROR", "Validation failed", err.Error()))
		return
	}

	response, err := sc.storeUsecase.CreateStore(c.Request.Context(), &req, userID)
	if err != nil {
		c.JSON(http.StatusBadRequest, domain.NewErrorResponse("CREATE_ERROR", "Failed to create store", err.Error()))
		return
	}

	c.JSON(http.StatusCreated, domain.NewSuccessResponse("Store created successfully", response))
}

func (sc *storeController) GetStoreByID(c *gin.Context) {
	storeIDStr := c.Param("id")
	storeID, err := primitive.ObjectIDFromHex(storeIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, domain.NewErrorResponse("INVALID_STORE_ID", "Invalid store ID", nil))
		return
	}

	response, err := sc.storeUsecase.GetStoreByID(c.Request.Context(), storeID)
	if err != nil {
		c.JSON(http.StatusNotFound, domain.NewErrorResponse("STORE_NOT_FOUND", "Store not found", err.Error()))
		return
	}

	c.JSON(http.StatusOK, domain.NewSuccessResponse("Store retrieved successfully", response))
}

func (sc *storeController) UpdateStore(c *gin.Context) {
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

	storeIDStr := c.Param("id")
	storeID, err := primitive.ObjectIDFromHex(storeIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, domain.NewErrorResponse("INVALID_STORE_ID", "Invalid store ID", nil))
		return
	}

	var req domain.UpdateStoreRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, domain.NewErrorResponse("VALIDATION_ERROR", "Invalid request format", err.Error()))
		return
	}

	if err := sc.validator.Struct(&req); err != nil {
		c.JSON(http.StatusBadRequest, domain.NewErrorResponse("VALIDATION_ERROR", "Validation failed", err.Error()))
		return
	}

	response, err := sc.storeUsecase.UpdateStore(c.Request.Context(), storeID, userID, &req)
	if err != nil {
		c.JSON(http.StatusBadRequest, domain.NewErrorResponse("UPDATE_ERROR", "Failed to update store", err.Error()))
		return
	}

	c.JSON(http.StatusOK, domain.NewSuccessResponse("Store updated successfully", response))
}

func (sc *storeController) DeleteStore(c *gin.Context) {
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

	storeIDStr := c.Param("id")
	storeID, err := primitive.ObjectIDFromHex(storeIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, domain.NewErrorResponse("INVALID_STORE_ID", "Invalid store ID", nil))
		return
	}

	err = sc.storeUsecase.DeleteStore(c.Request.Context(), storeID, userID)
	if err != nil {
		c.JSON(http.StatusBadRequest, domain.NewErrorResponse("DELETE_ERROR", "Failed to delete store", err.Error()))
		return
	}

	c.JSON(http.StatusOK, domain.NewSuccessResponse("Store deleted successfully", nil))
}

func (sc *storeController) SearchStores(c *gin.Context) {
	var req domain.StoreSearchRequest
	
	// Bind query parameters
	req.Query = c.Query("query")
	req.Category = c.Query("category")
	req.City = c.Query("city")
	req.Lat, _ = strconv.ParseFloat(c.Query("lat"), 64)
	req.Lng, _ = strconv.ParseFloat(c.Query("lng"), 64)
	req.Radius, _ = strconv.ParseFloat(c.Query("radius"), 64)
	req.Page, _ = strconv.Atoi(c.DefaultQuery("page", "1"))
	req.Limit, _ = strconv.Atoi(c.DefaultQuery("limit", "10"))

	if req.Page < 1 {
		req.Page = 1
	}
	if req.Limit < 1 || req.Limit > 50 {
		req.Limit = 10
	}

	stores, total, err := sc.storeUsecase.SearchStores(c.Request.Context(), &req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, domain.NewErrorResponse("SEARCH_ERROR", "Failed to search stores", err.Error()))
		return
	}

	response := domain.NewPaginationResponse(req.Page, req.Limit, total, stores)
	c.JSON(http.StatusOK, domain.NewSuccessResponse("Stores retrieved successfully", response))
}

func (sc *storeController) GetMyStores(c *gin.Context) {
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

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))

	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 50 {
		limit = 10
	}

	stores, total, err := sc.storeUsecase.GetMyStores(c.Request.Context(), userID, page, limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, domain.NewErrorResponse("GET_ERROR", "Failed to get stores", err.Error()))
		return
	}

	response := domain.NewPaginationResponse(page, limit, total, stores)
	c.JSON(http.StatusOK, domain.NewSuccessResponse("Stores retrieved successfully", response))
}
