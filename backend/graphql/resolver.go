package graphql

import (
	"context"

	"tindahan-backend/api/handlers/auth"
	"tindahan-backend/api/handlers/owner"
	"tindahan-backend/api/handlers/product"
	"tindahan-backend/api/handlers/shop"
	"tindahan-backend/api/handlers/user"
)

type Resolver struct {
	authResolver    *auth.AuthResolver
	userResolver    *user.UserResolver
	shopResolver    *shop.ShopResolver
	productResolver *product.ProductResolver
	ownerResolver  *owner.OwnerResolver
}

func NewResolver() *Resolver {
	return &Resolver{
		authResolver:    auth.NewAuthResolver(),
		userResolver:    user.NewUserResolver(),
		shopResolver:    shop.NewShopResolver(),
		productResolver: product.NewProductResolver(),
		ownerResolver:  owner.NewOwnerResolver(),
	}
}

// Query resolvers
func (r *Resolver) Health(ctx context.Context) (string, error) {
	return "GraphQL API is healthy", nil
}

// Mutation resolvers - delegate to auth resolver
func (r *Resolver) Login(ctx context.Context, input LoginInput) (*AuthPayload, error) {
	result, _ := r.authResolver.Login(ctx, input.Email, input.Password)
	data := result["data"].(map[string]interface{})
	userData := data["user"].(map[string]interface{})
	
	return &AuthPayload{
		Success: result["success"].(bool),
		Message: result["message"].(string),
		Data: &AuthResponse{
			User: &User{
				ID:       userData["id"].(string),
				Name:     userData["name"].(string),
				Email:    userData["email"].(string),
				Role:     UserRole(userData["role"].(string)),
				IsActive: userData["isActive"].(bool),
			},
			AccessToken:  data["accessToken"].(string),
			RefreshToken: data["refreshToken"].(string),
		},
	}, nil
}

func (r *Resolver) Signup(ctx context.Context, input SignupInput) (*AuthPayload, error) {
	role := "CUSTOMER"
	if input.Role != nil {
		role = string(*input.Role)
	}
	result, _ := r.authResolver.Signup(ctx, input.Name, input.Email, input.Password, role)
	data := result["data"].(map[string]interface{})
	userData := data["user"].(map[string]interface{})
	
	return &AuthPayload{
		Success: result["success"].(bool),
		Message: result["message"].(string),
		Data: &AuthResponse{
			User: &User{
				ID:       userData["id"].(string),
				Name:     userData["name"].(string),
				Email:    userData["email"].(string),
				Role:     UserRole(userData["role"].(string)),
				IsActive: userData["isActive"].(bool),
			},
			AccessToken:  data["accessToken"].(string),
			RefreshToken: data["refreshToken"].(string),
		},
	}, nil
}

