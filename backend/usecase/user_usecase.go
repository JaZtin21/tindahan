package usecase

import (
	"context"
	"errors"

	"tindahan-backend/domain"
	"tindahan-backend/internal/tokenutil"
	"tindahan-backend/repository"

	"go.mongodb.org/mongo-driver/bson/primitive"
	"golang.org/x/crypto/bcrypt"
)

type UserUsecase interface {
	Signup(ctx context.Context, req *domain.SignupRequest) (*domain.LoginResponse, error)
	Login(ctx context.Context, req *domain.LoginRequest) (*domain.LoginResponse, error)
	RefreshToken(ctx context.Context, req *domain.RefreshTokenRequest) (*domain.LoginResponse, error)
	GetProfile(ctx context.Context, userID primitive.ObjectID) (*domain.UserResponse, error)
	UpdateProfile(ctx context.Context, userID primitive.ObjectID, req *domain.UpdateUserRequest) (*domain.UserResponse, error)
	GetAllUsers(ctx context.Context, page, limit int) ([]*domain.UserResponse, int64, error)
	UpdateUserStatus(ctx context.Context, userID primitive.ObjectID, isActive bool) error
}

type userUsecase struct {
	userRepo repository.UserRepository
	jwtSecret string
}

func NewUserUsecase(userRepo repository.UserRepository, jwtSecret string) UserUsecase {
	return &userUsecase{
		userRepo:  userRepo,
		jwtSecret: jwtSecret,
	}
}

func (u *userUsecase) Signup(ctx context.Context, req *domain.SignupRequest) (*domain.LoginResponse, error) {
	// Check if user already exists
	existingUser, err := u.userRepo.GetUserByEmail(ctx, req.Email)
	if err == nil && existingUser != nil {
		return nil, errors.New("user with this email already exists")
	}

	// Hash password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, errors.New("failed to hash password")
	}

	// Create user
	user := &domain.User{
		FirstName: req.FirstName,
		LastName:  req.LastName,
		Email:     req.Email,
		Password:  string(hashedPassword),
		Phone:     req.Phone,
		Role:      req.Role,
		IsActive:  true,
	}

	err = u.userRepo.CreateUser(ctx, user)
	if err != nil {
		return nil, errors.New("failed to create user")
	}

	// Generate tokens
	accessToken, err := tokenutil.GenerateAccessToken(user.ID.Hex(), user.Email, user.Role, u.jwtSecret)
	if err != nil {
		return nil, errors.New("failed to generate access token")
	}

	refreshToken, err := tokenutil.GenerateRefreshToken(user.ID.Hex(), user.Email, user.Role, u.jwtSecret)
	if err != nil {
		return nil, errors.New("failed to generate refresh token")
	}

	return &domain.LoginResponse{
		User: domain.UserResponse{
			ID:        user.ID.Hex(),
			FirstName: user.FirstName,
			LastName:  user.LastName,
			Email:     user.Email,
			Phone:     user.Phone,
			Role:      user.Role,
			IsActive:  user.IsActive,
			CreatedAt: user.CreatedAt,
			UpdatedAt: user.UpdatedAt,
		},
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
	}, nil
}

func (u *userUsecase) Login(ctx context.Context, req *domain.LoginRequest) (*domain.LoginResponse, error) {
	// Get user by email
	user, err := u.userRepo.GetUserByEmail(ctx, req.Email)
	if err != nil {
		return nil, errors.New("invalid email or password")
	}

	// Check if user is active
	if !user.IsActive {
		return nil, errors.New("account is deactivated")
	}

	// Verify password
	err = bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(req.Password))
	if err != nil {
		return nil, errors.New("invalid email or password")
	}

	// Generate tokens
	accessToken, err := tokenutil.GenerateAccessToken(user.ID.Hex(), user.Email, user.Role, u.jwtSecret)
	if err != nil {
		return nil, errors.New("failed to generate access token")
	}

	refreshToken, err := tokenutil.GenerateRefreshToken(user.ID.Hex(), user.Email, user.Role, u.jwtSecret)
	if err != nil {
		return nil, errors.New("failed to generate refresh token")
	}

	return &domain.LoginResponse{
		User: domain.UserResponse{
			ID:        user.ID.Hex(),
			FirstName: user.FirstName,
			LastName:  user.LastName,
			Email:     user.Email,
			Phone:     user.Phone,
			Role:      user.Role,
			IsActive:  user.IsActive,
			CreatedAt: user.CreatedAt,
			UpdatedAt: user.UpdatedAt,
		},
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
	}, nil
}

