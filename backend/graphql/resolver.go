package graphql

// THIS CODE WILL BE UPDATED WITH SCHEMA CHANGES. PREVIOUS IMPLEMENTATION FOR SCHEMA CHANGES WILL BE KEPT IN THE COMMENT SECTION. IMPLEMENTATION FOR UNCHANGED SCHEMA WILL BE KEPT.

import (
	"context"
	"time"

	"tindahan-backend/api/handlers/auth"
	"tindahan-backend/api/handlers/middleware"
	"tindahan-backend/api/handlers/owner"
	"tindahan-backend/api/handlers/product"
	"tindahan-backend/api/handlers/shop"
	"tindahan-backend/api/handlers/user"

	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
)

type Resolver struct {
	authResolver    *auth.AuthResolver
	userResolver    *user.UserResolver
	shopResolver    *shop.ShopResolver
	productResolver *product.ProductResolver
	ownerResolver   *owner.OwnerResolver
	jwtSecret       string
}

func NewResolver(db *mongo.Database, jwtSecret string) *Resolver {
	return &Resolver{
		authResolver:    auth.NewAuthResolver(db, jwtSecret),
		userResolver:    user.NewUserResolver(db),
		shopResolver:    shop.NewShopResolver(db),
		productResolver: product.NewProductResolver(),
		ownerResolver:   owner.NewOwnerResolver(db),
		jwtSecret:       jwtSecret,
	}
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
	firstName := input.Name
	lastName := ""
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

// CreateItem is the resolver for the createItem field.
func (r *mutationResolver) CreateItem(ctx context.Context, input CreateItemInput) (*ItemPayload, error) {
	userID := middleware.GetUserID(ctx)
	if userID == "" {
		return &ItemPayload{
			Success: false,
			Message: "Authentication required",
		}, nil
	}
	result, err := r.ownerResolver.CreateItem(ctx, userID, input.ShopID, input.Name, input.Price, input.Stock)
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
	result, err := r.ownerResolver.CreateShop(ctx, userID, input.Name, input.Location)
	if err != nil {
		return &ShopPayload{
			Success: false,
			Message: result["message"].(string),
		}, nil
	}
	data := result["data"].(map[string]interface{})

	return &ShopPayload{
		Success: result["success"].(bool),
		Message: result["message"].(string),
		Data: &Shop{
			ID:     data["id"].(string),
			Name:   data["name"].(string),
			Status: ShopStatus(data["status"].(string)),
		},
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
	result, err := r.ownerResolver.UpdateShop(ctx, id, userID, *input.Name, *input.Location)
	if err != nil {
		return &ShopPayload{
			Success: false,
			Message: result["message"].(string),
		}, nil
	}
	data := result["data"].(map[string]interface{})

	return &ShopPayload{
		Success: result["success"].(bool),
		Message: result["message"].(string),
		Data: &Shop{
			ID:     data["id"].(string),
			Name:   data["name"].(string),
			Status: ShopStatus(data["status"].(string)),
		},
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

// Health is the resolver for the health field.
func (r *queryResolver) Health(ctx context.Context) (string, error) {
	return "GraphQL API is healthy", nil
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
		shops[i] = &Shop{
			ID:     shopMap["id"].(string),
			Name:   shopMap["name"].(string),
			Status: ShopStatus(shopMap["status"].(string)),
		}
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

// !!! WARNING !!!
// The code below was going to be deleted when updating resolvers. It has been copied here so you have
// one last chance to move it out of harms way if you want. There are two reasons this happens:
//  - When renaming or deleting a resolver the old code will be put in here. You can safely delete
//    it when you're done.
//  - You have helper methods in this file. Move them out to keep these resolver files clean.
/*
	type Resolver struct {
	authResolver    *auth.AuthResolver
	userResolver    *user.UserResolver
	shopResolver    *shop.ShopResolver
	productResolver *product.ProductResolver
	ownerResolver   *owner.OwnerResolver
	jwtSecret       string
}
func NewResolver(db *mongo.Database, jwtSecret string) *Resolver {
	return &Resolver{
		authResolver:    auth.NewAuthResolver(db, jwtSecret),
		userResolver:    user.NewUserResolver(db),
		shopResolver:    shop.NewShopResolver(db),
		productResolver: product.NewProductResolver(),
		ownerResolver:   owner.NewOwnerResolver(db),
		jwtSecret:       jwtSecret,
	}
}
*/
