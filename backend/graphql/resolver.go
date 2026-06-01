package graphql

// THIS CODE WILL BE UPDATED WITH SCHEMA CHANGES. PREVIOUS IMPLEMENTATION FOR SCHEMA CHANGES WILL BE KEPT IN THE COMMENT SECTION. IMPLEMENTATION FOR UNCHANGED SCHEMA WILL BE KEPT.

import (
	"context"
	"fmt"
	"sync"
	"time"
	"tindahan-backend/api/handlers/auth"
	"tindahan-backend/api/handlers/inquiry"
	"tindahan-backend/api/handlers/middleware"
	"tindahan-backend/api/handlers/owner"
	"tindahan-backend/api/handlers/post"
	"tindahan-backend/api/handlers/product"
	"tindahan-backend/api/handlers/review"
	"tindahan-backend/api/handlers/shop"
	"tindahan-backend/api/handlers/user"
	"tindahan-backend/bootstrap"
	"tindahan-backend/domain"
	"tindahan-backend/internal/imageutil"
	"tindahan-backend/repository"
	"tindahan-backend/usecase"

	"github.com/99designs/gqlgen/graphql"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
)

// PostNotifier handles real-time notifications for post changes
type PostNotifier struct {
	mu        sync.RWMutex
	listeners map[chan struct{}]bool
}

// getStringPtr safely converts interface{} to *string for optional GraphQL fields
func getStringPtr(v interface{}) *string {
	if v == nil {
		return nil
	}
	if s, ok := v.(string); ok {
		return &s
	}
	return nil
}

// NewPostNotifier creates a new PostNotifier
func NewPostNotifier() *PostNotifier {
	return &PostNotifier{
		listeners: make(map[chan struct{}]bool),
	}
}

// Subscribe adds a new listener
func (n *PostNotifier) Subscribe() chan struct{} {
	n.mu.Lock()
	defer n.mu.Unlock()
	ch := make(chan struct{}, 1)
	n.listeners[ch] = true
	return ch
}

// Unsubscribe removes a listener
func (n *PostNotifier) Unsubscribe(ch chan struct{}) {
	n.mu.Lock()
	defer n.mu.Unlock()
	delete(n.listeners, ch)
	close(ch)
}

// NotifyAll notifies all listeners of a change
func (n *PostNotifier) NotifyAll() {
	n.mu.RLock()
	defer n.mu.RUnlock()
	for ch := range n.listeners {
		select {
		case ch <- struct{}{}:
		default:
		}
	}
}

// Helper functions for safe type extraction
func getStringValue(m map[string]interface{}, key string) string {
	if val, ok := m[key]; ok {
		if s, ok := val.(string); ok {
			return s
		}
	}
	return ""
}

func getStringPointerValue(m map[string]interface{}, key string) *string {
	if val, ok := m[key]; ok {
		if s, ok := val.(string); ok && s != "" {
			return &s
		}
	}
	return nil
}

func getBoolValue(m map[string]interface{}, key string) bool {
	if val, ok := m[key]; ok {
		if b, ok := val.(bool); ok {
			return b
		}
	}
	return false
}

type Resolver struct {
	authResolver    *auth.AuthResolver
	userResolver    *user.UserResolver
	shopResolver    *shop.ShopResolver
	productResolver *product.ProductResolver
	ownerResolver   *owner.OwnerResolver
	postResolver    *post.PostResolver
	reviewResolver  *review.ReviewResolver
	inquiryResolver *inquiry.InquiryResolver
	storeRepo       repository.StoreRepository
	productRepo     repository.ProductRepository
	userRepo        repository.UserRepository
	inquiryRepo     repository.InquiryRepository
	db              *mongo.Database
	jwtSecret       string
	postNotifier    *PostNotifier
}

// Login is the resolver for the login field.
func (r *mutationResolver) Login(ctx context.Context, input LoginInput) (*AuthPayload, error) {
	result, _ := r.authResolver.Login(ctx, input.Email, input.Password)
	if !result["success"].(bool) {
		return &AuthPayload{
			Success: false,
			Message: result["message"].(string),
		}, nil
	}
	data := result["data"].(map[string]interface{})
	userData := data["user"].(map[string]interface{})

	// Parse time fields
	createdAt, _ := time.Parse(time.RFC3339, userData["createdAt"].(string))
	updatedAt, _ := time.Parse(time.RFC3339, userData["updatedAt"].(string))

	return &AuthPayload{
		Success: result["success"].(bool),
		Message: result["message"].(string),
		Data: &AuthResponse{
			User: &User{
				ID:           userData["id"].(string),
				Name:         userData["name"].(string),
				Email:        userData["email"].(string),
				FirstName:    userData["firstName"].(string),
				LastName:     userData["lastName"].(string),
				Role:         UserRole(userData["role"].(string)),
				IsActive:     userData["isActive"].(bool),
				ProfilePhoto: getStringPtr(userData["profilePhoto"]),
				CoverPhoto:   getStringPtr(userData["coverPhoto"]),
				CreatedAt:    createdAt,
				UpdatedAt:    &updatedAt,
			},
			AccessToken: data["accessToken"].(string),
		},
	}, nil
}

// Signup is the resolver for the signup field.
func (r *mutationResolver) Signup(ctx context.Context, input SignupInput) (*AuthPayload, error) {
	role := "CUSTOMER"
	if input.Role != nil {
		role = string(*input.Role)
	}
	firstName := input.FirstName
	lastName := input.LastName
	result, _ := r.authResolver.Signup(ctx, firstName, lastName, input.Email, input.Password, role)
	if !result["success"].(bool) {
		return &AuthPayload{
			Success: false,
			Message: result["message"].(string),
		}, nil
	}
	data := result["data"].(map[string]interface{})
	userData := data["user"].(map[string]interface{})

	// Parse time fields
	createdAt, _ := time.Parse(time.RFC3339, userData["createdAt"].(string))
	updatedAt, _ := time.Parse(time.RFC3339, userData["updatedAt"].(string))

	return &AuthPayload{
		Success: result["success"].(bool),
		Message: result["message"].(string),
		Data: &AuthResponse{
			User: &User{
				ID:           userData["id"].(string),
				Name:         userData["name"].(string),
				Email:        userData["email"].(string),
				FirstName:    userData["firstName"].(string),
				LastName:     userData["lastName"].(string),
				Role:         UserRole(userData["role"].(string)),
				IsActive:     userData["isActive"].(bool),
				ProfilePhoto: getStringPtr(userData["profilePhoto"]),
				CoverPhoto:   getStringPtr(userData["coverPhoto"]),
				CreatedAt:    createdAt,
				UpdatedAt:    &updatedAt,
			},
			AccessToken: data["accessToken"].(string),
		},
	}, nil
}

// RefreshToken is the resolver for the refreshToken field.
func (r *mutationResolver) RefreshToken(ctx context.Context) (*AuthPayload, error) {
	result, _ := r.authResolver.RefreshToken(ctx, "")
	if !result["success"].(bool) {
		return &AuthPayload{
			Success: false,
			Message: result["message"].(string),
		}, nil
	}
	data := result["data"].(map[string]interface{})

	return &AuthPayload{
		Success: result["success"].(bool),
		Message: result["message"].(string),
		Data: &AuthResponse{
			AccessToken: data["accessToken"].(string),
		},
	}, nil
}

// GoogleLogin is the resolver for the googleLogin field.
func (r *mutationResolver) GoogleLogin(ctx context.Context, input GoogleLoginInput) (*AuthPayload, error) {
	role := "CUSTOMER"
	if input.Role != nil {
		role = string(*input.Role)
	}

	result, _ := r.authResolver.GoogleLogin(ctx, input.Credential, role)
	if !result["success"].(bool) {
		return &AuthPayload{
			Success: false,
			Message: result["message"].(string),
		}, nil
	}

	data := result["data"].(map[string]interface{})
	userData := data["user"].(map[string]interface{})

	// Parse time fields
	createdAt, _ := time.Parse(time.RFC3339, userData["createdAt"].(string))
	updatedAt, _ := time.Parse(time.RFC3339, userData["updatedAt"].(string))

	return &AuthPayload{
		Success: result["success"].(bool),
		Message: result["message"].(string),
		Data: &AuthResponse{
			User: &User{
				ID:           userData["id"].(string),
				Name:         userData["name"].(string),
				Email:        userData["email"].(string),
				FirstName:    userData["firstName"].(string),
				LastName:     userData["lastName"].(string),
				Role:         UserRole(userData["role"].(string)),
				IsActive:     userData["isActive"].(bool),
				ProfilePhoto: getStringPtr(userData["profilePhoto"]),
				CoverPhoto:   getStringPtr(userData["coverPhoto"]),
				CreatedAt:    createdAt,
				UpdatedAt:    &updatedAt,
			},
			AccessToken: data["accessToken"].(string),
		},
	}, nil
}

// CreatePost is the resolver for the createPost field.
func (r *mutationResolver) CreatePost(ctx context.Context, input CreatePostInput) (*PostPayload, error) {
	userID := middleware.GetUserID(ctx)
	if userID == "" {
		return &PostPayload{
			Success: false,
			Message: "Authentication required",
		}, nil
	}

	var location *domain.PostLocation
	if input.Location != nil {
		location = &domain.PostLocation{
			Lat:  input.Location.Lat,
			Lng:  input.Location.Lng,
			Name: input.Location.Name,
		}
	}

	// Upload photos to Cloudinary if provided
	var photoURLs []string
	if len(input.Photos) > 0 {
		env := bootstrap.LoadEnv()
		if env.CloudinaryCloudName == "" || env.CloudinaryAPIKey == "" || env.CloudinaryAPISecret == "" {
			return &PostPayload{
				Success: false,
				Message: "Image upload service not configured",
			}, nil
		}

		uploader, err := imageutil.NewImageUploader(
			env.CloudinaryCloudName,
			env.CloudinaryAPIKey,
			env.CloudinaryAPISecret,
			env.CloudinaryFolder,
		)
		if err != nil {
			return &PostPayload{
				Success: false,
				Message: "Failed to initialize upload service",
			}, nil
		}

		folder := env.CloudinaryFolder + "/" + userID + "/posts"
		userUploader := uploader.WithFolder(folder)

		for _, file := range input.Photos {
			result, err := userUploader.UploadImage(ctx, file.File, file.Filename)
			if err != nil {
				return &PostPayload{
					Success: false,
					Message: "Failed to upload image: " + err.Error(),
				}, nil
			}
			photoURLs = append(photoURLs, result.URL)
		}
	}

	result, err := r.postResolver.CreatePost(ctx, userID, input.Title, input.Text, photoURLs, input.Types, location)
	if err != nil {
		return &PostPayload{
			Success: false,
			Message: result["message"].(string),
		}, nil
	}

	// Notify all subscribers that a new post was created
	r.postNotifier.NotifyAll()

	data := result["data"].(map[string]interface{})
	return &PostPayload{
		Success: result["success"].(bool),
		Message: result["message"].(string),
		Data:    r.formatPostFromMap(data),
	}, nil
}

// UpdatePost is the resolver for the updatePost field.
func (r *mutationResolver) UpdatePost(ctx context.Context, id string, input UpdatePostInput) (*PostPayload, error) {
	userID := middleware.GetUserID(ctx)
	if userID == "" {
		return &PostPayload{
			Success: false,
			Message: "Authentication required",
		}, nil
	}

	var location *domain.PostLocation
	if input.Location != nil {
		location = &domain.PostLocation{
			Lat:  input.Location.Lat,
			Lng:  input.Location.Lng,
			Name: input.Location.Name,
		}
	}

	result, err := r.postResolver.UpdatePost(ctx, id, userID, input.Title, input.Text, input.Photos, input.NewPhotos, input.Types, location)
	if err != nil {
		return &PostPayload{
			Success: false,
			Message: result["message"].(string),
		}, nil
	}

	data := result["data"].(map[string]interface{})
	return &PostPayload{
		Success: result["success"].(bool),
		Message: result["message"].(string),
		Data:    r.formatPostFromMap(data),
	}, nil
}

// DeletePost is the resolver for the deletePost field.
func (r *mutationResolver) DeletePost(ctx context.Context, id string) (*DeletePayload, error) {
	userID := middleware.GetUserID(ctx)
	if userID == "" {
		return &DeletePayload{
			Success: false,
			Message: "Authentication required",
		}, nil
	}

	result, err := r.postResolver.DeletePost(ctx, id, userID)
	if err != nil {
		return &DeletePayload{
			Success: false,
			Message: result["message"].(string),
		}, nil
	}

	return &DeletePayload{
		Success: result["success"].(bool),
		Message: result["message"].(string),
	}, nil
}

// LikePost is the resolver for the likePost field.
func (r *mutationResolver) LikePost(ctx context.Context, id string) (*PostPayload, error) {
	userID := middleware.GetUserID(ctx)
	if userID == "" {
		return &PostPayload{
			Success: false,
			Message: "Authentication required",
		}, nil
	}

	result, err := r.postResolver.LikePost(ctx, id, userID)
	if err != nil {
		return &PostPayload{
			Success: false,
			Message: result["message"].(string),
		}, nil
	}

	data := result["data"].(map[string]interface{})
	return &PostPayload{
		Success: result["success"].(bool),
		Message: result["message"].(string),
		Data:    r.formatPostFromMap(data),
	}, nil
}

// UnlikePost is the resolver for the unlikePost field.
func (r *mutationResolver) UnlikePost(ctx context.Context, id string) (*PostPayload, error) {
	userID := middleware.GetUserID(ctx)
	if userID == "" {
		return &PostPayload{
			Success: false,
			Message: "Authentication required",
		}, nil
	}

	result, err := r.postResolver.UnlikePost(ctx, id, userID)
	if err != nil {
		return &PostPayload{
			Success: false,
			Message: result["message"].(string),
		}, nil
	}

	data := result["data"].(map[string]interface{})
	return &PostPayload{
		Success: result["success"].(bool),
		Message: result["message"].(string),
		Data:    r.formatPostFromMap(data),
	}, nil
}

// CreateItem is the resolver for the createItem field.
func (r *mutationResolver) CreateItem(ctx context.Context, input CreateItemInput) (*ItemPayload, error) {
	userID := middleware.GetUserID(ctx)
	if userID == "" {
		return &ItemPayload{
			Success: false,
			Message: "Authentication required",
		}, nil
	}

	// Upload cover photo to Cloudinary if provided
	var coverPhotoURL string
	if input.CoverPhoto != nil {
		env := bootstrap.LoadEnv()
		folder := env.CloudinaryFolder + "/" + userID + "/products"
		uploader, err := imageutil.NewImageUploader(
			env.CloudinaryCloudName,
			env.CloudinaryAPIKey,
			env.CloudinaryAPISecret,
			folder,
		)
		if err != nil {
			return &ItemPayload{
				Success: false,
				Message: "Failed to initialize image uploader: " + err.Error(),
			}, nil
		}

		result, err := uploader.UploadImage(ctx, input.CoverPhoto.File, input.CoverPhoto.Filename)
		if err != nil {
			return &ItemPayload{
				Success: false,
				Message: "Failed to upload cover photo: " + err.Error(),
			}, nil
		}
		coverPhotoURL = result.URL
	}

	// Use uploaded URL or default placeholder
	finalCoverPhoto := coverPhotoURL
	if finalCoverPhoto == "" {
		finalCoverPhoto = "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=400"
	}

	result, err := r.ownerResolver.CreateItem(ctx, userID, input.ShopID, input.Name, input.Price, input.Stock, input.Description, input.Category, finalCoverPhoto)
	if err != nil {
		return &ItemPayload{
			Success: false,
			Message: result["message"].(string),
		}, nil
	}

	data := result["data"].(map[string]interface{})

	// Handle stock type
	var stock int
	switch v := data["stock"].(type) {
	case int:
		stock = v
	case int32:
		stock = int(v)
	case int64:
		stock = int(v)
	case float64:
		stock = int(v)
	default:
		stock = 0
	}

	// Handle rating
	var ratingPtr *float64
	if r, ok := data["rating"].(float64); ok && r > 0 {
		ratingPtr = &r
	}

	// Handle cover photo
	var coverPhotoPtr *string
	if coverPhoto, ok := data["coverPhoto"].(string); ok && coverPhoto != "" {
		coverPhotoPtr = &coverPhoto
	}

	return &ItemPayload{
		Success: result["success"].(bool),
		Message: result["message"].(string),
		Data: &Item{
			ID:          data["id"].(string),
			Name:        data["name"].(string),
			Description: data["description"].(string),
			Category:    data["category"].(string),
			Price:       data["price"].(float64),
			Stock:       stock,
			IsActive:    data["isActive"].(bool),
			Rating:      ratingPtr,
			CoverPhoto:  coverPhotoPtr,
		},
	}, nil
}