func (u *userUsecase) RefreshToken(ctx context.Context, req *domain.RefreshTokenRequest) (*domain.LoginResponse, error) {
	// Validate refresh token
	claims, err := tokenutil.ValidateToken(req.RefreshToken, u.jwtSecret)
	if err != nil {
		return nil, errors.New("invalid refresh token")
	}

	// Convert string ID to ObjectID
	userID, err := primitive.ObjectIDFromHex(claims.UserID)
	if err != nil {
		return nil, errors.New("invalid user ID")
	}

	// Get user
	user, err := u.userRepo.GetUserByID(ctx, userID)
	if err != nil {
		return nil, errors.New("user not found")
	}

	if !user.IsActive {
		return nil, errors.New("account is deactivated")
	}

	// Generate new tokens
	accessToken, err := tokenutil.GenerateAccessToken(claims.UserID, claims.Email, claims.Role, u.jwtSecret)
	if err != nil {
		return nil, errors.New("failed to generate access token")
	}

	refreshToken, err := tokenutil.GenerateRefreshToken(claims.UserID, claims.Email, claims.Role, u.jwtSecret)
	if err != nil {
		return nil, errors.New("failed to generate refresh token")
	}

	return &domain.LoginResponse{
		User: domain.UserResponse{
			ID:        user.ID.Hex(),
			FirstName: user.FirstName,
			LastName:  user.LastName,
			Email:     user.Email,
			Phone:     user.Phone,
			Role:      user.Role,
			IsActive:  user.IsActive,
			CreatedAt: user.CreatedAt,
			UpdatedAt: user.UpdatedAt,
		},
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
	}, nil
}

func (u *userUsecase) GetProfile(ctx context.Context, userID primitive.ObjectID) (*domain.UserResponse, error) {
	user, err := u.userRepo.GetUserByID(ctx, userID)
	if err != nil {
		return nil, errors.New("user not found")
	}

	return &domain.UserResponse{
		ID:        user.ID.Hex(),
		FirstName: user.FirstName,
		LastName:  user.LastName,
		Email:     user.Email,
		Phone:     user.Phone,
		Role:      user.Role,
		IsActive:  user.IsActive,
		CreatedAt: user.CreatedAt,
		UpdatedAt: user.UpdatedAt,
	}, nil
}

func (u *userUsecase) UpdateProfile(ctx context.Context, userID primitive.ObjectID, req *domain.UpdateUserRequest) (*domain.UserResponse, error) {
	err := u.userRepo.UpdateUser(ctx, userID, req)
	if err != nil {
		return nil, errors.New("failed to update profile")
	}

	// Get updated user
	return u.GetProfile(ctx, userID)
}

func (u *userUsecase) GetAllUsers(ctx context.Context, page, limit int) ([]*domain.UserResponse, int64, error) {
	users, total, err := u.userRepo.GetAllUsers(ctx, page, limit)
	if err != nil {
		return nil, 0, err
	}

	var userResponses []*domain.UserResponse
	for _, user := range users {
		userResponses = append(userResponses, &domain.UserResponse{
			ID:        user.ID.Hex(),
			FirstName: user.FirstName,
			LastName:  user.LastName,
			Email:     user.Email,
			Phone:     user.Phone,
			Role:      user.Role,
			IsActive:  user.IsActive,
			CreatedAt: user.CreatedAt,
			UpdatedAt: user.UpdatedAt,
		})
	}

	return userResponses, total, nil
}

func (u *userUsecase) UpdateUserStatus(ctx context.Context, userID primitive.ObjectID, isActive bool) error {
	return u.userRepo.UpdateUserStatus(ctx, userID, isActive)
}
