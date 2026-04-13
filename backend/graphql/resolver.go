package graphql

// THIS CODE WILL BE UPDATED WITH SCHEMA CHANGES. PREVIOUS IMPLEMENTATION FOR SCHEMA CHANGES WILL BE KEPT IN THE COMMENT SECTION. IMPLEMENTATION FOR UNCHANGED SCHEMA WILL BE KEPT.

import (
	"context"
	"time"
	"tindahan-backend/api/handlers/auth"
	"tindahan-backend/api/handlers/middleware"
	"tindahan-backend/api/handlers/owner"
	"tindahan-backend/api/handlers/post"
	"tindahan-backend/api/handlers/product"
	"tindahan-backend/api/handlers/shop"
	"tindahan-backend/api/handlers/user"
	"tindahan-backend/domain"

	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
)

type Resolver struct {
	authResolver    *auth.AuthResolver
	userResolver    *user.UserResolver
	shopResolver    *shop.ShopResolver
	productResolver *product.ProductResolver
	ownerResolver   *owner.OwnerResolver
	postResolver    *post.PostResolver
	db              *mongo.Database
	jwtSecret       string
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
				ID:        userData["id"].(string),
				Name:      userData["name"].(string),
				Email:     userData["email"].(string),
				Role:      UserRole(userData["role"].(string)),
				IsActive:  userData["isActive"].(bool),
				CreatedAt: createdAt,
				UpdatedAt: &updatedAt,
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
				ID:        userData["id"].(string),
				Name:      userData["name"].(string),
				Email:     userData["email"].(string),
				Role:      UserRole(userData["role"].(string)),
				IsActive:  userData["isActive"].(bool),
				CreatedAt: createdAt,
				UpdatedAt: &updatedAt,
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
				ID:        userData["id"].(string),
				Name:      userData["name"].(string),
				Email:     userData["email"].(string),
				Role:      UserRole(userData["role"].(string)),
				IsActive:  userData["isActive"].(bool),
				CreatedAt: createdAt,
				UpdatedAt: &updatedAt,
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

	result, err := r.postResolver.CreatePost(ctx, userID, input.Title, input.Text, input.Photos, input.Types, location)
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

	return &ItemPayload{
		Success: result["success"].(bool),
		Message: result["message"].(string),
		Data: &Item{
			ID:          data["id"].(string),
			Name:        data["name"].(string),
			Description: data["description"].(string),
			Category:    data["category"].(string),
			Price:       data["price"].(float64),
			Stock:       data["stock"].(int),
			IsActive:    data["isActive"].(bool),
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
	result, err := r.ownerResolver.UpdateItem(ctx, id, userID, *input.Name, *input.Price)
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
	if input.Name != nil {
		firstName = *input.Name
	}

	result, err := r.userResolver.UpdateProfile(ctx, userID, firstName, lastName, phone)
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
			ID:        data["id"].(string),
			Name:      data["name"].(string),
			Email:     data["email"].(string),
			Role:      UserRole(data["role"].(string)),
			IsActive:  data["isActive"].(bool),
			CreatedAt: createdAt,
			UpdatedAt: &updatedAt,
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

	result, _ := r.productResolver.Items(ctx, pageVal, limitVal)
	data := result["data"].([]map[string]interface{})
	items := make([]*Item, len(data))
	for i, itemMap := range data {
		items[i] = &Item{
			ID:       itemMap["id"].(string),
			Name:     itemMap["name"].(string),
			Price:    itemMap["price"].(float64),
			Stock:    int(itemMap["stock"].(float64)),
			IsActive: itemMap["isActive"].(bool),
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
		items[i] = &Item{
			ID:          itemMap["id"].(string),
			Name:        itemMap["name"].(string),
			Description: itemMap["description"].(string),
			Category:    itemMap["category"].(string),
			Price:       itemMap["price"].(float64),
			Stock:       stock,
			IsActive:    itemMap["isActive"].(bool),
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
		productResolver: product.NewProductResolver(),
		ownerResolver:   owner.NewOwnerResolver(db),
		postResolver:    post.NewPostResolver(db),
		db:              db,
		jwtSecret:       jwtSecret,
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