// UpdateItem is the resolver for the updateItem field.
func (r *mutationResolver) UpdateItem(ctx context.Context, id string, input UpdateItemInput) (*ItemPayload, error) {
	userID := middleware.GetUserID(ctx)
	if userID == "" {
		return &ItemPayload{
			Success: false,
			Message: "Authentication required",
		}, nil
	}

	// Upload new cover photo to Cloudinary if provided
	var newCoverPhotoURL string
	if input.NewCoverPhoto != nil {
		env := bootstrap.LoadEnv()
		folder := env.CloudinaryFolder + "/" + userID + "/products"
		uploader, err := imageutil.NewImageUploader(
			env.CloudinaryCloudName,
			env.CloudinaryAPIKey,
			env.CloudinaryAPISecret,
			folder,
		)
		if err != nil {
			return &ItemPayload{
				Success: false,
				Message: "Failed to initialize image uploader: " + err.Error(),
			}, nil
		}

		result, err := uploader.UploadImage(ctx, input.NewCoverPhoto.File, input.NewCoverPhoto.Filename)
		if err != nil {
			return &ItemPayload{
				Success: false,
				Message: "Failed to upload cover photo: " + err.Error(),
			}, nil
		}
		newCoverPhotoURL = result.URL
	}

	// Build update request with optional fields
	updates := &domain.UpdateProductRequest{}
	if input.Name != nil {
		updates.Name = input.Name
	}
	if input.Price != nil {
		updates.Price = input.Price
	}
	if input.Description != nil {
		updates.Description = input.Description
	}
	if input.Category != nil {
		updates.Category = input.Category
	}
	if input.Stock != nil {
		updates.Stock = input.Stock
	}
	if input.CoverPhoto != nil {
		updates.ImageURL = input.CoverPhoto
	}
	if newCoverPhotoURL != "" {
		updates.ImageURL = &newCoverPhotoURL
	}

	result, err := r.ownerResolver.UpdateItem(ctx, id, userID, updates)
	if err != nil {
		return &ItemPayload{
			Success: false,
			Message: result["message"].(string),
		}, nil
	}

	data := result["data"].(map[string]interface{})

	// Handle cover photo
	var coverPhotoPtr *string
	if coverPhoto, ok := data["coverPhoto"].(string); ok && coverPhoto != "" {
		coverPhotoPtr = &coverPhoto
	}

	return &ItemPayload{
		Success: result["success"].(bool),
		Message: result["message"].(string),
		Data: &Item{
			ID:         data["id"].(string),
			Name:       data["name"].(string),
			Price:      data["price"].(float64),
			Stock:      data["stock"].(int),
			IsActive:   data["isActive"].(bool),
			CoverPhoto: coverPhotoPtr,
		},
	}, nil
}

// DeleteItem is the resolver for the deleteItem field.
func (r *mutationResolver) DeleteItem(ctx context.Context, id string) (*DeletePayload, error) {
	userID := middleware.GetUserID(ctx)
	if userID == "" {
		return &DeletePayload{
			Success: false,
			Message: "Authentication required",
		}, nil
	}
	result, err := r.ownerResolver.DeleteItem(ctx, id, userID)
	if err != nil {
		return &DeletePayload{
			Success: false,
			Message: result["message"].(string),
		}, nil
	}

	return &DeletePayload{
		Success: result["success"].(bool),
		Message: result["message"].(string),
	}, nil
}

// CreateShop is the resolver for the createShop field.
func (r *mutationResolver) CreateShop(ctx context.Context, input CreateShopInput) (*ShopPayload, error) {
	userID := middleware.GetUserID(ctx)
	if userID == "" {
		return &ShopPayload{
			Success: false,
			Message: "Authentication required",
		}, nil
	}

	// Upload cover photo to Cloudinary if provided
	var coverPhotoURL string
	if input.CoverPhoto != nil {
		env := bootstrap.LoadEnv()
		if env.CloudinaryCloudName == "" || env.CloudinaryAPIKey == "" || env.CloudinaryAPISecret == "" {
			return &ShopPayload{
				Success: false,
				Message: "Image upload service not configured",
			}, nil
		}

		uploader, err := imageutil.NewImageUploader(
			env.CloudinaryCloudName,
			env.CloudinaryAPIKey,
			env.CloudinaryAPISecret,
			env.CloudinaryFolder,
		)
		if err != nil {
			return &ShopPayload{
				Success: false,
				Message: "Failed to initialize upload service",
			}, nil
		}

		folder := env.CloudinaryFolder + "/" + userID + "/shop"
		userUploader := uploader.WithFolder(folder)

		result, err := userUploader.UploadImage(ctx, input.CoverPhoto.File, input.CoverPhoto.Filename)
		if err != nil {
			return &ShopPayload{
				Success: false,
				Message: "Failed to upload cover photo: " + err.Error(),
			}, nil
		}
		coverPhotoURL = result.URL
	}

	// Upload other photos to Cloudinary if provided
	var otherPhotoURLs []string
	if len(input.OtherPhotos) > 0 {
		env := bootstrap.LoadEnv()
		if env.CloudinaryCloudName == "" || env.CloudinaryAPIKey == "" || env.CloudinaryAPISecret == "" {
			return &ShopPayload{
				Success: false,
				Message: "Image upload service not configured",
			}, nil
		}

		uploader, err := imageutil.NewImageUploader(
			env.CloudinaryCloudName,
			env.CloudinaryAPIKey,
			env.CloudinaryAPISecret,
			env.CloudinaryFolder,
		)
		if err != nil {
			return &ShopPayload{
				Success: false,
				Message: "Failed to initialize upload service",
			}, nil
		}

		folder := env.CloudinaryFolder + "/" + userID + "/shop"
		userUploader := uploader.WithFolder(folder)

		for _, file := range input.OtherPhotos {
			result, err := userUploader.UploadImage(ctx, file.File, file.Filename)
			if err != nil {
				return &ShopPayload{
					Success: false,
					Message: "Failed to upload image: " + err.Error(),
				}, nil
			}
			otherPhotoURLs = append(otherPhotoURLs, result.URL)
		}
	}

	// Build owner resolver input from GraphQL input
	shopInput := owner.CreateShopInput{
		Name:         input.Name,
		Location:     input.Location,
		CoverPhoto:   coverPhotoURL,
		OtherPhotos:  otherPhotoURLs,
		BusinessType: string(input.BusinessType),
	}

	// Handle optional description
	if input.Description != nil {
		shopInput.Description = *input.Description
	}

	// Handle coordinates
	if input.Coordinates != nil {
		shopInput.Coordinates.Lat = input.Coordinates.Lat
		shopInput.Coordinates.Lng = input.Coordinates.Lng
	}

	// Handle business hours
	if input.BusinessHours != nil {
		shopInput.BusinessHours = domain.BusinessHours{
			OpenTime:  input.BusinessHours.OpenTime,
			CloseTime: input.BusinessHours.CloseTime,
			Days:      input.BusinessHours.Days,
		}
	}

	// Handle payment methods
	if input.PaymentMethods != nil {
		shopInput.PaymentMethods = domain.PaymentMethods{
			Cash:    input.PaymentMethods.Cash,
			GCash:   input.PaymentMethods.Gcash,
			Paymaya: input.PaymentMethods.Paymaya,
			Card:    input.PaymentMethods.Card,
		}
	}

	// Handle delivery options
	if input.Delivery != nil {
		shopInput.Delivery = domain.DeliveryOptions{
			Available: input.Delivery.Available,
		}
		if input.Delivery.Radius != nil {
			shopInput.Delivery.Radius = *input.Delivery.Radius
		}
		if input.Delivery.Fee != nil {
			shopInput.Delivery.Fee = *input.Delivery.Fee
		}
		if input.Delivery.MinOrder != nil {
			shopInput.Delivery.MinOrder = *input.Delivery.MinOrder
		}
	}

	// Handle social media
	if input.SocialMedia != nil {
		if input.SocialMedia.Facebook != nil {
			shopInput.SocialMedia.Facebook = *input.SocialMedia.Facebook
		}
		if input.SocialMedia.Instagram != nil {
			shopInput.SocialMedia.Instagram = *input.SocialMedia.Instagram
		}
	}

	// Handle contact details
	if input.ContactDetails != nil {
		shopInput.ContactDetails = domain.ContactDetails{
			Phone:   input.ContactDetails.Phone,
			Email:   input.ContactDetails.Email,
			Address: input.ContactDetails.Address,
		}
	}

	result, err := r.ownerResolver.CreateShop(ctx, userID, shopInput)
	if err != nil {
		return &ShopPayload{
			Success: false,
			Message: result["message"].(string),
		}, nil
	}

	data := result["data"].(map[string]interface{})

	// Parse createdAt time
	createdAt, _ := time.Parse(time.RFC3339, data["createdAt"].(string))

	// Build full Shop response
	shop := &Shop{
		ID:        data["id"].(string),
		Name:      data["name"].(string),
		Location:  data["location"].(string),
		CreatedAt: createdAt,
		Status:    ShopStatus(data["status"].(string)),
	}

	// Add coordinates if present
	if coords, ok := data["coordinates"].(map[string]float64); ok {
		shop.Coordinates = &Coordinates{
			Lat: coords["lat"],
			Lng: coords["lng"],
		}
	}

	// Add cover photo
	if coverPhoto, ok := data["coverPhoto"].(string); ok {
		shop.CoverPhoto = coverPhoto
	}

	// Add other photos
	if otherPhotos, ok := data["otherPhotos"].([]string); ok {
		shop.OtherPhotos = otherPhotos
	}

	// Add business hours
	if bh, ok := data["businessHours"].(domain.BusinessHours); ok {
		shop.BusinessHours = &BusinessHours{
			OpenTime:  bh.OpenTime,
			CloseTime: bh.CloseTime,
			Days:      bh.Days,
		}
	}

	// Add business type
	if bt, ok := data["businessType"].(string); ok {
		shop.BusinessType = BusinessType(bt)
	}

	// Add payment methods
	if pm, ok := data["paymentMethods"].(domain.PaymentMethods); ok {
		shop.PaymentMethods = &PaymentMethods{
			Cash:    pm.Cash,
			Gcash:   pm.GCash,
			Paymaya: pm.Paymaya,
			Card:    pm.Card,
		}
	}

	// Add delivery options
	if d, ok := data["delivery"].(domain.DeliveryOptions); ok {
		shop.Delivery = &DeliveryOptions{
			Available: d.Available,
		}
		if d.Radius > 0 {
			shop.Delivery.Radius = &d.Radius
		}
		if d.Fee > 0 {
			shop.Delivery.Fee = &d.Fee
		}
		if d.MinOrder > 0 {
			shop.Delivery.MinOrder = &d.MinOrder
		}
	}

	// Add social media
	if sm, ok := data["socialMedia"].(domain.SocialMedia); ok {
		shop.SocialMedia = &SocialMedia{}
		if sm.Facebook != "" {
			shop.SocialMedia.Facebook = &sm.Facebook
		}
		if sm.Instagram != "" {
			shop.SocialMedia.Instagram = &sm.Instagram
		}
	}

	// Add contact details
	if cd, ok := data["contactDetails"].(domain.ContactDetails); ok {
		shop.ContactDetails = &ContactDetails{
			Phone:   cd.Phone,
			Email:   cd.Email,
			Address: cd.Address,
		}
	}

	// Add verification - REQUIRED field, must always be set
	if v, ok := data["verification"].(domain.Verification); ok {
		shop.Verification = &Verification{
			IsVerified: v.IsVerified,
		}
		if v.VerifiedDate != "" {
			if verifiedTime, err := time.Parse(time.RFC3339, v.VerifiedDate); err == nil {
				shop.Verification.VerifiedDate = &verifiedTime
			}
		}
		if v.VerificationID != "" {
			shop.Verification.VerificationID = &v.VerificationID
		}
	} else {
		// Always set a default verification to avoid null
		shop.Verification = &Verification{
			IsVerified: false,
		}
	}

	return &ShopPayload{
		Success: result["success"].(bool),
		Message: result["message"].(string),
		Data:    shop,
	}, nil
}