func (r *Resolver) RefreshToken(ctx context.Context, input RefreshTokenInput) (*AuthPayload, error) {
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

// User resolvers - delegate to user resolver
func (r *Resolver) Me(ctx context.Context) (*UserPayload, error) {
	result, _ := r.userResolver.Me(ctx)
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

func (r *Resolver) Users(ctx context.Context, page *int, limit *int) ([]*User, error) {
	pageVal := 1
	limitVal := 10
	if page != nil {
		pageVal = *page
	}
	if limit != nil {
		limitVal = *limit
	}
	
	result, _ := r.userResolver.Users(ctx, pageVal, limitVal)
	users := make([]*User, len(result))
	for i, userMap := range result {
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

func (r *Resolver) UpdateProfile(ctx context.Context, input UpdateProfileInput) (*UserPayload, error) {
	result, _ := r.userResolver.UpdateProfile(ctx, *input.Name)
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

func (r *Resolver) UpdateUserStatus(ctx context.Context, id string, isActive bool) (*UserPayload, error) {
	result, _ := r.userResolver.UpdateUserStatus(ctx, id, isActive)
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

// Shop resolvers - delegate to shop resolver
func (r *Resolver) Shop(ctx context.Context, id string) (*ShopPayload, error) {
	result, _ := r.shopResolver.Shop(ctx, id)
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

func (r *Resolver) Shops(ctx context.Context, input *ShopSearchInput) (*ShopsPayload, error) {
	pageVal := 1
	limitVal := 10
	if input != nil && input.Page != nil {
		pageVal = *input.Page
	}
	if input != nil && input.Limit != nil {
		limitVal = *input.Limit
	}
	
	result, _ := r.shopResolver.Shops(ctx, pageVal, limitVal)
	data := result["data"].([]map[string]interface{})
	shops := make([]*Shop, len(data))
	for i, shopMap := range data {
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

func (r *Resolver) CreateShop(ctx context.Context, input CreateShopInput) (*ShopPayload, error) {
	// Delegate to owner resolver for shop creation
	result, _ := r.ownerResolver.CreateShop(ctx, "owner123", input.Name, input.Location)
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

func (r *Resolver) UpdateShop(ctx context.Context, id string, input UpdateShopInput) (*ShopPayload, error) {
	// Delegate to owner resolver for shop updates
	result, _ := r.ownerResolver.UpdateShop(ctx, id, "owner123", *input.Name, *input.Location)
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

func (r *Resolver) DeleteShop(ctx context.Context, id string) (*DeletePayload, error) {
	// Delegate to owner resolver for shop deletion
	result, _ := r.ownerResolver.DeleteShop(ctx, id, "owner123")
	
	return &DeletePayload{
		Success: result["success"].(bool),
		Message: result["message"].(string),
	}, nil
}

// Product resolvers - delegate to product resolver
func (r *Resolver) Item(ctx context.Context, id string) (*ItemPayload, error) {
	result, _ := r.productResolver.Item(ctx, id)
	data := result["data"].(map[string]interface{})
	
	return &ItemPayload{
		Success: result["success"].(bool),
		Message: result["message"].(string),
		Data: &Item{
			ID:       data["id"].(string),
			Name:     data["name"].(string),
			Price:    data["price"].(float64),
			Stock:    int(data["stock"].(float64)),
			IsActive: data["isActive"].(bool),
		},
	}, nil
}

func (r *Resolver) Items(ctx context.Context, input *ProductSearchInput) (*ItemsPayload, error) {
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

func (r *Resolver) MyItems(ctx context.Context, page *int, limit *int) (*ItemsPayload, error) {
	// Delegate to owner resolver for item management
	pageVal := 1
	limitVal := 10
	if page != nil {
		pageVal = *page
	}
	if limit != nil {
		limitVal = *limit
	}
	
	result, _ := r.ownerResolver.GetOwnerItems(ctx, "owner123", pageVal, limitVal)
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

func (r *Resolver) CreateItem(ctx context.Context, input CreateItemInput) (*ItemPayload, error) {
	// Delegate to owner resolver for item creation
	result, _ := r.ownerResolver.CreateItem(ctx, "owner123", input.ShopID, input.Name, input.Price, input.Stock)
	data := result["data"].(map[string]interface{})
	
	return &ItemPayload{
		Success: result["success"].(bool),
		Message: result["message"].(string),
		Data: &Item{
			ID:       data["id"].(string),
			Name:     data["name"].(string),
			Price:    data["price"].(float64),
			Stock:    int(data["stock"].(float64)),
			IsActive: data["isActive"].(bool),
		},
	}, nil
}

func (r *Resolver) UpdateItem(ctx context.Context, id string, input UpdateItemInput) (*ItemPayload, error) {
	// Delegate to owner resolver for item updates
	result, _ := r.ownerResolver.UpdateItem(ctx, id, "owner123", *input.Name, *input.Price)
	data := result["data"].(map[string]interface{})
	
	return &ItemPayload{
		Success: result["success"].(bool),
		Message: result["message"].(string),
		Data: &Item{
			ID:       data["id"].(string),
			Name:     data["name"].(string),
			Price:    data["price"].(float64),
		},
	}, nil
}

func (r *Resolver) DeleteItem(ctx context.Context, id string) (*DeletePayload, error) {
	// Delegate to owner resolver for item deletion
	result, _ := r.ownerResolver.DeleteItem(ctx, id, "owner123")
	
	return &DeletePayload{
		Success: result["success"].(bool),
		Message: result["message"].(string),
	}, nil
}

// Add missing methods for ResolverRoot interface
func (r *Resolver) Mutation() MutationResolver { return &mutationResolver{r} }
func (r *Resolver) Query() QueryResolver { return &queryResolver{r} }
func (r *Resolver) Subscription() SubscriptionResolver { return &subscriptionResolver{r} }

type mutationResolver struct{ *Resolver }
type queryResolver struct{ *Resolver }

// Add missing MyShops method
func (r *queryResolver) MyShops(ctx context.Context, page *int, limit *int) (*ShopsPayload, error) {
	return r.MyShops(ctx, page, limit)
}
type subscriptionResolver struct{ *Resolver }

// Add missing subscription methods
func (r *subscriptionResolver) ItemStockUpdates(ctx context.Context, shopID string) (<-chan *Item, error) {
	// TODO: Implement real-time item stock updates
	return nil, nil
}

func (r *subscriptionResolver) ShopStatusUpdates(ctx context.Context) (<-chan *Shop, error) {
	// TODO: Implement real-time shop status updates
	return nil, nil
}
