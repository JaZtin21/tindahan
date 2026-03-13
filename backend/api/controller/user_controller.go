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

type UserController interface {
	Signup(c *gin.Context)
	Login(c *gin.Context)
	RefreshToken(c *gin.Context)
	GetProfile(c *gin.Context)
	UpdateProfile(c *gin.Context)
	GetAllUsers(c *gin.Context)
	UpdateUserStatus(c *gin.Context)
}

type userController struct {
	userUsecase usecase.UserUsecase
	validator   *validator.Validate
}

func NewUserController(userUsecase usecase.UserUsecase) UserController {
	return &userController{
		userUsecase: userUsecase,
		validator:   validator.New(),
	}
}

func (uc *userController) Signup(c *gin.Context) {
	var req domain.SignupRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, domain.NewErrorResponse("VALIDATION_ERROR", "Invalid request format", err.Error()))
		return
	}

	if err := uc.validator.Struct(&req); err != nil {
		c.JSON(http.StatusBadRequest, domain.NewErrorResponse("VALIDATION_ERROR", "Validation failed", err.Error()))
		return
	}

	response, err := uc.userUsecase.Signup(c.Request.Context(), &req)
	if err != nil {
		c.JSON(http.StatusBadRequest, domain.NewErrorResponse("SIGNUP_ERROR", "Failed to signup", err.Error()))
		return
	}

	c.JSON(http.StatusCreated, domain.NewSuccessResponse("User created successfully", response))
}

func (uc *userController) Login(c *gin.Context) {
	var req domain.LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, domain.NewErrorResponse("VALIDATION_ERROR", "Invalid request format", err.Error()))
		return
	}

	if err := uc.validator.Struct(&req); err != nil {
		c.JSON(http.StatusBadRequest, domain.NewErrorResponse("VALIDATION_ERROR", "Validation failed", err.Error()))
		return
	}

	response, err := uc.userUsecase.Login(c.Request.Context(), &req)
	if err != nil {
		c.JSON(http.StatusUnauthorized, domain.NewErrorResponse("LOGIN_ERROR", "Failed to login", err.Error()))
		return
	}

	c.JSON(http.StatusOK, domain.NewSuccessResponse("Login successful", response))
}

func (uc *userController) RefreshToken(c *gin.Context) {
	var req domain.RefreshTokenRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, domain.NewErrorResponse("VALIDATION_ERROR", "Invalid request format", err.Error()))
		return
	}

	if err := uc.validator.Struct(&req); err != nil {
		c.JSON(http.StatusBadRequest, domain.NewErrorResponse("VALIDATION_ERROR", "Validation failed", err.Error()))
		return
	}

	response, err := uc.userUsecase.RefreshToken(c.Request.Context(), &req)
	if err != nil {
		c.JSON(http.StatusUnauthorized, domain.NewErrorResponse("TOKEN_REFRESH_ERROR", "Failed to refresh token", err.Error()))
		return
	}

	c.JSON(http.StatusOK, domain.NewSuccessResponse("Token refreshed successfully", response))
}

func (uc *userController) GetProfile(c *gin.Context) {
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

	response, err := uc.userUsecase.GetProfile(c.Request.Context(), userID)
	if err != nil {
		c.JSON(http.StatusNotFound, domain.NewErrorResponse("USER_NOT_FOUND", "User not found", err.Error()))
		return
	}

	c.JSON(http.StatusOK, domain.NewSuccessResponse("Profile retrieved successfully", response))
}

func (uc *userController) UpdateProfile(c *gin.Context) {
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

	var req domain.UpdateUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, domain.NewErrorResponse("VALIDATION_ERROR", "Invalid request format", err.Error()))
		return
	}

	if err := uc.validator.Struct(&req); err != nil {
		c.JSON(http.StatusBadRequest, domain.NewErrorResponse("VALIDATION_ERROR", "Validation failed", err.Error()))
		return
	}

	response, err := uc.userUsecase.UpdateProfile(c.Request.Context(), userID, &req)
	if err != nil {
		c.JSON(http.StatusBadRequest, domain.NewErrorResponse("UPDATE_ERROR", "Failed to update profile", err.Error()))
		return
	}

	c.JSON(http.StatusOK, domain.NewSuccessResponse("Profile updated successfully", response))
}

func (uc *userController) GetAllUsers(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))

	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 10
	}

	users, total, err := uc.userUsecase.GetAllUsers(c.Request.Context(), page, limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, domain.NewErrorResponse("SERVER_ERROR", "Failed to get users", err.Error()))
		return
	}

	response := domain.NewPaginationResponse(page, limit, total, users)
	c.JSON(http.StatusOK, domain.NewSuccessResponse("Users retrieved successfully", response))
}

func (uc *userController) UpdateUserStatus(c *gin.Context) {
	userIDStr := c.Param("id")
	userID, err := primitive.ObjectIDFromHex(userIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, domain.NewErrorResponse("INVALID_USER_ID", "Invalid user ID", nil))
		return
	}

	var req struct {
		IsActive bool `json:"is_active" validate:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, domain.NewErrorResponse("VALIDATION_ERROR", "Invalid request format", err.Error()))
		return
	}

	if err := uc.validator.Struct(&req); err != nil {
		c.JSON(http.StatusBadRequest, domain.NewErrorResponse("VALIDATION_ERROR", "Validation failed", err.Error()))
		return
	}

	err = uc.userUsecase.UpdateUserStatus(c.Request.Context(), userID, req.IsActive)
	if err != nil {
		c.JSON(http.StatusInternalServerError, domain.NewErrorResponse("UPDATE_ERROR", "Failed to update user status", err.Error()))
		return
	}

	message := "User activated successfully"
	if !req.IsActive {
		message = "User deactivated successfully"
	}

	c.JSON(http.StatusOK, domain.NewSuccessResponse(message, nil))
}
