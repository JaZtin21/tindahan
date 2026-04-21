package graphql

// THIS CODE WILL BE UPDATED WITH SCHEMA CHANGES. PREVIOUS IMPLEMENTATION FOR SCHEMA CHANGES WILL BE KEPT IN THE COMMENT SECTION. IMPLEMENTATION FOR UNCHANGED SCHEMA WILL BE KEPT.

import (
	"context"
	"fmt"
	"sync"
	"time"
	"tindahan-backend/api/handlers/auth"
	"tindahan-backend/api/handlers/middleware"
	"tindahan-backend/api/handlers/owner"
	"tindahan-backend/api/handlers/post"
	"tindahan-backend/api/handlers/product"
	"tindahan-backend/api/handlers/shop"
	"tindahan-backend/api/handlers/user"
	"tindahan-backend/bootstrap"
	"tindahan-backend/domain"
	"tindahan-backend/internal/imageutil"
	"tindahan-backend/repository"

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
	storeRepo       repository.StoreRepository
	productRepo     repository.ProductRepository
	userRepo        repository.UserRepository
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
			AccessToken:  data["accessToken"].(string),
			RefreshToken: data["refreshToken"].(string),
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
			AccessToken:  data["accessToken"].(string),
			RefreshToken: data["refreshToken"].(string),
		},
	}, nil
}

// RefreshToken is the resolver for the refreshToken field.
func (r *mutationResolver) RefreshToken(ctx context.Context, input RefreshTokenInput) (*AuthPayload, error) {
	result, _ := r.authResolver.RefreshToken(ctx, input.RefreshToken)
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
			AccessToken:  data["accessToken"].(string),
			RefreshToken: data["refreshToken"].(string),
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
			AccessToken:  data["accessToken"].(string),
			RefreshToken: data["refreshToken"].(string),
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

	result, err := r.postResolver.UpdatePost(ctx, id, userID, input.Title, input.Text, input.Photos, input.Types, location)
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
	result, err := r.ownerResolver.CreateItem(ctx, userID, input.ShopID, input.Name, input.Price, input.Stock, input.Description, input.Category)
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

	result, err := r.ownerResolver.UpdateItem(ctx, id, userID, updates)
	if err != nil {
		return &ItemPayload{
			Success: false,
			Message: result["message"].(string),
		}, nil
	}

	data := result["data"].(map[string]interface{})

	return &ItemPayload{
		Success: result["success"].(bool),
		Message: result["message"].(string),
		Data: &Item{
			ID:       data["id"].(string),
			Name:     data["name"].(string),
			Price:    data["price"].(float64),
			Stock:    data["stock"].(int),
			IsActive: data["isActive"].(bool),
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

	// Build owner resolver input from GraphQL input
	shopInput := owner.CreateShopInput{
		Name:         input.Name,
		Location:     input.Location,
		CoverPhoto:   input.CoverPhoto,
		OtherPhotos:  input.OtherPhotos,
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
	if input.CoverPhoto != nil {
		shopInput.CoverPhoto = *input.CoverPhoto
	}
	if input.OtherPhotos != nil {
		shopInput.OtherPhotos = input.OtherPhotos
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

	return &UserPayload{
		Success: result["success"].(bool),
		Message: result["message"].(string),
		Data: &User{
			ID:           data["id"].(string),
			Name:         data["name"].(string),
			Email:        data["email"].(string),
			FirstName:    data["firstName"].(string),
			LastName:     data["lastName"].(string),
			Phone:        getStringPtr(data["phone"]),
			Birthday:     getStringPtr(data["birthday"]),
			Role:         UserRole(data["role"].(string)),
			IsActive:     data["isActive"].(bool),
			ProfilePhoto: getStringPtr(data["profilePhoto"]),
			CoverPhoto:   getStringPtr(data["coverPhoto"]),
			CreatedAt:    createdAt,
			UpdatedAt:    &updatedAt,
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

	result, _ := r.productResolver.Items(ctx, pageVal, limitVal, input.Query)
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
	}

	return &ItemsPayload{
		Success: result["success"].(bool),
		Message: result["message"].(string),
		Data:    items,
	}, nil
}

// MyItems is the resolver for the myItems field.
func (r *queryResolver) MyItems(ctx context.Context, page *int, limit *int) (*ItemsPayload, error) {
	pageVal := 1
	limitVal := 10
	if page != nil {
		pageVal = *page
	}
	if limit != nil {
		limitVal = *limit
	}

	result, _ := r.ownerResolver.GetOwnerItems(ctx, middleware.GetUserID(ctx), pageVal, limitVal)
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

		twentyFourHoursAgo := time.Now().Add(-24 * time.Hour)
		// Track sent post IDs to only send new ones on change
		sentPostIDs := make(map[string]bool)

		// Create change stream to watch for inserts on posts collection
		pipeline := mongo.Pipeline{
			{{Key: "$match", Value: bson.M{
				"operationType": bson.M{"$in": []string{"insert", "update", "replace"}},
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

			// Get the document ID from the change stream
			var docID primitive.ObjectID
			if fullDoc, ok := changeDoc["fullDocument"].(bson.M); ok {
				if id, ok := fullDoc["_id"].(primitive.ObjectID); ok {
					docID = id
				}
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
			if len(allPosts) > 0 {
				select {
				case postChan <- allPosts:
				case <-ctx.Done():
					return
				}
			}

			// Also handle updates to existing posts
			if docID != primitive.NilObjectID {
				var updatedPost bson.M
				err := r.postResolver.GetDB().Collection("posts").FindOne(ctx, bson.M{"_id": docID}).Decode(&updatedPost)
				if err == nil {
					post := r.docToPost(updatedPost)
					if post != nil && sentPostIDs[post.ID] {
						// Send updated post as well
						select {
						case postChan <- []*Post{post}:
						case <-ctx.Done():
							return
						}
					}
				}
			}
		}
	}()

	return postChan, nil
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

	// Types
	if types, ok := doc["types"].([]interface{}); ok {
		post.Types = make([]string, 0, len(types))
		for _, t := range types {
			if s, ok := t.(string); ok {
				post.Types = append(post.Types, s)
			}
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
		storeRepo:       repository.NewStoreRepository(db),
		productRepo:     repository.NewProductRepository(db),
		userRepo:        repository.NewUserRepository(db),
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
		ID:       authorData["id"].(string),
		Name:     authorData["name"].(string),
		Email:    authorData["email"].(string),
		Role:     UserRole(authorData["role"].(string)),
		IsActive: authorData["isActive"].(bool),
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