// UpdateShop is the resolver for the updateShop field.
func (r *mutationResolver) UpdateShop(ctx context.Context, id string, input UpdateShopInput) (*ShopPayload, error) {
	userID := middleware.GetUserID(ctx)
	if userID == "" {
		return &ShopPayload{
			Success: false,
			Message: "Authentication required",
		}, nil
	}

	// Upload new cover photo to Cloudinary if provided
	var newCoverPhotoURL string
	if input.NewCoverPhoto != nil {
		env := bootstrap.LoadEnv()
		if env.CloudinaryCloudName == "" || env.CloudinaryAPIKey == "" || env.CloudinaryAPISecret == "" {
			return &ShopPayload{
				Success: false,
				Message: "Image upload service not configured",
			}, nil
		}

		uploader, err := imageutil.NewImageUploader(
			env.CloudinaryCloudName,
			env.CloudinaryAPIKey,
			env.CloudinaryAPISecret,
			env.CloudinaryFolder,
		)
		if err != nil {
			return &ShopPayload{
				Success: false,
				Message: "Failed to initialize upload service",
			}, nil
		}

		folder := env.CloudinaryFolder + "/" + userID + "/shop"
		userUploader := uploader.WithFolder(folder)

		result, err := userUploader.UploadImage(ctx, input.NewCoverPhoto.File, input.NewCoverPhoto.Filename)
		if err != nil {
			return &ShopPayload{
				Success: false,
				Message: "Failed to upload cover photo: " + err.Error(),
			}, nil
		}
		newCoverPhotoURL = result.URL
	}

	// Upload new other photos to Cloudinary if provided
	var newOtherPhotoURLs []string
	if len(input.NewOtherPhotos) > 0 {
		env := bootstrap.LoadEnv()
		if env.CloudinaryCloudName == "" || env.CloudinaryAPIKey == "" || env.CloudinaryAPISecret == "" {
			return &ShopPayload{
				Success: false,
				Message: "Image upload service not configured",
			}, nil
		}

		uploader, err := imageutil.NewImageUploader(
			env.CloudinaryCloudName,
			env.CloudinaryAPIKey,
			env.CloudinaryAPISecret,
			env.CloudinaryFolder,
		)
		if err != nil {
			return &ShopPayload{
				Success: false,
				Message: "Failed to initialize upload service",
			}, nil
		}

		folder := env.CloudinaryFolder + "/" + userID + "/shop"
		userUploader := uploader.WithFolder(folder)

		for _, file := range input.NewOtherPhotos {
			result, err := userUploader.UploadImage(ctx, file.File, file.Filename)
			if err != nil {
				return &ShopPayload{
					Success: false,
					Message: "Failed to upload image: " + err.Error(),
				}, nil
			}
			newOtherPhotoURLs = append(newOtherPhotoURLs, result.URL)
		}
	}

	// Build full update input
	shopInput := owner.UpdateShopInput{}
	if input.Name != nil {
		shopInput.Name = *input.Name
	}
	if input.Description != nil {
		shopInput.Description = *input.Description
	}
	if input.Location != nil {
		shopInput.Location = *input.Location
	}
	// Use new cover photo URL if uploaded, otherwise use the provided URL
	if newCoverPhotoURL != "" {
		shopInput.CoverPhoto = newCoverPhotoURL
	} else if input.CoverPhoto != nil {
		shopInput.CoverPhoto = *input.CoverPhoto
	}
	// Combine existing other photos with new uploads
	if input.OtherPhotos != nil {
		shopInput.OtherPhotos = input.OtherPhotos
	}
	if len(newOtherPhotoURLs) > 0 {
		shopInput.OtherPhotos = append(shopInput.OtherPhotos, newOtherPhotoURLs...)
	}
	if input.BusinessType != nil {
		shopInput.BusinessType = string(*input.BusinessType)
	}
	if input.Status != nil {
		shopInput.Status = string(*input.Status)
	}

	// Handle coordinates
	if input.Coordinates != nil {
		shopInput.Coordinates.Lat = input.Coordinates.Lat
		shopInput.Coordinates.Lng = input.Coordinates.Lng
	}

	// Handle business hours
	if input.BusinessHours != nil {
		shopInput.BusinessHours = domain.BusinessHours{
			OpenTime:  input.BusinessHours.OpenTime,
			CloseTime: input.BusinessHours.CloseTime,
			Days:      input.BusinessHours.Days,
		}
	}

	// Handle payment methods
	if input.PaymentMethods != nil {
		shopInput.PaymentMethods = domain.PaymentMethods{
			Cash:    input.PaymentMethods.Cash,
			GCash:   input.PaymentMethods.Gcash,
			Paymaya: input.PaymentMethods.Paymaya,
			Card:    input.PaymentMethods.Card,
		}
	}

	// Handle delivery options
	if input.Delivery != nil {
		shopInput.Delivery = domain.DeliveryOptions{
			Available: input.Delivery.Available,
		}
		if input.Delivery.Radius != nil {
			shopInput.Delivery.Radius = *input.Delivery.Radius
		}
		if input.Delivery.Fee != nil {
			shopInput.Delivery.Fee = *input.Delivery.Fee
		}
		if input.Delivery.MinOrder != nil {
			shopInput.Delivery.MinOrder = *input.Delivery.MinOrder
		}
	}

	// Handle social media
	if input.SocialMedia != nil {
		if input.SocialMedia.Facebook != nil {
			shopInput.SocialMedia.Facebook = *input.SocialMedia.Facebook
		}
		if input.SocialMedia.Instagram != nil {
			shopInput.SocialMedia.Instagram = *input.SocialMedia.Instagram
		}
	}

	// Handle contact details
	if input.ContactDetails != nil {
		shopInput.ContactDetails = domain.ContactDetails{
			Phone:   input.ContactDetails.Phone,
			Email:   input.ContactDetails.Email,
			Address: input.ContactDetails.Address,
		}
	}

	result, err := r.ownerResolver.UpdateShop(ctx, id, userID, shopInput)
	if err != nil {
		return &ShopPayload{
			Success: false,
			Message: result["message"].(string),
		}, nil
	}
	data := result["data"].(map[string]interface{})

	// Parse createdAt time
	createdAt, _ := time.Parse(time.RFC3339, data["createdAt"].(string))

	// Build full Shop response
	shop := &Shop{
		ID:        data["id"].(string),
		Name:      data["name"].(string),
		Location:  data["location"].(string),
		CreatedAt: createdAt,
		Status:    ShopStatus(data["status"].(string)),
	}

	// Add coordinates
	if coords, ok := data["coordinates"].(map[string]float64); ok {
		shop.Coordinates = &Coordinates{
			Lat: coords["lat"],
			Lng: coords["lng"],
		}
	}

	// Add cover photo
	if coverPhoto, ok := data["coverPhoto"].(string); ok {
		shop.CoverPhoto = coverPhoto
	}

	// Add other photos
	if otherPhotos, ok := data["otherPhotos"].([]string); ok {
		shop.OtherPhotos = otherPhotos
	}

	// Add business hours
	if bh, ok := data["businessHours"].(domain.BusinessHours); ok {
		shop.BusinessHours = &BusinessHours{
			OpenTime:  bh.OpenTime,
			CloseTime: bh.CloseTime,
			Days:      bh.Days,
		}
	}

	// Add business type
	if bt, ok := data["businessType"].(string); ok {
		shop.BusinessType = BusinessType(bt)
	}

	// Add payment methods
	if pm, ok := data["paymentMethods"].(domain.PaymentMethods); ok {
		shop.PaymentMethods = &PaymentMethods{
			Cash:    pm.Cash,
			Gcash:   pm.GCash,
			Paymaya: pm.Paymaya,
			Card:    pm.Card,
		}
	}

	// Add delivery options
	if d, ok := data["delivery"].(domain.DeliveryOptions); ok {
		shop.Delivery = &DeliveryOptions{
			Available: d.Available,
		}
		if d.Radius > 0 {
			shop.Delivery.Radius = &d.Radius
		}
		if d.Fee > 0 {
			shop.Delivery.Fee = &d.Fee
		}
		if d.MinOrder > 0 {
			shop.Delivery.MinOrder = &d.MinOrder
		}
	}

	// Add social media
	if sm, ok := data["socialMedia"].(domain.SocialMedia); ok {
		shop.SocialMedia = &SocialMedia{}
		if sm.Facebook != "" {
			shop.SocialMedia.Facebook = &sm.Facebook
		}
		if sm.Instagram != "" {
			shop.SocialMedia.Instagram = &sm.Instagram
		}
	}

	// Add contact details
	if cd, ok := data["contactDetails"].(domain.ContactDetails); ok {
		shop.ContactDetails = &ContactDetails{
			Phone:   cd.Phone,
			Email:   cd.Email,
			Address: cd.Address,
		}
	}

	// Add verification - REQUIRED field, must always be set
	if v, ok := data["verification"].(domain.Verification); ok {
		shop.Verification = &Verification{
			IsVerified: v.IsVerified,
		}
		if v.VerifiedDate != "" {
			if verifiedTime, err := time.Parse(time.RFC3339, v.VerifiedDate); err == nil {
				shop.Verification.VerifiedDate = &verifiedTime
			}
		}
		if v.VerificationID != "" {
			shop.Verification.VerificationID = &v.VerificationID
		}
	} else {
		// Always set a default verification to avoid null
		shop.Verification = &Verification{
			IsVerified: false,
		}
	}

	return &ShopPayload{
		Success: result["success"].(bool),
		Message: result["message"].(string),
		Data:    shop,
	}, nil
}

// DeleteShop is the resolver for the deleteShop field.
func (r *mutationResolver) DeleteShop(ctx context.Context, id string) (*DeletePayload, error) {
	userID := middleware.GetUserID(ctx)
	if userID == "" {
		return &DeletePayload{
			Success: false,
			Message: "Authentication required",
		}, nil
	}
	result, err := r.ownerResolver.DeleteShop(ctx, id, userID)
	if err != nil {
		return &DeletePayload{
			Success: false,
			Message: result["message"].(string),
		}, nil
	}

	return &DeletePayload{
		Success: result["success"].(bool),
		Message: result["message"].(string),
	}, nil
}

// UpdateProfile is the resolver for the updateProfile field.
func (r *mutationResolver) UpdateProfile(ctx context.Context, input UpdateProfileInput) (*UserPayload, error) {
	userID := middleware.GetUserID(ctx)
	if userID == "" {
		return &UserPayload{
			Success: false,
			Message: "Authentication required",
		}, nil
	}
	firstName := ""
	lastName := ""
	phone := ""
	birthday := ""
	if input.FirstName != nil {
		firstName = *input.FirstName
	}
	if input.LastName != nil {
		lastName = *input.LastName
	}
	if input.Birthday != nil {
		birthday = *input.Birthday
	}

	result, err := r.userResolver.UpdateProfile(ctx, userID, firstName, lastName, phone, birthday)
	if err != nil {
		return &UserPayload{
			Success: false,
			Message: err.Error(),
		}, nil
	}
	data := result["data"].(map[string]interface{})

	createdAtStr := data["createdAt"].(string)
	updatedAtStr := data["updatedAt"].(string)
	createdAt, _ := time.Parse(time.RFC3339, createdAtStr)
	updatedAt, _ := time.Parse(time.RFC3339, updatedAtStr)

	return &UserPayload{
		Success: result["success"].(bool),
		Message: result["message"].(string),
		Data: &User{
			ID:        data["id"].(string),
			Name:      data["name"].(string),
			FirstName: firstName,
			LastName:  lastName,
			Email:     data["email"].(string),
			Role:      UserRole(data["role"].(string)),
			Birthday:  &birthday,
			IsActive:  data["isActive"].(bool),
			CreatedAt: createdAt,
			UpdatedAt: &updatedAt,
		},
	}, nil
}

// CreateUser is the resolver for the createUser field.
func (r *mutationResolver) CreateUser(ctx context.Context, input CreateUserInput) (*UserPayload, error) {
	result, err := r.userResolver.CreateUser(ctx, input.FirstName, input.LastName, input.Email, input.Password, string(input.Role))
	if err != nil {
		return &UserPayload{
			Success: false,
			Message: result["message"].(string),
		}, nil
	}
	data := result["data"].(map[string]interface{})

	return &UserPayload{
		Success: result["success"].(bool),
		Message: result["message"].(string),
		Data: &User{
			ID:       data["id"].(string),
			Name:     data["name"].(string),
			Email:    data["email"].(string),
			Role:     UserRole(data["role"].(string)),
			IsActive: data["isActive"].(bool),
		},
	}, nil
}

// DeleteUser is the resolver for the deleteUser field.
func (r *mutationResolver) DeleteUser(ctx context.Context, id string) (*DeletePayload, error) {
	result, err := r.userResolver.DeleteUser(ctx, id)
	if err != nil {
		return &DeletePayload{
			Success: false,
			Message: result["message"].(string),
		}, nil
	}

	return &DeletePayload{
		Success: result["success"].(bool),
		Message: result["message"].(string),
	}, nil
}

// UpdateUserStatus is the resolver for the updateUserStatus field.
func (r *mutationResolver) UpdateUserStatus(ctx context.Context, id string, isActive bool) (*UserPayload, error) {
	result, err := r.userResolver.UpdateUserStatus(ctx, id, isActive)
	if err != nil {
		return &UserPayload{
			Success: false,
			Message: result["message"].(string),
		}, nil
	}
	data := result["data"].(map[string]interface{})

	return &UserPayload{
		Success: result["success"].(bool),
		Message: result["message"].(string),
		Data: &User{
			ID:       data["id"].(string),
			IsActive: data["isActive"].(bool),
		},
	}, nil
}

// UploadProfilePhoto is the resolver for the uploadProfilePhoto field.
func (r *mutationResolver) UploadProfilePhoto(ctx context.Context, file graphql.Upload) (*UserPayload, error) {
	userID := middleware.GetUserID(ctx)
	if userID == "" {
		return &UserPayload{
			Success: false,
			Message: "Authentication required",
		}, nil
	}

	env := bootstrap.LoadEnv()
	if env.CloudinaryCloudName == "" || env.CloudinaryAPIKey == "" || env.CloudinaryAPISecret == "" {
		return &UserPayload{
			Success: false,
			Message: "Image upload service not configured",
		}, nil
	}

	uploader, err := imageutil.NewImageUploader(
		env.CloudinaryCloudName,
		env.CloudinaryAPIKey,
		env.CloudinaryAPISecret,
		env.CloudinaryFolder,
	)
	if err != nil {
		return &UserPayload{
			Success: false,
			Message: "Failed to initialize upload service",
		}, nil
	}

	folder := env.CloudinaryFolder + "/" + userID + "/profile"
	userUploader := uploader.WithFolder(folder)

	result, err := userUploader.UploadImage(ctx, file.File, file.Filename)
	if err != nil {
		return &UserPayload{
			Success: false,
			Message: "Upload failed: " + err.Error(),
		}, nil
	}

	userRepo := repository.NewUserRepository(r.db)
	userObjectID, err := primitive.ObjectIDFromHex(userID)
	if err != nil {
		return &UserPayload{
			Success: false,
			Message: "Invalid user ID",
		}, nil
	}

	err = userRepo.UpdateUserPhotos(ctx, userObjectID, &result.URL, nil)
	if err != nil {
		return &UserPayload{
			Success: false,
			Message: "Failed to update user: " + err.Error(),
		}, nil
	}

	user, err := userRepo.GetUserByID(ctx, userObjectID)
	if err != nil {
		return &UserPayload{
			Success: false,
			Message: "Failed to fetch updated user: " + err.Error(),
		}, nil
	}
	return &UserPayload{
		Success: true,
		Message: "Profile photo uploaded successfully",
		Data: &User{
			ID:           user.ID.Hex(),
			FirstName:    user.FirstName,
			LastName:     user.LastName,
			Email:        user.Email,
			Phone:        &user.Phone,
			Birthday:     &user.Birthday,
			Role:         UserRole(user.Role),
			ProfilePhoto: &user.ProfilePhoto,
			CoverPhoto:   &user.CoverPhoto,
			IsActive:     user.IsActive,
			CreatedAt:    user.CreatedAt,
			UpdatedAt:    &user.UpdatedAt,
		},
	}, nil
}

// UploadCoverPhoto is the resolver for the uploadCoverPhoto field.
func (r *mutationResolver) UploadCoverPhoto(ctx context.Context, file graphql.Upload) (*UserPayload, error) {
	userID := middleware.GetUserID(ctx)
	if userID == "" {
		return &UserPayload{
			Success: false,
			Message: "Authentication required",
		}, nil
	}

	env := bootstrap.LoadEnv()
	if env.CloudinaryCloudName == "" || env.CloudinaryAPIKey == "" || env.CloudinaryAPISecret == "" {
		return &UserPayload{
			Success: false,
			Message: "Image upload service not configured",
		}, nil
	}

	uploader, err := imageutil.NewImageUploader(
		env.CloudinaryCloudName,
		env.CloudinaryAPIKey,
		env.CloudinaryAPISecret,
		env.CloudinaryFolder,
	)
	if err != nil {
		return &UserPayload{
			Success: false,
			Message: "Failed to initialize upload service",
		}, nil
	}

	folder := env.CloudinaryFolder + "/" + userID + "/cover"
	userUploader := uploader.WithFolder(folder)

	result, err := userUploader.UploadImage(ctx, file.File, file.Filename)
	if err != nil {
		return &UserPayload{
			Success: false,
			Message: "Upload failed: " + err.Error(),
		}, nil
	}

	userRepo := repository.NewUserRepository(r.db)
	userObjectID, err := primitive.ObjectIDFromHex(userID)
	if err != nil {
		return &UserPayload{
			Success: false,
			Message: "Invalid user ID",
		}, nil
	}

	err = userRepo.UpdateUserPhotos(ctx, userObjectID, nil, &result.URL)
	if err != nil {
		return &UserPayload{
			Success: false,
			Message: "Failed to update user: " + err.Error(),
		}, nil
	}

	user, err := userRepo.GetUserByID(ctx, userObjectID)
	if err != nil {
		return &UserPayload{
			Success: false,
			Message: "Failed to fetch updated user: " + err.Error(),
		}, nil
	}
	return &UserPayload{
		Success: true,
		Message: "Cover photo uploaded successfully",
		Data: &User{
			ID:           user.ID.Hex(),
			FirstName:    user.FirstName,
			LastName:     user.LastName,
			Email:        user.Email,
			Phone:        &user.Phone,
			Birthday:     &user.Birthday,
			Role:         UserRole(user.Role),
			ProfilePhoto: &user.ProfilePhoto,
			CoverPhoto:   &user.CoverPhoto,
			IsActive:     user.IsActive,
			CreatedAt:    user.CreatedAt,
			UpdatedAt:    &user.UpdatedAt,
		},
	}, nil
}

// FollowUser is the resolver for the followUser field.
func (r *mutationResolver) FollowUser(ctx context.Context, userID string) (*UserPayload, error) {
	currentUserID := middleware.GetUserID(ctx)
	if currentUserID == "" {
		return &UserPayload{
			Success: false,
			Message: "Authentication required",
		}, nil
	}

	currentUserObjID, err := primitive.ObjectIDFromHex(currentUserID)
	if err != nil {
		return &UserPayload{
			Success: false,
			Message: "Invalid current user ID",
		}, nil
	}

	targetUserObjID, err := primitive.ObjectIDFromHex(userID)
	if err != nil {
		return &UserPayload{
			Success: false,
			Message: "Invalid target user ID",
		}, nil
	}

	userRepo := repository.NewUserRepository(r.db)
	userUseCase := usecase.NewUserUsecase(userRepo, "")

	err = userUseCase.FollowUser(ctx, currentUserObjID, targetUserObjID)
	if err != nil {
		return &UserPayload{
			Success: false,
			Message: "Failed to follow user: " + err.Error(),
		}, nil
	}

	user, err := userRepo.GetUserByID(ctx, targetUserObjID)
	if err != nil {
		return &UserPayload{
			Success: false,
			Message: "Failed to fetch user: " + err.Error(),
		}, nil
	}

	return &UserPayload{
		Success: true,
		Message: "User followed successfully",
		Data: &User{
			ID:           user.ID.Hex(),
			FirstName:    user.FirstName,
			LastName:     user.LastName,
			Email:        user.Email,
			Phone:        &user.Phone,
			Birthday:     &user.Birthday,
			Role:         UserRole(user.Role),
			ProfilePhoto: &user.ProfilePhoto,
			CoverPhoto:   &user.CoverPhoto,
			IsActive:     user.IsActive,
			CreatedAt:    user.CreatedAt,
			UpdatedAt:    &user.UpdatedAt,
		},
	}, nil
}

// UnfollowUser is the resolver for the unfollowUser field.
func (r *mutationResolver) UnfollowUser(ctx context.Context, userID string) (*UserPayload, error) {
	currentUserID := middleware.GetUserID(ctx)
	if currentUserID == "" {
		return &UserPayload{
			Success: false,
			Message: "Authentication required",
		}, nil
	}

	currentUserObjID, err := primitive.ObjectIDFromHex(currentUserID)
	if err != nil {
		return &UserPayload{
			Success: false,
			Message: "Invalid current user ID",
		}, nil
	}

	targetUserObjID, err := primitive.ObjectIDFromHex(userID)
	if err != nil {
		return &UserPayload{
			Success: false,
			Message: "Invalid target user ID",
		}, nil
	}

	userRepo := repository.NewUserRepository(r.db)
	userUseCase := usecase.NewUserUsecase(userRepo, "")

	err = userUseCase.UnfollowUser(ctx, currentUserObjID, targetUserObjID)
	if err != nil {
		return &UserPayload{
			Success: false,
			Message: "Failed to unfollow user: " + err.Error(),
		}, nil
	}

	user, err := userRepo.GetUserByID(ctx, targetUserObjID)
	if err != nil {
		return &UserPayload{
			Success: false,
			Message: "Failed to fetch user: " + err.Error(),
		}, nil
	}

	return &UserPayload{
		Success: true,
		Message: "User unfollowed successfully",
		Data: &User{
			ID:           user.ID.Hex(),
			FirstName:    user.FirstName,
			LastName:     user.LastName,
			Email:        user.Email,
			Phone:        &user.Phone,
			Birthday:     &user.Birthday,
			Role:         UserRole(user.Role),
			ProfilePhoto: &user.ProfilePhoto,
			CoverPhoto:   &user.CoverPhoto,
			IsActive:     user.IsActive,
			CreatedAt:    user.CreatedAt,
			UpdatedAt:    &user.UpdatedAt,
		},
	}, nil
}

// UploadImage is a generic image upload resolver for posts and other content.
func (r *mutationResolver) UploadImage(ctx context.Context, file graphql.Upload, folder *string) (*ImageUploadPayload, error) {
	userID := middleware.GetUserID(ctx)
	if userID == "" {
		return &ImageUploadPayload{
			Success: false,
			Message: "Authentication required",
		}, nil
	}

	env := bootstrap.LoadEnv()
	if env.CloudinaryCloudName == "" || env.CloudinaryAPIKey == "" || env.CloudinaryAPISecret == "" {
		return &ImageUploadPayload{
			Success: false,
			Message: "Image upload service not configured",
		}, nil
	}

	uploader, err := imageutil.NewImageUploader(
		env.CloudinaryCloudName,
		env.CloudinaryAPIKey,
		env.CloudinaryAPISecret,
		env.CloudinaryFolder,
	)
	if err != nil {
		return &ImageUploadPayload{
			Success: false,
			Message: "Failed to initialize upload service",
		}, nil
	}

	// Use provided folder or default to user-specific uploads folder
	uploadFolder := env.CloudinaryFolder + "/" + userID + "/uploads"
	if folder != nil && *folder != "" {
		uploadFolder = env.CloudinaryFolder + "/" + userID + "/" + *folder
	}
	userUploader := uploader.WithFolder(uploadFolder)

	result, err := userUploader.UploadImage(ctx, file.File, file.Filename)
	if err != nil {
		return &ImageUploadPayload{
			Success: false,
			Message: "Upload failed: " + err.Error(),
		}, nil
	}

	return &ImageUploadPayload{
		Success:  true,
		Message:  "Image uploaded successfully",
		URL:      &result.URL,
		PublicID: &result.PublicID,
	}, nil
}

// AddComment is the resolver for the addComment field.
func (r *mutationResolver) AddComment(ctx context.Context, postID string, text string) (*CommentPayload, error) {
	userID := middleware.GetUserID(ctx)
	if userID == "" {
		return &CommentPayload{
			Success: false,
			Message: "Authentication required",
		}, nil
	}

	result, err := r.postResolver.AddComment(ctx, postID, userID, text)
	if err != nil {
		return &CommentPayload{
			Success: false,
			Message: result["message"].(string),
		}, nil
	}

	if !result["success"].(bool) {
		return &CommentPayload{
			Success: false,
			Message: result["message"].(string),
		}, nil
	}

	commentData := result["data"].(map[string]interface{})
	comment := r.Resolver.formatCommentData(commentData)

	return &CommentPayload{
		Success: true,
		Message: result["message"].(string),
		Data:    comment,
	}, nil
}

// DeleteComment is the resolver for the deleteComment field.
func (r *mutationResolver) DeleteComment(ctx context.Context, commentID string, postID string) (*DeletePayload, error) {
	userID := middleware.GetUserID(ctx)
	if userID == "" {
		return &DeletePayload{
			Success: false,
			Message: "Authentication required",
		}, nil
	}

	result, err := r.postResolver.DeleteComment(ctx, commentID, postID, userID)
	if err != nil {
		return &DeletePayload{
			Success: false,
			Message: result["message"].(string),
		}, nil
	}

	return &DeletePayload{
		Success: result["success"].(bool),
		Message: result["message"].(string),
	}, nil
}

// CreateInquiry is the resolver for the createInquiry field
func (r *mutationResolver) CreateInquiry(ctx context.Context, input CreateInquiryInput) (*InquiryPayload, error) {
	userID := middleware.GetUserID(ctx)
	if userID == "" {
		return &InquiryPayload{
			Success: false,
			Message: "Authentication required",
		}, nil
	}

	result, err := r.inquiryResolver.CreateInquiry(ctx, userID, input.ShopID, input.Item, input.Message)
	if err != nil {
		return &InquiryPayload{
			Success: false,
			Message: result["message"].(string),
		}, nil
	}

	if !result["success"].(bool) {
		return &InquiryPayload{
			Success: false,
			Message: result["message"].(string),
		}, nil
	}

	inquiryData := result["data"].(*domain.Inquiry)
	return &InquiryPayload{
		Success: true,
		Message: result["message"].(string),
		Data:    r.formatInquiryData(inquiryData),
	}, nil
}

// ReplyToInquiry is the resolver for the replyToInquiry field
func (r *mutationResolver) ReplyToInquiry(ctx context.Context, input ReplyToInquiryInput) (*InquiryReplyPayload, error) {
	userID := middleware.GetUserID(ctx)
	if userID == "" {
		return &InquiryReplyPayload{
			Success: false,
			Message: "Authentication required",
		}, nil
	}

	result, err := r.inquiryResolver.ReplyToInquiry(ctx, input.InquiryID, userID, input.Message)
	if err != nil {
		return &InquiryReplyPayload{
			Success: false,
			Message: result["message"].(string),
		}, nil
	}

	if !result["success"].(bool) {
		return &InquiryReplyPayload{
			Success: false,
			Message: result["message"].(string),
		}, nil
	}

	replyData := result["data"].(domain.InquiryReply)
	return &InquiryReplyPayload{
		Success: true,
		Message: result["message"].(string),
		Data:    r.formatInquiryReplyData(replyData),
	}, nil
}

// UpdateInquiryStatus is the resolver for the updateInquiryStatus field
func (r *mutationResolver) UpdateInquiryStatus(ctx context.Context, input UpdateInquiryStatusInput) (*InquiryPayload, error) {
	userID := middleware.GetUserID(ctx)
	if userID == "" {
		return &InquiryPayload{
			Success: false,
			Message: "Authentication required",
		}, nil
	}

	result, err := r.inquiryResolver.UpdateInquiryStatus(ctx, input.InquiryID, domain.InquiryStatus(input.Status))
	if err != nil {
		return &InquiryPayload{
			Success: false,
			Message: result["message"].(string),
		}, nil
	}

	if !result["success"].(bool) {
		return &InquiryPayload{
			Success: false,
			Message: result["message"].(string),
		}, nil
	}

	inquiryData := result["data"].(*domain.Inquiry)
	return &InquiryPayload{
		Success: true,
		Message: result["message"].(string),
		Data:    r.formatInquiryData(inquiryData),
	}, nil
}

// Me is the resolver for the me field.
func (r *queryResolver) Me(ctx context.Context) (*UserPayload, error) {
	userID := middleware.GetUserID(ctx)
	if userID == "" {
		return &UserPayload{
			Success: false,
			Message: "Authentication required",
		}, nil
	}
	result, err := r.userResolver.Me(ctx, userID)
	if err != nil {
		return &UserPayload{
			Success: result["success"].(bool),
			Message: result["message"].(string),
		}, nil
	}
	data := result["data"].(map[string]interface{})

	// Parse time fields with defaults if missing
	createdAt := time.Now()
	updatedAt := time.Now()
	if ca, ok := data["createdAt"].(string); ok && ca != "" {
		if parsed, err := time.Parse(time.RFC3339, ca); err == nil {
			createdAt = parsed
		}
	}
	if ua, ok := data["updatedAt"].(string); ok && ua != "" {
		if parsed, err := time.Parse(time.RFC3339, ua); err == nil {
			updatedAt = parsed
		}
	}

	// Extract followers and following arrays
	var followers, following []string
	if f, ok := data["followers"].([]string); ok {
		followers = f
	}
	if f, ok := data["following"].([]string); ok {
		following = f
	}

	// Get follower/following counts
	followersCount := 0
	followingCount := 0
	if fc, ok := data["followersCount"].(int); ok {
		followersCount = fc
	}
	if fc, ok := data["followingCount"].(int); ok {
		followingCount = fc
	}

	return &UserPayload{
		Success: result["success"].(bool),
		Message: result["message"].(string),
		Data: &User{
			ID:             data["id"].(string),
			Name:           data["name"].(string),
			Email:          data["email"].(string),
			FirstName:      data["firstName"].(string),
			LastName:       data["lastName"].(string),
			Phone:          getStringPtr(data["phone"]),
			Birthday:       getStringPtr(data["birthday"]),
			Role:           UserRole(data["role"].(string)),
			IsActive:       data["isActive"].(bool),
			ProfilePhoto:   getStringPtr(data["profilePhoto"]),
			CoverPhoto:     getStringPtr(data["coverPhoto"]),
			Followers:      followers,
			Following:      following,
			FollowersCount: followersCount,
			FollowingCount: followingCount,
			CreatedAt:      createdAt,
			UpdatedAt:      &updatedAt,
		},
	}, nil
}

// Health is the resolver for the health field.
func (r *queryResolver) Health(ctx context.Context) (string, error) {
	return "GraphQL API is healthy", nil
}

// Posts is the resolver for the posts field.
func (r *queryResolver) Posts(ctx context.Context, page *int, limit *int) (*PostsPayload, error) {
	pageVal := 1
	limitVal := 10
	if page != nil {
		pageVal = *page
	}
	if limit != nil {
		limitVal = *limit
	}

	userID := middleware.GetUserID(ctx)
	result, err := r.postResolver.GetPosts(ctx, pageVal, limitVal, userID)
	if err != nil {
		return &PostsPayload{
			Success: false,
			Message: result["message"].(string),
			Data:    []*Post{},
			Total:   0,
			Page:    pageVal,
			Limit:   limitVal,
		}, nil
	}

	postData := result["data"].([]map[string]interface{})
	posts := make([]*Post, len(postData))
	for i, postMap := range postData {
		posts[i] = r.formatPostFromMap(postMap)
	}

	total := int(result["total"].(int64))

	return &PostsPayload{
		Success: result["success"].(bool),
		Message: result["message"].(string),
		Data:    posts,
		Total:   total,
		Page:    pageVal,
		Limit:   limitVal,
	}, nil
}

// Post is the resolver for the post field.
func (r *queryResolver) Post(ctx context.Context, id string) (*PostPayload, error) {
	userID := middleware.GetUserID(ctx)
	result, err := r.postResolver.GetPost(ctx, id, userID)
	if err != nil {
		return &PostPayload{
			Success: false,
			Message: result["message"].(string),
		}, nil
	}

	data := result["data"].(map[string]interface{})
	return &PostPayload{
		Success: result["success"].(bool),
		Message: result["message"].(string),
		Data:    r.formatPostFromMap(data),
	}, nil
}

// MyPosts is the resolver for the myPosts field.
func (r *queryResolver) MyPosts(ctx context.Context, page *int, limit *int) (*PostsPayload, error) {
	pageVal := 1
	limitVal := 10
	if page != nil {
		pageVal = *page
	}
	if limit != nil {
		limitVal = *limit
	}

	userID := middleware.GetUserID(ctx)
	if userID == "" {
		return &PostsPayload{
			Success: false,
			Message: "Authentication required",
			Data:    []*Post{},
			Total:   0,
			Page:    pageVal,
			Limit:   limitVal,
		}, nil
	}

	result, err := r.postResolver.GetMyPosts(ctx, userID, pageVal, limitVal)
	if err != nil {
		return &PostsPayload{
			Success: false,
			Message: result["message"].(string),
			Data:    []*Post{},
			Total:   0,
			Page:    pageVal,
			Limit:   limitVal,
		}, nil
	}

	postData := result["data"].([]map[string]interface{})
	posts := make([]*Post, len(postData))
	for i, postMap := range postData {
		posts[i] = r.formatPostFromMap(postMap)
	}

	total := int(result["total"].(int64))

	return &PostsPayload{
		Success: result["success"].(bool),
		Message: result["message"].(string),
		Data:    posts,
		Total:   total,
		Page:    pageVal,
		Limit:   limitVal,
	}, nil
}

// UserPosts is the resolver for the userPosts field.
func (r *queryResolver) UserPosts(ctx context.Context, userID string, page *int, limit *int) (*PostsPayload, error) {
	pageVal := 1
	limitVal := 10
	if page != nil {
		pageVal = *page
	}
	if limit != nil {
		limitVal = *limit
	}

	result, err := r.postResolver.GetPostsByUserID(ctx, userID, pageVal, limitVal)
	if err != nil {
		return &PostsPayload{
			Success: false,
			Message: result["message"].(string),
			Data:    []*Post{},
			Total:   0,
			Page:    pageVal,
			Limit:   limitVal,
		}, nil
	}

	postData := result["data"].([]map[string]interface{})
	posts := make([]*Post, len(postData))
	for i, postMap := range postData {
		posts[i] = r.formatPostFromMap(postMap)
	}

	total := int(result["total"].(int64))

	return &PostsPayload{
		Success: result["success"].(bool),
		Message: result["message"].(string),
		Data:    posts,
		Total:   total,
		Page:    pageVal,
		Limit:   limitVal,
	}, nil
}

// PostsNearLocation is the resolver for the postsNearLocation field.
func (r *queryResolver) PostsNearLocation(ctx context.Context, lat float64, lng float64, radius *float64, page *int, limit *int) (*PostsPayload, error) {
	pageVal := 1
	limitVal := 10
	radiusVal := 5000.0 // Default 5km
	if page != nil {
		pageVal = *page
	}
	if limit != nil {
		limitVal = *limit
	}
	if radius != nil {
		radiusVal = *radius
	}

	userID := middleware.GetUserID(ctx)
	result, err := r.postResolver.GetPostsNearLocation(ctx, lat, lng, radiusVal, pageVal, limitVal, userID)
	if err != nil {
		return &PostsPayload{
			Success: false,
			Message: result["message"].(string),
			Data:    []*Post{},
			Total:   0,
			Page:    pageVal,
			Limit:   limitVal,
		}, nil
	}

	postData := result["data"].([]map[string]interface{})
	posts := make([]*Post, len(postData))
	for i, postMap := range postData {
		posts[i] = r.formatPostFromMap(postMap)
	}

	total := int(result["total"].(int64))

	return &PostsPayload{
		Success: result["success"].(bool),
		Message: result["message"].(string),
		Data:    posts,
		Total:   total,
		Page:    pageVal,
		Limit:   limitVal,
	}, nil
}

// SearchPostsByTitle is the resolver for the searchPostsByTitle field (public API)
func (r *queryResolver) SearchPostsByTitle(ctx context.Context, query string, page *int, limit *int) (*PostsSearchPayload, error) {
	pageVal := 1
	limitVal := 10
	if page != nil {
		pageVal = *page
	}
	if limit != nil {
		limitVal = *limit
	}

	result, err := r.postResolver.SearchPostsByTitle(ctx, query, pageVal, limitVal)
	if err != nil {
		return &PostsSearchPayload{
			Success: false,
			Message: result["message"].(string),
			Data:    []*PostSearchResult{},
			Total:   0,
		}, nil
	}

	postData := result["data"].([]map[string]interface{})
	posts := make([]*PostSearchResult, len(postData))
	for i, postMap := range postData {
		var location *Location
		if postMap["location"] != nil {
			locMap := postMap["location"].(map[string]interface{})
			location = &Location{
				Lat:  locMap["lat"].(float64),
				Lng:  locMap["lng"].(float64),
				Name: locMap["name"].(string),
			}
		}

		var authorProfilePhoto *string
		if postMap["authorProfilePhoto"] != nil && postMap["authorProfilePhoto"].(string) != "" {
			photo := postMap["authorProfilePhoto"].(string)
			authorProfilePhoto = &photo
		}

		posts[i] = &PostSearchResult{
			ID:                 postMap["id"].(string),
			Title:              postMap["title"].(string),
			AuthorName:         postMap["authorName"].(string),
			AuthorProfilePhoto: authorProfilePhoto,
			Location:           location,
		}
	}

	total := int(result["total"].(int64))

	return &PostsSearchPayload{
		Success: result["success"].(bool),
		Message: result["message"].(string),
		Data:    posts,
		Total:   total,
	}, nil
}

// Comments is the resolver for the comments field.
func (r *queryResolver) Comments(ctx context.Context, postID string, page *int, limit *int) (*CommentsPayload, error) {
	pageVal := 1
	limitVal := 5 // Default to 5 comments per page
	if page != nil {
		pageVal = *page
	}
	if limit != nil {
		limitVal = *limit
	}

	userID := middleware.GetUserID(ctx)
	result, err := r.postResolver.GetCommentsPaginated(ctx, postID, pageVal, limitVal, userID)
	if err != nil {
		return &CommentsPayload{
			Success: false,
			Message: err.Error(),
			Data:    []*Comment{},
			Total:   0,
			Page:    pageVal,
			Limit:   limitVal,
			HasMore: false,
		}, nil
	}

	comments := make([]*Comment, 0)
	if data, ok := result["data"].([]map[string]interface{}); ok {
		for _, commentData := range data {
			comment := r.formatCommentData(commentData)
			comments = append(comments, comment)
		}
	}

	total := int(result["total"].(int64))
	hasMore := result["hasMore"].(bool)

	return &CommentsPayload{
		Success: result["success"].(bool),
		Message: result["message"].(string),
		Data:    comments,
		Total:   total,
		Page:    pageVal,
		Limit:   limitVal,
		HasMore: hasMore,
	}, nil
}

// Item is the resolver for the item field.
func (r *queryResolver) Item(ctx context.Context, id string) (*ItemPayload, error) {
	objectID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return &ItemPayload{
			Success: false,
			Message: "Invalid item ID format",
		}, nil
	}

	product, err := r.ownerResolver.GetProductByID(ctx, objectID)
	if err != nil {
		return &ItemPayload{
			Success: false,
			Message: "Item not found",
		}, nil
	}

	return &ItemPayload{
		Success: true,
		Message: "Item retrieved successfully",
		Data: &Item{
			ID:       product.ID.Hex(),
			Name:     product.Name,
			Price:    product.Price,
			Stock:    product.Stock,
			IsActive: product.IsActive,
		},
	}, nil
}

// Items is the resolver for the items field.
func (r *queryResolver) Items(ctx context.Context, input *ProductSearchInput) (*ItemsPayload, error) {
	pageVal := 1
	limitVal := 10
	if input != nil && input.Page != nil {
		pageVal = *input.Page
	}
	if input != nil && input.Limit != nil {
		limitVal = *input.Limit
	}

	var shopId *string
	if input != nil && input.ShopID != nil {
		shopId = input.ShopID
	}

	result, _ := r.productResolver.Items(ctx, pageVal, limitVal, input.Query, shopId)
	data := result["data"].([]map[string]interface{})
	items := make([]*Item, len(data))
	for i, itemMap := range data {
		// Safely extract stock value (could be int or float64)
		var stockVal int
		if s, ok := itemMap["stock"].(int); ok {
			stockVal = s
		} else if s, ok := itemMap["stock"].(float64); ok {
			stockVal = int(s)
		}

		// Safely extract price value
		var priceVal float64
		if p, ok := itemMap["price"].(float64); ok {
			priceVal = p
		} else if p, ok := itemMap["price"].(int); ok {
			priceVal = float64(p)
		}

		items[i] = &Item{
			ID:       getStringValue(itemMap, "id"),
			Name:     getStringValue(itemMap, "name"),
			Price:    priceVal,
			Stock:    stockVal,
			IsActive: getBoolValue(itemMap, "isActive"),
		}

		// Add cover photo if present
		if coverPhoto, ok := itemMap["coverPhoto"].(string); ok && coverPhoto != "" {
			items[i].CoverPhoto = &coverPhoto
		}
	}

	return &ItemsPayload{
		Success: result["success"].(bool),
		Message: result["message"].(string),
		Data:    items,
	}, nil
}

// MyItems is the resolver for the myItems field.
func (r *queryResolver) MyItems(ctx context.Context, page *int, limit *int, shopId *string) (*ItemsPayload, error) {
	pageVal := 1
	limitVal := 10
	if page != nil {
		pageVal = *page
	}
	if limit != nil {
		limitVal = *limit
	}

	result, _ := r.ownerResolver.GetOwnerItems(ctx, middleware.GetUserID(ctx), pageVal, limitVal, shopId)
	data := result["data"].([]map[string]interface{})
	items := make([]*Item, len(data))
	for i, itemMap := range data {
		// Handle stock type (could be int or float64 from JSON/map)
		var stock int
		switch v := itemMap["stock"].(type) {
		case int:
			stock = v
		case int32:
			stock = int(v)
		case int64:
			stock = int(v)
		case float64:
			stock = int(v)
		default:
			stock = 0
		}
		// Handle rating
		var ratingPtr *float64
		if r, ok := itemMap["rating"].(float64); ok && r > 0 {
			ratingPtr = &r
		}

		// Handle cover photo
		var coverPhotoPtr *string
		if coverPhoto, ok := itemMap["coverPhoto"].(string); ok && coverPhoto != "" {
			coverPhotoPtr = &coverPhoto
		}

		items[i] = &Item{
			ID:          itemMap["id"].(string),
			Name:        itemMap["name"].(string),
			Description: itemMap["description"].(string),
			Category:    itemMap["category"].(string),
			Price:       itemMap["price"].(float64),
			Stock:       stock,
			IsActive:    itemMap["isActive"].(bool),
			Rating:      ratingPtr,
			CoverPhoto:  coverPhotoPtr,
			ShopID:      itemMap["shopId"].(string),
		}
	}

	total := 0
	if totalVal, ok := result["total"].(int64); ok {
		total = int(totalVal)
	}

	totalPages := 1
	if tpVal, ok := result["totalPages"].(int); ok {
		totalPages = tpVal
	}

	return &ItemsPayload{
		Success:    result["success"].(bool),
		Message:    result["message"].(string),
		Data:       items,
		Total:      total,
		Page:       pageVal,
		TotalPages: totalPages,
	}, nil
}

// TopRatedItems is the resolver for the topRatedItems field.
func (r *queryResolver) TopRatedItems(ctx context.Context, shopID string, limit *int) (*ItemsPayload, error) {
	limitVal := 5
	if limit != nil && *limit > 0 {
		limitVal = *limit
		if limitVal > 10 {
			limitVal = 10 // Cap at 10
		}
	}

	result, err := r.ownerResolver.GetTopRatedItemsByShop(ctx, shopID, limitVal)
	if err != nil {
		return &ItemsPayload{
			Success: false,
			Message: err.Error(),
			Data:    []*Item{},
		}, nil
	}

	data := result["data"].([]map[string]interface{})
	items := make([]*Item, len(data))
	for i, itemMap := range data {
		// Handle stock type
		var stock int
		switch v := itemMap["stock"].(type) {
		case int:
			stock = v
		case int32:
			stock = int(v)
		case int64:
			stock = int(v)
		case float64:
			stock = int(v)
		default:
			stock = 0
		}
		// Handle rating
		var ratingPtr *float64
		if r, ok := itemMap["rating"].(float64); ok && r > 0 {
			ratingPtr = &r
		}
		items[i] = &Item{
			ID:          itemMap["id"].(string),
			Name:        itemMap["name"].(string),
			Description: itemMap["description"].(string),
			Category:    itemMap["category"].(string),
			Price:       itemMap["price"].(float64),
			Stock:       stock,
			IsActive:    itemMap["isActive"].(bool),
			Rating:      ratingPtr,
			ShopID:      itemMap["shopId"].(string),
		}
	}

	return &ItemsPayload{
		Success: result["success"].(bool),
		Message: result["message"].(string),
		Data:    items,
	}, nil
}

// Shop is the resolver for the shop field.
func (r *queryResolver) Shop(ctx context.Context, id string) (*ShopPayload, error) {
	objectID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return &ShopPayload{
			Success: false,
			Message: "Invalid shop ID format",
		}, nil
	}

	store, err := r.ownerResolver.GetStoreByID(ctx, objectID)
	if err != nil {
		return &ShopPayload{
			Success: false,
			Message: "Shop not found",
		}, nil
	}

	return &ShopPayload{
		Success: true,
		Message: "Shop retrieved successfully",
		Data: &Shop{
			ID:     store.ID.Hex(),
			Name:   store.Name,
			Status: ShopStatus("ACTIVE"),
		},
	}, nil
}

// MyShops is the resolver for the myShops field.
func (r *queryResolver) MyShops(ctx context.Context, page *int, limit *int) (*ShopsPayload, error) {
	pageVal := 1
	limitVal := 10
	if page != nil {
		pageVal = *page
	}
	if limit != nil {
		limitVal = *limit
	}

	userID := middleware.GetUserID(ctx)
	if userID == "" {
		return &ShopsPayload{
			Success: false,
			Message: "Authentication required",
			Data:    []*Shop{},
		}, nil
	}

	result, err := r.ownerResolver.GetOwnerShops(ctx, userID, pageVal, limitVal)
	if err != nil {
		return &ShopsPayload{
			Success: false,
			Message: result["message"].(string),
			Data:    []*Shop{},
		}, nil
	}

	shopData := result["data"].([]map[string]interface{})
	shops := make([]*Shop, len(shopData))
	for i, shopMap := range shopData {
		shop := &Shop{
			ID:       shopMap["id"].(string),
			Name:     shopMap["name"].(string),
			Location: shopMap["location"].(string),
			Status:   ShopStatus(shopMap["status"].(string)),
		}

		// Parse description
		fmt.Printf("DEBUG MyShops resolver: shop %s description from map = '%v'\n", shop.ID, shopMap["description"])
		if description, ok := shopMap["description"].(string); ok && description != "" {
			shop.Description = &description
		}

		// Parse createdAt
		if createdAtStr, ok := shopMap["createdAt"].(string); ok {
			createdAt, _ := time.Parse(time.RFC3339, createdAtStr)
			shop.CreatedAt = createdAt
		}

		// Parse coordinates
		if coords, ok := shopMap["coordinates"].(map[string]float64); ok {
			shop.Coordinates = &Coordinates{
				Lat: coords["lat"],
				Lng: coords["lng"],
			}
		}

		// Cover photo
		if coverPhoto, ok := shopMap["coverPhoto"].(string); ok {
			shop.CoverPhoto = coverPhoto
		}

		// Other photos
		if otherPhotos, ok := shopMap["otherPhotos"].([]string); ok {
			shop.OtherPhotos = otherPhotos
		}

		// Business hours
		if bh, ok := shopMap["businessHours"].(domain.BusinessHours); ok {
			shop.BusinessHours = &BusinessHours{
				OpenTime:  bh.OpenTime,
				CloseTime: bh.CloseTime,
				Days:      bh.Days,
			}
		}

		// Business type
		if bt, ok := shopMap["businessType"].(string); ok {
			shop.BusinessType = BusinessType(bt)
		}

		// Payment methods
		if pm, ok := shopMap["paymentMethods"].(domain.PaymentMethods); ok {
			shop.PaymentMethods = &PaymentMethods{
				Cash:    pm.Cash,
				Gcash:   pm.GCash,
				Paymaya: pm.Paymaya,
				Card:    pm.Card,
			}
		}

		// Delivery options
		if d, ok := shopMap["delivery"].(domain.DeliveryOptions); ok {
			shop.Delivery = &DeliveryOptions{
				Available: d.Available,
			}
			if d.Radius > 0 {
				shop.Delivery.Radius = &d.Radius
			}
			if d.Fee > 0 {
				shop.Delivery.Fee = &d.Fee
			}
			if d.MinOrder > 0 {
				shop.Delivery.MinOrder = &d.MinOrder
			}
		}

		// Social media
		if sm, ok := shopMap["socialMedia"].(domain.SocialMedia); ok {
			shop.SocialMedia = &SocialMedia{}
			if sm.Facebook != "" {
				shop.SocialMedia.Facebook = &sm.Facebook
			}
			if sm.Instagram != "" {
				shop.SocialMedia.Instagram = &sm.Instagram
			}
		}

		// Contact details
		if cd, ok := shopMap["contactDetails"].(domain.ContactDetails); ok {
			shop.ContactDetails = &ContactDetails{
				Phone:   cd.Phone,
				Email:   cd.Email,
				Address: cd.Address,
			}
		}

		// Verification - REQUIRED field, must always be set
		if v, ok := shopMap["verification"].(domain.Verification); ok {
			shop.Verification = &Verification{
				IsVerified: v.IsVerified,
			}
			if v.VerifiedDate != "" {
				if verifiedTime, err := time.Parse(time.RFC3339, v.VerifiedDate); err == nil {
					shop.Verification.VerifiedDate = &verifiedTime
				}
			}
			if v.VerificationID != "" {
				shop.Verification.VerificationID = &v.VerificationID
			}
		} else {
			// Always set a default verification to avoid null
			shop.Verification = &Verification{
				IsVerified: false,
			}
		}

		shops[i] = shop
	}

	return &ShopsPayload{
		Success: result["success"].(bool),
		Message: result["message"].(string),
		Data:    shops,
	}, nil
}

// SearchShops is the resolver for the searchShops field.
func (r *queryResolver) SearchShops(ctx context.Context, query string, page *int, limit *int) (*ShopsPayload, error) {
	pageVal := 1
	limitVal := 10
	if page != nil {
		pageVal = *page
	}
	if limit != nil {
		limitVal = *limit
	}

	req := &domain.StoreSearchRequest{
		Query: query,
		Page:  pageVal,
		Limit: limitVal,
	}

	stores, total, err := r.storeRepo.SearchStores(ctx, req)
	if err != nil {
		return &ShopsPayload{
			Success: false,
			Message: err.Error(),
			Data:    []*Shop{},
		}, nil
	}

	shops := make([]*Shop, len(stores))
	for i, store := range stores {
		shop := &Shop{
			ID:           store.ID.Hex(),
			Name:         store.Name,
			Location:     store.Address,
			Status:       ShopStatus(store.Status),
			CoverPhoto:   store.CoverPhoto,
			BusinessType: BusinessType(store.BusinessType),
		}

		// Add description if present
		if store.Description != "" {
			shop.Description = &store.Description
		}

		// Parse createdAt
		var createdAt time.Time
		if !store.CreatedAt.IsZero() {
			createdAt = store.CreatedAt
		}
		shop.CreatedAt = createdAt

		// Always set coordinates (required field in schema)
		shop.Coordinates = &Coordinates{
			Lat: store.Latitude,
			Lng: store.Longitude,
		}

		// Always set business hours (required field in schema)
		shop.BusinessHours = &BusinessHours{
			OpenTime:  store.BusinessHours.OpenTime,
			CloseTime: store.BusinessHours.CloseTime,
			Days:      store.BusinessHours.Days,
		}

		// Always set contact details (required field in schema)
		shop.ContactDetails = &ContactDetails{
			Phone:   store.ContactDetails.Phone,
			Email:   store.ContactDetails.Email,
			Address: store.ContactDetails.Address,
		}

		shops[i] = shop
	}

	return &ShopsPayload{
		Success: true,
		Message: fmt.Sprintf("Found %d shops", total),
		Data:    shops,
	}, nil
}

// ShopsByProduct is the resolver for the shopsByProduct field.
func (r *queryResolver) ShopsByProduct(ctx context.Context, productName string) (*ShopsPayload, error) {
	// Search for products with matching name
	req := &domain.ProductSearchRequest{
		Query: productName,
		Limit: 100,
	}

	products, _, err := r.productRepo.SearchProducts(ctx, req)
	if err != nil {
		return &ShopsPayload{
			Success: false,
			Message: err.Error(),
			Data:    []*Shop{},
		}, nil
	}

	// Collect unique store IDs
	storeIDMap := make(map[string]bool)
	var storeIDs []primitive.ObjectID
	for _, product := range products {
		storeID := product.StoreID.Hex()
		if !storeIDMap[storeID] {
			storeIDMap[storeID] = true
			storeIDs = append(storeIDs, product.StoreID)
		}
	}

	// Fetch store details for each unique store ID
	var shops []*Shop
	for _, storeID := range storeIDs {
		store, err := r.storeRepo.GetStoreByID(ctx, storeID)
		if err != nil {
			continue // Skip if store not found
		}

		shop := &Shop{
			ID:           store.ID.Hex(),
			Name:         store.Name,
			Location:     store.Address,
			Status:       ShopStatus(store.Status),
			CoverPhoto:   store.CoverPhoto,
			BusinessType: BusinessType(store.BusinessType),
		}

		// Add description if present
		if store.Description != "" {
			shop.Description = &store.Description
		}

		// Parse createdAt
		var createdAt time.Time
		if !store.CreatedAt.IsZero() {
			createdAt = store.CreatedAt
		}
		shop.CreatedAt = createdAt

		// Add coordinates if present
		if store.Latitude != 0 && store.Longitude != 0 {
			shop.Coordinates = &Coordinates{
				Lat: store.Latitude,
				Lng: store.Longitude,
			}
		}

		// Always set business hours (required field in schema)
		shop.BusinessHours = &BusinessHours{
			OpenTime:  store.BusinessHours.OpenTime,
			CloseTime: store.BusinessHours.CloseTime,
			Days:      store.BusinessHours.Days,
		}

		// Always set contact details (required field in schema)
		shop.ContactDetails = &ContactDetails{
			Phone:   store.ContactDetails.Phone,
			Email:   store.ContactDetails.Email,
			Address: store.ContactDetails.Address,
		}

		shops = append(shops, shop)
	}

	return &ShopsPayload{
		Success: true,
		Message: fmt.Sprintf("Found %d shops with product '%s'", len(shops), productName),
		Data:    shops,
	}, nil
}

// User is the resolver for the user field.
func (r *queryResolver) User(ctx context.Context, id string) (*User, error) {
	userID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return nil, err
	}

	userRepo := repository.NewUserRepository(r.db)
	currentUserID := middleware.GetUserID(ctx)

	user, err := userRepo.GetUserByID(ctx, userID)
	if err != nil {
		return nil, err
	}

	// Check if current user is following this user
	isFollowing := false
	if currentUserID != "" {
		currentUserObjID, err := primitive.ObjectIDFromHex(currentUserID)
		if err == nil {
			isFollowing, _ = userRepo.IsFollowing(ctx, currentUserObjID, userID)
		}
	}

	// Convert followers and following ObjectIDs to string arrays
	followers := make([]string, len(user.Followers))
	for i, id := range user.Followers {
		followers[i] = id.Hex()
	}
	following := make([]string, len(user.Following))
	for i, id := range user.Following {
		following[i] = id.Hex()
	}

	return &User{
		ID:             user.ID.Hex(),
		FirstName:      user.FirstName,
		LastName:       user.LastName,
		Email:          user.Email,
		Phone:          &user.Phone,
		Birthday:       &user.Birthday,
		Role:           UserRole(user.Role),
		ProfilePhoto:   &user.ProfilePhoto,
		CoverPhoto:     &user.CoverPhoto,
		IsActive:       user.IsActive,
		Followers:      followers,
		Following:      following,
		FollowersCount: len(user.Followers),
		FollowingCount: len(user.Following),
		IsFollowing:    isFollowing,
		CreatedAt:      user.CreatedAt,
		UpdatedAt:      &user.UpdatedAt,
	}, nil
}

// Users is the resolver for the users field.
func (r *queryResolver) Users(ctx context.Context, page *int, limit *int) ([]*User, error) {
	pageVal := 1
	limitVal := 10
	if page != nil {
		pageVal = *page
	}
	if limit != nil {
		limitVal = *limit
	}

	result, err := r.userResolver.Users(ctx, pageVal, limitVal)
	if err != nil {
		return []*User{}, nil
	}

	userData := result["data"].([]map[string]interface{})
	users := make([]*User, len(userData))
	for i, userMap := range userData {
		users[i] = &User{
			ID:       userMap["id"].(string),
			Name:     userMap["name"].(string),
			Email:    userMap["email"].(string),
			Role:     UserRole(userMap["role"].(string)),
			IsActive: userMap["isActive"].(bool),
		}
	}

	return users, nil
}

// UsersByIds is the resolver for the usersByIds field.
func (r *queryResolver) UsersByIds(ctx context.Context, ids []string) ([]*User, error) {
	userRepo := repository.NewUserRepository(r.db)
	objectIDs := make([]primitive.ObjectID, 0, len(ids))

	for _, id := range ids {
		objID, err := primitive.ObjectIDFromHex(id)
		if err != nil {
			continue // Skip invalid IDs
		}
		objectIDs = append(objectIDs, objID)
	}

	if len(objectIDs) == 0 {
		return []*User{}, nil
	}

	users, err := userRepo.GetUsersByIds(ctx, objectIDs)
	if err != nil {
		return []*User{}, nil
	}

	userResponses := make([]*User, len(users))
	for i, user := range users {
		name := user.FirstName + " " + user.LastName
		userResponses[i] = &User{
			ID:           user.ID.Hex(),
			Name:         name,
			FirstName:    user.FirstName,
			LastName:     user.LastName,
			Email:        user.Email,
			ProfilePhoto: &user.ProfilePhoto,
		}
	}

	return userResponses, nil
}

// Followers is the resolver for the followers field.
func (r *queryResolver) Followers(ctx context.Context, userID string) ([]*User, error) {
	targetUserObjID, err := primitive.ObjectIDFromHex(userID)
	if err != nil {
		return nil, err
	}

	userRepo := repository.NewUserRepository(r.db)
	followers, err := userRepo.GetFollowers(ctx, targetUserObjID)
	if err != nil {
		return nil, err
	}

	users := make([]*User, len(followers))
	for i, user := range followers {
		users[i] = &User{
			ID:           user.ID.Hex(),
			FirstName:    user.FirstName,
			LastName:     user.LastName,
			Email:        user.Email,
			Phone:        &user.Phone,
			Birthday:     &user.Birthday,
			Role:         UserRole(user.Role),
			ProfilePhoto: &user.ProfilePhoto,
			CoverPhoto:   &user.CoverPhoto,
			IsActive:     user.IsActive,
			CreatedAt:    user.CreatedAt,
			UpdatedAt:    &user.UpdatedAt,
		}
	}
	return users, nil
}

// Following is the resolver for the following field.
func (r *queryResolver) Following(ctx context.Context, userID string) ([]*User, error) {
	targetUserObjID, err := primitive.ObjectIDFromHex(userID)
	if err != nil {
		return nil, err
	}

	userRepo := repository.NewUserRepository(r.db)
	following, err := userRepo.GetFollowing(ctx, targetUserObjID)
	if err != nil {
		return nil, err
	}

	users := make([]*User, len(following))
	for i, user := range following {
		users[i] = &User{
			ID:           user.ID.Hex(),
			FirstName:    user.FirstName,
			LastName:     user.LastName,
			Email:        user.Email,
			Phone:        &user.Phone,
			Birthday:     &user.Birthday,
			Role:         UserRole(user.Role),
			ProfilePhoto: &user.ProfilePhoto,
			CoverPhoto:   &user.CoverPhoto,
			IsActive:     user.IsActive,
			CreatedAt:    user.CreatedAt,
			UpdatedAt:    &user.UpdatedAt,
		}
	}
	return users, nil
}

// Add missing subscription methods
func (r *subscriptionResolver) ItemStockUpdates(ctx context.Context, shopID string) (<-chan *Item, error) {
	// TODO: Implement real-time item stock updates
	return nil, nil
}

// ShopStatusUpdates is the resolver for the shopStatusUpdates field.
func (r *subscriptionResolver) ShopStatusUpdates(ctx context.Context) (<-chan *Shop, error) {
	// TODO: Implement real-time shop status updates
	return nil, nil
}

// LivePosts is the resolver for the livePosts field - uses MongoDB Change Streams for true real-time updates
func (r *subscriptionResolver) LivePosts(ctx context.Context) (<-chan []*Post, error) {
	postChan := make(chan []*Post, 1)

	go func() {
		defer close(postChan)

		twentyFourHoursAgo := time.Now().Add(-948 * time.Hour)
		// Track sent post IDs to only send new ones on change
		sentPostIDs := make(map[string]bool)

		// Create change stream to watch for inserts, updates, and deletes on posts collection
		pipeline := mongo.Pipeline{
			{{Key: "$match", Value: bson.M{
				"operationType": bson.M{"$in": []string{"insert", "update", "replace", "delete"}},
			}}},
		}

		// Watch the posts collection for changes
		changeStream, err := r.postResolver.GetDB().Collection("posts").Watch(ctx, pipeline)
		if err != nil {
			return
		}
		defer changeStream.Close(ctx)

		// Send initial posts from last 24 hours
		cursor, err := r.postResolver.GetDB().Collection("posts").Find(ctx, bson.M{
			"created_at": bson.M{"$gte": twentyFourHoursAgo},
		})
		if err == nil {
			var rawDocs []bson.M
			if err := cursor.All(ctx, &rawDocs); err == nil {
				cursor.Close(ctx)

				posts := make([]*Post, 0, len(rawDocs))
				for _, doc := range rawDocs {
					post := r.docToPost(doc)
					if post != nil {
						posts = append(posts, post)
						sentPostIDs[post.ID] = true
					}
				}

				select {
				case postChan <- posts:
				case <-ctx.Done():
					return
				}
			}
		}

		// Watch for changes - BLOCKS until change detected (NO POLLING)
		for changeStream.Next(ctx) {
			var changeDoc bson.M
			if err := changeStream.Decode(&changeDoc); err != nil {
				continue
			}

			// Query ALL posts from last 24 hours (not just new ones)
			// This ensures first post is always sent when change detected
			cursor, err := r.postResolver.GetDB().Collection("posts").Find(ctx, bson.M{
				"created_at": bson.M{"$gte": twentyFourHoursAgo},
			})
			if err != nil {
				continue
			}

			var rawDocs []bson.M
			if err := cursor.All(ctx, &rawDocs); err != nil {
				cursor.Close(ctx)
				continue
			}
			cursor.Close(ctx)

			// Convert all posts and track which ones are new
			allPosts := make([]*Post, 0, len(rawDocs))
			newPosts := make([]*Post, 0)
			for _, doc := range rawDocs {
				post := r.docToPost(doc)
				if post != nil {
					allPosts = append(allPosts, post)
					if !sentPostIDs[post.ID] {
						newPosts = append(newPosts, post)
						sentPostIDs[post.ID] = true
					}
				}
			}

			// Send ALL posts (not just new ones) to ensure first post shows up
			// Frontend will handle deduplication
			// Always send, even if empty (for deletions)
			select {
			case postChan <- allPosts:
			case <-ctx.Done():
				return
			}
		}
	}()

	return postChan, nil
}

// InquiryReplied is the resolver for the inquiryReplied subscription
func (r *subscriptionResolver) InquiryReplied(ctx context.Context, inquiryID string) (<-chan *InquiryReply, error) {
	replyChan := make(chan *InquiryReply, 1)

	// Convert inquiryID to ObjectID
	inquiryObjectID, err := primitive.ObjectIDFromHex(inquiryID)
	if err != nil {
		close(replyChan)
		return replyChan, nil
	}

	// Start watching for changes
	changeStream, err := r.inquiryRepo.WatchReplies(ctx, inquiryObjectID)
	if err != nil {
		close(replyChan)
		return replyChan, nil
	}

	go func() {
		defer close(replyChan)
		defer changeStream.Close(ctx)

		for changeStream.Next(ctx) {
			var changeDoc bson.M
			if err := changeStream.Decode(&changeDoc); err != nil {
				continue
			}

			// Get the full document
			if fullDoc, ok := changeDoc["fullDocument"].(bson.M); ok {
				// Extract the last reply (newest one)
				if repliesRaw, ok := fullDoc["replies"].(primitive.A); ok && len(repliesRaw) > 0 {
					lastReply := repliesRaw[len(repliesRaw)-1].(bson.M)

					replyID, _ := lastReply["_id"].(primitive.ObjectID)
					authorID, _ := lastReply["author_id"].(primitive.ObjectID)
					message, _ := lastReply["message"].(string)
					createdAt, _ := lastReply["created_at"].(primitive.DateTime)

					reply := &InquiryReply{
						ID:        replyID.Hex(),
						Message:   message,
						CreatedAt: createdAt.Time(),
					}

					// Fetch author data
					if r.userRepo != nil {
						if author, err := r.userRepo.GetUserByID(ctx, authorID); err == nil {
							name := author.FirstName
							if author.LastName != "" {
								name = author.FirstName + " " + author.LastName
							}
							reply.Author = &User{
								ID:           author.ID.Hex(),
								Name:         name,
								Email:        author.Email,
								FirstName:    author.FirstName,
								LastName:     author.LastName,
								Role:         UserRole(author.Role),
								ProfilePhoto: &author.ProfilePhoto,
								IsActive:     author.IsActive,
							}
						}
					}

					select {
					case replyChan <- reply:
					case <-ctx.Done():
						return
					}
				}
			}
		}
	}()

	return replyChan, nil
}

// NewInquiryForShop is the resolver for the newInquiryForShop subscription
func (r *subscriptionResolver) NewInquiryForShop(ctx context.Context, shopID string) (<-chan *Inquiry, error) {
	inquiryChan := make(chan *Inquiry, 1)

	// Convert shopID to ObjectID
	shopObjectID, err := primitive.ObjectIDFromHex(shopID)
	if err != nil {
		close(inquiryChan)
		return inquiryChan, nil
	}

	// Start watching for new inquiries
	changeStream, err := r.inquiryRepo.WatchInquiries(ctx, shopObjectID)
	if err != nil {
		close(inquiryChan)
		return inquiryChan, nil
	}

	go func() {
		defer close(inquiryChan)
		defer changeStream.Close(ctx)

		for changeStream.Next(ctx) {
			var changeDoc bson.M
			if err := changeStream.Decode(&changeDoc); err != nil {
				continue
			}

			// Get the full document
			if fullDoc, ok := changeDoc["fullDocument"].(bson.M); ok {
				inquiry := r.docToInquiry(fullDoc)
				if inquiry != nil {
					select {
					case inquiryChan <- inquiry:
					case <-ctx.Done():
						return
					}
				}
			}
		}
	}()

	return inquiryChan, nil
}

// docToInquiry converts a MongoDB document to a GraphQL Inquiry struct
func (r *Resolver) docToInquiry(doc bson.M) *Inquiry {
	inquiry := &Inquiry{}

	// ID
	if id, ok := doc["_id"].(primitive.ObjectID); ok {
		inquiry.ID = id.Hex()
	}

	// UserID
	var userID primitive.ObjectID
	if uid, ok := doc["user_id"].(primitive.ObjectID); ok {
		userID = uid
	}

	// ShopID
	var shopID primitive.ObjectID
	if sid, ok := doc["shop_id"].(primitive.ObjectID); ok {
		shopID = sid
	}

	// Item
	if item, ok := doc["item"].(string); ok {
		inquiry.Item = item
	}

	// Message
	if message, ok := doc["message"].(string); ok {
		inquiry.Message = message
	}

	// Status
	if status, ok := doc["status"].(string); ok {
		inquiry.Status = InquiryStatus(status)
	}

	// Fetch user data
	if r.userRepo != nil && userID != primitive.NilObjectID {
		if user, err := r.userRepo.GetUserByID(context.Background(), userID); err == nil {
			name := user.FirstName
			if user.LastName != "" {
				name = user.FirstName + " " + user.LastName
			}
			inquiry.User = &User{
				ID:           user.ID.Hex(),
				Name:         name,
				Email:        user.Email,
				FirstName:    user.FirstName,
				LastName:     user.LastName,
				Role:         UserRole(user.Role),
				ProfilePhoto: &user.ProfilePhoto,
				IsActive:     user.IsActive,
			}
		}
	}

	// Fetch shop data
	if r.storeRepo != nil && shopID != primitive.NilObjectID {
		if shop, err := r.storeRepo.GetStoreByID(context.Background(), shopID); err == nil {
			inquiry.Shop = &Shop{
				ID:   shop.ID.Hex(),
				Name: shop.Name,
			}
		}
	}

	// Replies
	inquiry.Replies = []*InquiryReply{}
	if repliesRaw, ok := doc["replies"].(primitive.A); ok {
		for _, replyRaw := range repliesRaw {
			if replyDoc, ok := replyRaw.(bson.M); ok {
				reply := &InquiryReply{}

				if replyID, ok := replyDoc["_id"].(primitive.ObjectID); ok {
					reply.ID = replyID.Hex()
				}

				if message, ok := replyDoc["message"].(string); ok {
					reply.Message = message
				}

				if createdAt, ok := replyDoc["created_at"].(primitive.DateTime); ok {
					reply.CreatedAt = createdAt.Time()
				}

				// Fetch author data
				if authorID, ok := replyDoc["author_id"].(primitive.ObjectID); ok && r.userRepo != nil {
					if author, err := r.userRepo.GetUserByID(context.Background(), authorID); err == nil {
						name := author.FirstName
						if author.LastName != "" {
							name = author.FirstName + " " + author.LastName
						}
						reply.Author = &User{
							ID:           author.ID.Hex(),
							Name:         name,
							Email:        author.Email,
							FirstName:    author.FirstName,
							LastName:     author.LastName,
							Role:         UserRole(author.Role),
							ProfilePhoto: &author.ProfilePhoto,
							IsActive:     author.IsActive,
						}
					}
				}

				inquiry.Replies = append(inquiry.Replies, reply)
			}
		}
	}

	// CreatedAt
	if createdAt, ok := doc["created_at"].(primitive.DateTime); ok {
		inquiry.CreatedAt = createdAt.Time()
	}

	// UpdatedAt
	if updatedAt, ok := doc["updated_at"].(primitive.DateTime); ok {
		t := updatedAt.Time()
		inquiry.UpdatedAt = &t
	}

	return inquiry
}

// Helper to convert string IDs to ObjectIDs for MongoDB query
func getObjectIDsFromMap(idMap map[string]bool) []primitive.ObjectID {
	var result []primitive.ObjectID
	for id := range idMap {
		if oid, err := primitive.ObjectIDFromHex(id); err == nil {
			result = append(result, oid)
		}
	}
	return result
}

// docToPost converts a MongoDB document to a GraphQL Post struct
func (r *Resolver) docToPost(doc bson.M) *Post {
	post := &Post{}

	// ID
	if id, ok := doc["_id"].(primitive.ObjectID); ok {
		post.ID = id.Hex()
	}

	// Title (required)
	if title, ok := doc["title"].(string); ok {
		post.Title = title
	} else {
		post.Title = ""
	}

	// Text (required)
	if text, ok := doc["text"].(string); ok {
		post.Text = text
	} else {
		post.Text = ""
	}

	// Photos - handle both []interface{} and primitive.A (bson array)
	post.Photos = []string{}
	if photosRaw, ok := doc["photos"]; ok {
		switch photos := photosRaw.(type) {
		case []interface{}:
			post.Photos = make([]string, 0, len(photos))
			for _, p := range photos {
				if s, ok := p.(string); ok {
					post.Photos = append(post.Photos, s)
				}
			}
		case primitive.A:
			post.Photos = make([]string, 0, len(photos))
			for _, p := range photos {
				if s, ok := p.(string); ok {
					post.Photos = append(post.Photos, s)
				}
			}
		case []string:
			post.Photos = photos
		}
	}

	// Types - handle both []interface{} and primitive.A (bson array)
	post.Types = []string{}
	if typesRaw, ok := doc["types"]; ok {
		switch types := typesRaw.(type) {
		case []interface{}:
			post.Types = make([]string, 0, len(types))
			for _, t := range types {
				if s, ok := t.(string); ok {
					post.Types = append(post.Types, s)
				}
			}
		case primitive.A:
			post.Types = make([]string, 0, len(types))
			for _, t := range types {
				if s, ok := t.(string); ok {
					post.Types = append(post.Types, s)
				}
			}
		case []string:
			post.Types = types
		}
	}

	// Likes (required) - handle both int32 and int64
	if likes, ok := doc["likes"].(int32); ok {
		post.Likes = int(likes)
	} else if likes, ok := doc["likes"].(int64); ok {
		post.Likes = int(likes)
	} else {
		post.Likes = 0
	}

	// IsLiked (required)
	post.IsLiked = false // Default to false, would need user context to determine

	// Comments (required - empty array)
	post.Comments = []*Comment{}

	// CommentCount (required)
	if count, ok := doc["comment_count"].(int32); ok {
		post.CommentCount = int(count)
	} else if count, ok := doc["comment_count"].(int64); ok {
		post.CommentCount = int(count)
	} else {
		post.CommentCount = 0
	}

	// Author (required) - fetch actual user data from database
	if authorID, ok := doc["author_id"].(primitive.ObjectID); ok {
		// Try to fetch user from database
		if r.userRepo != nil {
			ctx := context.Background()
			if user, err := r.userRepo.GetUserByID(ctx, authorID); err == nil && user != nil {
				name := user.FirstName
				if user.LastName != "" {
					name = user.FirstName + " " + user.LastName
				}
				post.Author = &User{
					ID:           user.ID.Hex(),
					Name:         name,
					Email:        user.Email,
					FirstName:    user.FirstName,
					LastName:     user.LastName,
					Role:         UserRole(user.Role),
					ProfilePhoto: &user.ProfilePhoto,
					IsActive:     user.IsActive,
				}
			} else {
				// Fallback if user not found
				post.Author = &User{
					ID:    authorID.Hex(),
					Name:  "Unknown",
					Email: "",
				}
			}
		} else {
			// Fallback if userRepo not available
			post.Author = &User{
				ID:    authorID.Hex(),
				Name:  "Unknown",
				Email: "",
			}
		}
	} else {
		// Create empty author as fallback
		post.Author = &User{
			ID:    "",
			Name:  "Unknown",
			Email: "",
		}
	}

	// CreatedAt (non-pointer)
	if createdAt, ok := doc["created_at"].(primitive.DateTime); ok {
		post.CreatedAt = createdAt.Time()
	}

	// UpdatedAt (pointer)
	if updatedAt, ok := doc["updated_at"].(primitive.DateTime); ok {
		t := updatedAt.Time()
		post.UpdatedAt = &t
	}

	// Location (optional)
	if locDoc, ok := doc["location"].(bson.M); ok {
		loc := &Location{}
		if lat, ok := locDoc["lat"].(float64); ok {
			loc.Lat = lat
		}
		if lng, ok := locDoc["lng"].(float64); ok {
			loc.Lng = lng
		}
		if name, ok := locDoc["name"].(string); ok {
			loc.Name = name
		}
		post.Location = loc
	}

	return post
}

// Mutation returns MutationResolver implementation.
func (r *Resolver) Mutation() MutationResolver { return &mutationResolver{r} }

// Query returns QueryResolver implementation.
func (r *Resolver) Query() QueryResolver { return &queryResolver{r} }

// Subscription returns SubscriptionResolver implementation.
func (r *Resolver) Subscription() SubscriptionResolver { return &subscriptionResolver{r} }

type mutationResolver struct{ *Resolver }
type queryResolver struct{ *Resolver }
type subscriptionResolver struct{ *Resolver }

// NewResolver creates a new resolver with all dependencies
func NewResolver(db *mongo.Database, jwtSecret string) *Resolver {
	return &Resolver{
		authResolver:    auth.NewAuthResolver(db, jwtSecret),
		userResolver:    user.NewUserResolver(db),
		shopResolver:    shop.NewShopResolver(db),
		productResolver: product.NewProductResolver(repository.NewProductRepository(db)),
		ownerResolver:   owner.NewOwnerResolver(db),
		postResolver:    post.NewPostResolver(db),
		reviewResolver:  review.NewReviewResolver(db),
		inquiryResolver: inquiry.NewInquiryResolver(db),
		storeRepo:       repository.NewStoreRepository(db),
		productRepo:     repository.NewProductRepository(db),
		userRepo:        repository.NewUserRepository(db),
		inquiryRepo:     repository.NewInquiryRepository(db),
		db:              db,
		jwtSecret:       jwtSecret,
		postNotifier:    NewPostNotifier(),
	}
}

// Helper function to format post data from map
func (r *Resolver) formatPostFromMap(postMap map[string]interface{}) *Post {
	authorData := postMap["author"].(map[string]interface{})
	createdAt, _ := time.Parse(time.RFC3339, postMap["createdAt"].(string))
	updatedAt, _ := time.Parse(time.RFC3339, postMap["updatedAt"].(string))

	author := &User{
		ID:           authorData["id"].(string),
		Name:         authorData["name"].(string),
		Email:        authorData["email"].(string),
		Role:         UserRole(authorData["role"].(string)),
		IsActive:     authorData["isActive"].(bool),
		ProfilePhoto: getStringPointerValue(authorData, "profilePhoto"),
		Followers:    toStringSlice(authorData["followers"]),
	}

	var location *Location
	if locData, ok := postMap["location"].(map[string]interface{}); ok && locData != nil {
		location = &Location{
			Lat:  locData["lat"].(float64),
			Lng:  locData["lng"].(float64),
			Name: locData["name"].(string),
		}
	}

	return &Post{
		ID:           postMap["id"].(string),
		Title:        postMap["title"].(string),
		Text:         postMap["text"].(string),
		Photos:       toStringSlice(postMap["photos"]),
		Types:        toStringSlice(postMap["types"]),
		Author:       author,
		Location:     location,
		Likes:        int(postMap["likes"].(int)),
		IsLiked:      postMap["isLiked"].(bool),
		CommentCount: postMap["commentCount"].(int),
		CreatedAt:    createdAt,
		UpdatedAt:    &updatedAt,
	}
}

// Helper function to convert interface slice to string slice
func toStringSlice(data interface{}) []string {
	if data == nil {
		return []string{}
	}
	if slice, ok := data.([]string); ok {
		return slice
	}
	if slice, ok := data.([]interface{}); ok {
		result := make([]string, len(slice))
		for i, v := range slice {
			if str, ok := v.(string); ok {
				result[i] = str
			}
		}
		return result
	}
	return []string{}
}

// formatCommentData formats comment map data into Comment type
func (r *Resolver) formatCommentData(data map[string]interface{}) *Comment {
	comment := &Comment{
		ID:   data["id"].(string),
		Text: data["text"].(string),
	}

	if createdAtStr, ok := data["createdAt"].(string); ok {
		createdAt, _ := time.Parse(time.RFC3339, createdAtStr)
		comment.CreatedAt = createdAt
	}
	if updatedAtStr, ok := data["updatedAt"].(string); ok {
		updatedAt, _ := time.Parse(time.RFC3339, updatedAtStr)
		comment.UpdatedAt = &updatedAt
	}

	if authorData, ok := data["author"].(map[string]interface{}); ok {
		comment.Author = r.formatUserData(authorData)
	}

	return comment
}

// formatUserData formats user map data into User type
func (r *Resolver) formatUserData(data map[string]interface{}) *User {
	user := &User{
		ID:           getStringValue(data, "id"),
		Name:         getStringValue(data, "name"),
		Email:        getStringValue(data, "email"),
		Role:         UserRole(getStringValue(data, "role")),
		IsActive:     getBoolValue(data, "isActive"),
		ProfilePhoto: getStringPointerValue(data, "profilePhoto"),
		Followers:    toStringSlice(data["followers"]),
	}

	if createdAtStr, ok := data["createdAt"].(string); ok {
		createdAt, _ := time.Parse(time.RFC3339, createdAtStr)
		user.CreatedAt = createdAt
	}
	if updatedAtStr, ok := data["updatedAt"].(string); ok {
		updatedAt, _ := time.Parse(time.RFC3339, updatedAtStr)
		user.UpdatedAt = &updatedAt
	}

	return user
}

// Review query resolvers

// ReviewsByStore is the resolver for the reviewsByStore field
func (r *queryResolver) ReviewsByStore(ctx context.Context, storeID string, page *int, limit *int) (*ReviewsPayload, error) {
	pageNum := 1
	limitNum := 10
	if page != nil {
		pageNum = *page
	}
	if limit != nil {
		limitNum = *limit
	}

	result, err := r.reviewResolver.ReviewsByStore(ctx, storeID, pageNum, limitNum)
	if err != nil {
		return &ReviewsPayload{
			Success: false,
			Message: err.Error(),
			Data:    []*Review{},
			Total:   0,
			HasMore: false,
		}, err
	}

	reviews := make([]*Review, 0)
	if data, ok := result["data"].([]map[string]interface{}); ok {
		for _, reviewData := range data {
			reviews = append(reviews, r.formatReviewData(reviewData))
		}
	}

	total := int64(0)
	if t, ok := result["total"].(int64); ok {
		total = t
	}
	hasMore := false
	if hm, ok := result["hasMore"].(bool); ok {
		hasMore = hm
	}

	return &ReviewsPayload{
		Success: result["success"].(bool),
		Message: result["message"].(string),
		Data:    reviews,
		Total:   int(total),
		HasMore: hasMore,
	}, nil
}

// ReviewStats is the resolver for the reviewStats field
func (r *queryResolver) ReviewStats(ctx context.Context, storeID string) (*ReviewStats, error) {
	result, err := r.reviewResolver.ReviewStats(ctx, storeID)
	if err != nil {
		return &ReviewStats{
			AverageRating: 0,
			TotalReviews:  0,
			FiveStars:     0,
			FourStars:     0,
			ThreeStars:    0,
			TwoStars:      0,
			OneStar:       0,
		}, err
	}

	return &ReviewStats{
		AverageRating: result["averageRating"].(float64),
		TotalReviews:  int(result["totalReviews"].(int64)),
		FiveStars:     int(result["fiveStars"].(int64)),
		FourStars:     int(result["fourStars"].(int64)),
		ThreeStars:    int(result["threeStars"].(int64)),
		TwoStars:      int(result["twoStars"].(int64)),
		OneStar:       int(result["oneStar"].(int64)),
	}, nil
}

// MyReviewForStore is the resolver for the myReviewForStore field
func (r *queryResolver) MyReviewForStore(ctx context.Context, storeID string) (*ReviewPayload, error) {
	userID := middleware.GetUserID(ctx)
	if userID == "" {
		return &ReviewPayload{
			Success: false,
			Message: "Authentication required",
		}, nil
	}

	result, err := r.reviewResolver.MyReviewForStore(ctx, userID, storeID)
	if err != nil {
		return &ReviewPayload{
			Success: false,
			Message: err.Error(),
		}, err
	}

	var review *Review
	if result["data"] != nil {
		review = r.formatReviewData(result["data"].(map[string]interface{}))
	}

	return &ReviewPayload{
		Success: result["success"].(bool),
		Message: result["message"].(string),
		Data:    review,
	}, nil
}

// ReviewsByUser is the resolver for the reviewsByUser field
func (r *queryResolver) ReviewsByUser(ctx context.Context, userID string, page *int, limit *int) (*ReviewsPayload, error) {
	pageNum := 1
	limitNum := 10
	if page != nil {
		pageNum = *page
	}
	if limit != nil {
		limitNum = *limit
	}

	result, err := r.reviewResolver.ReviewsByUser(ctx, userID, pageNum, limitNum)
	if err != nil {
		return &ReviewsPayload{
			Success: false,
			Message: err.Error(),
			Data:    []*Review{},
			Total:   0,
			HasMore: false,
		}, err
	}

	reviews := make([]*Review, 0)
	if data, ok := result["data"].([]map[string]interface{}); ok {
		for _, reviewData := range data {
			reviews = append(reviews, r.formatReviewData(reviewData))
		}
	}

	total := int64(0)
	if t, ok := result["total"].(int64); ok {
		total = t
	}
	hasMore := false
	if hm, ok := result["hasMore"].(bool); ok {
		hasMore = hm
	}

	return &ReviewsPayload{
		Success: result["success"].(bool),
		Message: result["message"].(string),
		Data:    reviews,
		Total:   int(total),
		HasMore: hasMore,
	}, nil
}

// Inquiry query resolvers

// Inquiry is the resolver for the inquiry field
func (r *queryResolver) Inquiry(ctx context.Context, id string) (*InquiryPayload, error) {
	result, err := r.inquiryResolver.GetInquiry(ctx, id)
	if err != nil {
		return &InquiryPayload{
			Success: false,
			Message: result["message"].(string),
		}, nil
	}

	if !result["success"].(bool) {
		return &InquiryPayload{
			Success: false,
			Message: result["message"].(string),
		}, nil
	}

	inquiryData := result["data"].(*domain.Inquiry)
	return &InquiryPayload{
		Success: true,
		Message: result["message"].(string),
		Data:    r.formatInquiryData(inquiryData),
	}, nil
}

// InquiriesForShop is the resolver for the inquiriesForShop field
func (r *queryResolver) InquiriesForShop(ctx context.Context, shopID string, page *int, limit *int) (*InquiriesPayload, error) {
	pageNum := 1
	limitNum := 10
	if page != nil {
		pageNum = *page
	}
	if limit != nil {
		limitNum = *limit
	}

	result, err := r.inquiryResolver.GetInquiriesForShop(ctx, shopID, pageNum, limitNum)
	if err != nil {
		return &InquiriesPayload{
			Success:    false,
			Message:    err.Error(),
			Data:       []*Inquiry{},
			Total:      0,
			Page:       pageNum,
			TotalPages: 0,
		}, err
	}

	inquiries := make([]*Inquiry, 0)
	if data, ok := result["data"].([]*domain.Inquiry); ok {
		for _, inquiryData := range data {
			inquiries = append(inquiries, r.formatInquiryData(inquiryData))
		}
	}

	total := int64(0)
	if t, ok := result["total"].(int64); ok {
		total = t
	}

	totalPages := 0
	if tp, ok := result["totalPages"].(int); ok {
		totalPages = tp
	}

	return &InquiriesPayload{
		Success:    result["success"].(bool),
		Message:    result["message"].(string),
		Data:       inquiries,
		Total:      int(total),
		Page:       pageNum,
		TotalPages: totalPages,
	}, nil
}

// InquiriesByUser is the resolver for the inquiriesByUser field
func (r *queryResolver) InquiriesByUser(ctx context.Context, userID string, page *int, limit *int) (*InquiriesPayload, error) {
	pageNum := 1
	limitNum := 10
	if page != nil {
		pageNum = *page
	}
	if limit != nil {
		limitNum = *limit
	}

	result, err := r.inquiryResolver.GetInquiriesByUser(ctx, userID, pageNum, limitNum)
	if err != nil {
		return &InquiriesPayload{
			Success:    false,
			Message:    err.Error(),
			Data:       []*Inquiry{},
			Total:      0,
			Page:       pageNum,
			TotalPages: 0,
		}, err
	}

	inquiries := make([]*Inquiry, 0)
	if data, ok := result["data"].([]*domain.Inquiry); ok {
		for _, inquiryData := range data {
			inquiries = append(inquiries, r.formatInquiryData(inquiryData))
		}
	}

	total := int64(0)
	if t, ok := result["total"].(int64); ok {
		total = t
	}

	totalPages := 0
	if tp, ok := result["totalPages"].(int); ok {
		totalPages = tp
	}

	return &InquiriesPayload{
		Success:    result["success"].(bool),
		Message:    result["message"].(string),
		Data:       inquiries,
		Total:      int(total),
		Page:       pageNum,
		TotalPages: totalPages,
	}, nil
}

// UserInquiryForShop is the resolver for the userInquiryForShop field
func (r *queryResolver) UserInquiryForShop(ctx context.Context, userID string, shopID string) (*InquiryPayload, error) {
	result, err := r.inquiryResolver.GetUserInquiryForShop(ctx, userID, shopID)
	if err != nil {
		return &InquiryPayload{
			Success: false,
			Message: "Inquiry not found",
			Data:    nil,
		}, nil
	}

	inquiry, ok := result["data"].(*domain.Inquiry)
	if !ok {
		return &InquiryPayload{
			Success: false,
			Message: "Failed to parse inquiry data",
			Data:    nil,
		}, nil
	}

	return &InquiryPayload{
		Success: true,
		Message: result["message"].(string),
		Data:    r.formatInquiryData(inquiry),
	}, nil
}

// Review mutation resolvers

// CreateReview is the resolver for the createReview field
func (r *mutationResolver) CreateReview(ctx context.Context, input CreateReviewInput) (*ReviewPayload, error) {
	userID := middleware.GetUserID(ctx)
	if userID == "" {
		return &ReviewPayload{
			Success: false,
			Message: "Authentication required",
		}, nil
	}

	// Upload photos to Cloudinary if provided
	var photoURLs []string
	if input.Photos != nil && len(input.Photos) > 0 {
		env := bootstrap.LoadEnv()
		uploader, err := imageutil.NewImageUploader(
			env.CloudinaryCloudName,
			env.CloudinaryAPIKey,
			env.CloudinaryAPISecret,
			env.CloudinaryFolder,
		)
		if err != nil {
			return &ReviewPayload{
				Success: false,
				Message: "Failed to initialize image uploader: " + err.Error(),
			}, nil
		}

		// Upload to user-specific reviews folder
		uploadFolder := env.CloudinaryFolder + "/" + userID + "/reviews"
		userUploader := uploader.WithFolder(uploadFolder)

		for _, upload := range input.Photos {
			if upload != nil {
				result, err := userUploader.UploadImage(ctx, upload.File, upload.Filename)
				if err != nil {
					return &ReviewPayload{
						Success: false,
						Message: "Failed to upload image: " + err.Error(),
					}, nil
				}
				photoURLs = append(photoURLs, result.URL)
			}
		}
	}

	inputMap := map[string]interface{}{
		"storeId": input.StoreID,
		"rating":  input.Rating,
		"text":    input.Text,
		"photos":  photoURLs,
	}

	result, err := r.reviewResolver.CreateReview(ctx, userID, inputMap)
	if err != nil {
		return &ReviewPayload{
			Success: false,
			Message: err.Error(),
		}, err
	}

	return &ReviewPayload{
		Success: result["success"].(bool),
		Message: result["message"].(string),
		Data:    r.formatReviewData(result["data"].(map[string]interface{})),
	}, nil
}

// UpdateReview is the resolver for the updateReview field
func (r *mutationResolver) UpdateReview(ctx context.Context, id string, input UpdateReviewInput) (*ReviewPayload, error) {
	userID := middleware.GetUserID(ctx)
	ok := userID != ""
	if !ok {
		return &ReviewPayload{
			Success: false,
			Message: "Authentication required",
		}, nil
	}

	inputMap := map[string]interface{}{}
	if input.Rating != nil {
		inputMap["rating"] = *input.Rating
	}
	if input.Text != nil {
		inputMap["text"] = *input.Text
	}

	// Handle photos - combine existing URLs with new uploads
	var photoURLs []string

	// Add existing photo URLs
	if input.Photos != nil {
		photoURLs = append(photoURLs, input.Photos...)
	}

	// Upload new photos
	if input.NewPhotos != nil && len(input.NewPhotos) > 0 {
		env := bootstrap.LoadEnv()
		uploader, err := imageutil.NewImageUploader(
			env.CloudinaryCloudName,
			env.CloudinaryAPIKey,
			env.CloudinaryAPISecret,
			env.CloudinaryFolder,
		)
		if err != nil {
			return &ReviewPayload{
				Success: false,
				Message: "Failed to initialize image uploader: " + err.Error(),
			}, nil
		}
		uploadFolder := env.CloudinaryFolder + "/" + userID + "/reviews"
		userUploader := uploader.WithFolder(uploadFolder)

		for _, upload := range input.NewPhotos {
			if upload != nil {
				result, err := userUploader.UploadImage(ctx, upload.File, upload.Filename)
				if err != nil {
					return &ReviewPayload{
						Success: false,
						Message: "Failed to upload image: " + err.Error(),
					}, nil
				}
				photoURLs = append(photoURLs, result.URL)
			}
		}
	}

	if len(photoURLs) > 0 {
		inputMap["photos"] = photoURLs
	}

	result, err := r.reviewResolver.UpdateReview(ctx, userID, id, inputMap)
	if err != nil {
		return &ReviewPayload{
			Success: false,
			Message: err.Error(),
		}, err
	}

	return &ReviewPayload{
		Success: result["success"].(bool),
		Message: result["message"].(string),
		Data:    r.formatReviewData(result["data"].(map[string]interface{})),
	}, nil
}

// DeleteReview is the resolver for the deleteReview field
func (r *mutationResolver) DeleteReview(ctx context.Context, id string) (*DeletePayload, error) {
	userID := middleware.GetUserID(ctx)
	ok := userID != ""
	if !ok {
		return &DeletePayload{
			Success: false,
			Message: "Authentication required",
		}, nil
	}

	result, err := r.reviewResolver.DeleteReview(ctx, userID, id)
	if err != nil {
		return &DeletePayload{
			Success: false,
			Message: err.Error(),
		}, err
	}

	return &DeletePayload{
		Success: result["success"].(bool),
		Message: result["message"].(string),
	}, nil
}

// formatReviewData formats review map data into Review type
func (r *Resolver) formatReviewData(data map[string]interface{}) *Review {
	review := &Review{
		ID:     data["id"].(string),
		Text:   getStringPtr(data["text"]),
		Rating: data["rating"].(int),
		Photos: toStringSlice(data["photos"]),
	}

	if storeID, ok := data["storeId"].(string); ok {
		review.StoreID = storeID
	}
	if userID, ok := data["userId"].(string); ok {
		review.UserID = userID
	}

	if createdAtStr, ok := data["createdAt"].(string); ok {
		createdAt, _ := time.Parse(time.RFC3339, createdAtStr)
		review.CreatedAt = createdAt
	}
	if updatedAtStr, ok := data["updatedAt"].(string); ok {
		updatedAt, _ := time.Parse(time.RFC3339, updatedAtStr)
		review.UpdatedAt = &updatedAt
	}

	if userData, ok := data["user"].(map[string]interface{}); ok {
		review.User = r.formatUserData(userData)
	}

	return review
}

// formatInquiryData converts domain.Inquiry to GraphQL Inquiry type
func (r *Resolver) formatInquiryData(inquiry *domain.Inquiry) *Inquiry {
	// Fetch user data
	var user *User
	if r.userRepo != nil {
		if inquiryUser, err := r.userRepo.GetUserByID(context.Background(), inquiry.UserID); err == nil {
			name := inquiryUser.FirstName
			if inquiryUser.LastName != "" {
				name = inquiryUser.FirstName + " " + inquiryUser.LastName
			}
			user = &User{
				ID:           inquiryUser.ID.Hex(),
				Name:         name,
				Email:        inquiryUser.Email,
				FirstName:    inquiryUser.FirstName,
				LastName:     inquiryUser.LastName,
				Role:         UserRole(inquiryUser.Role),
				ProfilePhoto: &inquiryUser.ProfilePhoto,
				IsActive:     inquiryUser.IsActive,
			}
		}
	}

	// Fetch shop data
	var shop *Shop
	if r.storeRepo != nil {
		if inquiryShop, err := r.storeRepo.GetStoreByID(context.Background(), inquiry.ShopID); err == nil {
			shop = &Shop{
				ID:   inquiryShop.ID.Hex(),
				Name: inquiryShop.Name,
			}
		}
	}

	// Format replies
	replies := make([]*InquiryReply, len(inquiry.Replies))
	for i, reply := range inquiry.Replies {
		replies[i] = r.formatInquiryReplyData(reply)
	}

	return &Inquiry{
		ID:        inquiry.ID.Hex(),
		User:      user,
		Shop:      shop,
		Item:      inquiry.Item,
		Message:   inquiry.Message,
		Status:    InquiryStatus(inquiry.Status),
		Replies:   replies,
		CreatedAt: inquiry.CreatedAt,
		UpdatedAt: &inquiry.UpdatedAt,
	}
}

// formatInquiryReplyData converts domain.InquiryReply to GraphQL InquiryReply type
func (r *Resolver) formatInquiryReplyData(reply domain.InquiryReply) *InquiryReply {
	// Fetch author data
	var author *User
	if r.userRepo != nil {
		if replyAuthor, err := r.userRepo.GetUserByID(context.Background(), reply.AuthorID); err == nil {
			name := replyAuthor.FirstName
			if replyAuthor.LastName != "" {
				name = replyAuthor.FirstName + " " + replyAuthor.LastName
			}
			author = &User{
				ID:           replyAuthor.ID.Hex(),
				Name:         name,
				Email:        replyAuthor.Email,
				FirstName:    replyAuthor.FirstName,
				LastName:     replyAuthor.LastName,
				Role:         UserRole(replyAuthor.Role),
				ProfilePhoto: &replyAuthor.ProfilePhoto,
				IsActive:     replyAuthor.IsActive,
			}
		}
	}

	return &InquiryReply{
		ID:        reply.ID.Hex(),
		Author:    author,
		Message:   reply.Message,
		CreatedAt: reply.CreatedAt,
	}
}
