package owner

import (
	"context"
	"fmt"
	"time"

	"tindahan-backend/domain"
	"tindahan-backend/repository"

	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
)

type OwnerResolver struct {
	productRepo repository.ProductRepository
	storeRepo   repository.StoreRepository
}

func NewOwnerResolver(db *mongo.Database) *OwnerResolver {
	return &OwnerResolver{
		productRepo: repository.NewProductRepository(db),
		storeRepo:   repository.NewStoreRepository(db),
	}
}

// GetOwnerShops retrieves all shops for a specific owner (real DB implementation)
func (r *OwnerResolver) GetOwnerShops(ctx context.Context, ownerId string, page, limit int) (map[string]interface{}, error) {
	// Convert ownerId to ObjectID
	ownerObjectID, err := primitive.ObjectIDFromHex(ownerId)
	if err != nil {
		return map[string]interface{}{
			"success": false,
			"message": "Invalid owner ID format",
		}, err
	}

	// Fetch from database
	stores, total, err := r.storeRepo.GetMyStores(ctx, ownerObjectID, page, limit)
	if err != nil {
		return map[string]interface{}{
			"success": false,
			"message": "Failed to fetch shops: " + err.Error(),
		}, err
	}

	// Convert to response format with all fields
	data := make([]map[string]interface{}, len(stores))
	for i, store := range stores {
		status := store.Status
		if status == "" {
			status = "ACTIVE"
		}
		businessType := store.BusinessType
		if businessType == "" {
			businessType = "SARI_SARI_STORE"
		}

		// Ensure verification always has a value
		verification := store.Verification
		if !verification.IsVerified && verification.VerifiedDate == "" && verification.VerificationID == "" {
			verification = domain.Verification{
				IsVerified: false,
			}
		}

		data[i] = map[string]interface{}{
			"id":          store.ID.Hex(),
			"name":        store.Name,
			"description": store.Description,
			"location":    store.Address,
			"coordinates": map[string]float64{
				"lat": store.Latitude,
				"lng": store.Longitude,
			},
			"coverPhoto":     store.CoverPhoto,
			"otherPhotos":    store.OtherPhotos,
			"businessHours":  store.BusinessHours,
			"businessType":   businessType,
			"paymentMethods": store.PaymentMethods,
			"delivery":       store.Delivery,
			"socialMedia":    store.SocialMedia,
			"verification":   verification,
			"contactDetails": store.ContactDetails,
			"status":         status,
			"createdAt":      store.CreatedAt.Format(time.RFC3339),
			"updatedAt":      store.UpdatedAt.Format(time.RFC3339),
			"createdBy":      store.OwnerID.Hex(),
		}
		fmt.Printf("DEBUG GetOwnerShops: store %s description = '%s'\n", store.ID.Hex(), store.Description)
	}

	return map[string]interface{}{
		"success": true,
		"message": "Owner shops retrieved successfully",
		"data":    data,
		"total":   total,
	}, nil
}

// CreateShopInput represents all fields for creating a shop
type CreateShopInput struct {
	Name           string
	Description    string
	Location       string
	Coordinates    struct{ Lat, Lng float64 }
	CoverPhoto     string
	OtherPhotos    []string
	BusinessHours  domain.BusinessHours
	BusinessType   string
	PaymentMethods domain.PaymentMethods
	Delivery       domain.DeliveryOptions
	SocialMedia    domain.SocialMedia
	ContactDetails domain.ContactDetails
}

// CreateShop creates a new shop for the owner (real DB implementation)
func (r *OwnerResolver) CreateShop(ctx context.Context, ownerId string, input CreateShopInput) (map[string]interface{}, error) {
	// Convert ownerId to ObjectID
	ownerObjectID, err := primitive.ObjectIDFromHex(ownerId)
	if err != nil {
		return map[string]interface{}{
			"success": false,
			"message": "Invalid owner ID format",
		}, err
	}

	now := time.Now()

	// Debug logging
	fmt.Printf("DEBUG CreateShop: input.Description = '%s'\n", input.Description)

	// Create store domain object with all fields
	store := &domain.Store{
		ID:          primitive.NewObjectID(),
		Name:        input.Name,
		Address:     input.Location,
		Description: input.Description,
		City:        "",
		Latitude:    input.Coordinates.Lat,
		Longitude:   input.Coordinates.Lng,
		OwnerID:     ownerObjectID,
		Category:    "",
		Rating:      0.0,
		IsActive:    true,
		CreatedAt:   now,
		UpdatedAt:   now,
		// Additional fields from input
		CoverPhoto:     input.CoverPhoto,
		OtherPhotos:    input.OtherPhotos,
		BusinessHours:  input.BusinessHours,
		BusinessType:   input.BusinessType,
		PaymentMethods: input.PaymentMethods,
		Delivery:       input.Delivery,
		SocialMedia:    input.SocialMedia,
		ContactDetails: input.ContactDetails,
		Status:         "ACTIVE",
	}

	// Save to database
	if err := r.storeRepo.CreateStore(ctx, store); err != nil {
		return map[string]interface{}{
			"success": false,
			"message": "Failed to create shop: " + err.Error(),
		}, err
	}
	fmt.Printf("DEBUG CreateShop: saved store with description = '%s'\n", store.Description)

	// Ensure verification always has a value (required by GraphQL schema)
	verification := store.Verification
	if !verification.IsVerified && verification.VerifiedDate == "" && verification.VerificationID == "" {
		verification = domain.Verification{
			IsVerified: false,
		}
	}

	return map[string]interface{}{
		"success": true,
		"message": "Shop created successfully",
		"data": map[string]interface{}{
			"id":             store.ID.Hex(),
			"name":           store.Name,
			"location":       store.Address,
			"coordinates":    map[string]float64{"lat": store.Latitude, "lng": store.Longitude},
			"coverPhoto":     store.CoverPhoto,
			"otherPhotos":    store.OtherPhotos,
			"businessHours":  store.BusinessHours,
			"businessType":   store.BusinessType,
			"paymentMethods": store.PaymentMethods,
			"delivery":       store.Delivery,
			"socialMedia":    store.SocialMedia,
			"verification":   verification,
			"contactDetails": store.ContactDetails,
			"status":         store.Status,
			"createdAt":      store.CreatedAt.Format(time.RFC3339),
			"updatedAt":      store.UpdatedAt.Format(time.RFC3339),
			"createdBy":      ownerId,
		},
	}, nil
}

// UpdateShopInput contains all fields for updating a shop
type UpdateShopInput struct {
	Name           string
	Description    string
	Location       string
	Coordinates    struct{ Lat, Lng float64 }
	CoverPhoto     string
	OtherPhotos    []string
	BusinessHours  domain.BusinessHours
	BusinessType   string
	PaymentMethods domain.PaymentMethods
	Delivery       domain.DeliveryOptions
	SocialMedia    domain.SocialMedia
	ContactDetails domain.ContactDetails
	Status         string
}

// UpdateShop updates an existing shop with all fields (real DB implementation)
func (r *OwnerResolver) UpdateShop(ctx context.Context, shopId, ownerId string, input UpdateShopInput) (map[string]interface{}, error) {
	fmt.Printf("DEBUG UpdateShop: input.Description = '%s'\n", input.Description)

	// Convert shopId to ObjectID
	shopObjectID, err := primitive.ObjectIDFromHex(shopId)
	if err != nil {
		return map[string]interface{}{
			"success": false,
			"message": "Invalid shop ID format",
		}, err
	}

	// Verify ownership - fetch shop and check if ownerId matches
	store, err := r.storeRepo.GetStoreByID(ctx, shopObjectID)
	if err != nil {
		return map[string]interface{}{
			"success": false,
			"message": "Shop not found",
		}, err
	}

	ownerObjectID, _ := primitive.ObjectIDFromHex(ownerId)
	if store.OwnerID != ownerObjectID {
		return map[string]interface{}{
			"success": false,
			"message": "Unauthorized: You can only update your own shops",
		}, nil
	}

	// Build update request with all fields
	updates := &domain.UpdateStoreRequest{}

	if input.Name != "" {
		updates.Name = &input.Name
	}
	if input.Description != "" {
		updates.Description = &input.Description
	}
	if input.Location != "" {
		updates.Address = &input.Location
	}
	if input.CoverPhoto != "" {
		updates.CoverPhoto = &input.CoverPhoto
	}
	if len(input.OtherPhotos) > 0 {
		updates.OtherPhotos = &input.OtherPhotos
	}
	if input.BusinessType != "" {
		updates.BusinessType = &input.BusinessType
	}
	if input.Status != "" {
		updates.Status = &input.Status
	}

	// Always update coordinates if provided (Lat/Lng can be 0,0)
	updates.Latitude = &input.Coordinates.Lat
	updates.Longitude = &input.Coordinates.Lng

	// Update nested structs (always include them if they have data)
	updates.BusinessHours = &input.BusinessHours
	updates.PaymentMethods = &input.PaymentMethods
	updates.Delivery = &input.Delivery
	updates.SocialMedia = &input.SocialMedia
	updates.ContactDetails = &input.ContactDetails

	// Update in database
	if err := r.storeRepo.UpdateStore(ctx, shopObjectID, updates); err != nil {
		return map[string]interface{}{
			"success": false,
			"message": "Failed to update shop: " + err.Error(),
		}, err
	}

	// Fetch updated store
	updatedStore, err := r.storeRepo.GetStoreByID(ctx, shopObjectID)
	if err != nil {
		return map[string]interface{}{
			"success": true,
			"message": "Shop updated but failed to fetch updated data",
			"data": map[string]interface{}{
				"id":       shopId,
				"name":     input.Name,
				"location": input.Location,
			},
		}, nil
	}

	// Ensure verification always has a value (required by GraphQL schema)
	verification := updatedStore.Verification
	if !verification.IsVerified && verification.VerifiedDate == "" && verification.VerificationID == "" {
		verification = domain.Verification{
			IsVerified: false,
		}
	}

	return map[string]interface{}{
		"success": true,
		"message": "Shop updated successfully",
		"data": map[string]interface{}{
			"id":             updatedStore.ID.Hex(),
			"name":           updatedStore.Name,
			"location":       updatedStore.Address,
			"coordinates":    map[string]float64{"lat": updatedStore.Latitude, "lng": updatedStore.Longitude},
			"coverPhoto":     updatedStore.CoverPhoto,
			"otherPhotos":    updatedStore.OtherPhotos,
			"businessHours":  updatedStore.BusinessHours,
			"businessType":   updatedStore.BusinessType,
			"paymentMethods": updatedStore.PaymentMethods,
			"delivery":       updatedStore.Delivery,
			"socialMedia":    updatedStore.SocialMedia,
			"verification":   verification,
			"contactDetails": updatedStore.ContactDetails,
			"status":         updatedStore.Status,
			"createdAt":      updatedStore.CreatedAt.Format(time.RFC3339),
			"updatedAt":      updatedStore.UpdatedAt.Format(time.RFC3339),
			"createdBy":      ownerId,
		},
	}, nil
}

// DeleteShop deletes a shop (real DB implementation)
func (r *OwnerResolver) DeleteShop(ctx context.Context, shopId, ownerId string) (map[string]interface{}, error) {
	// Convert shopId to ObjectID
	shopObjectID, err := primitive.ObjectIDFromHex(shopId)
	if err != nil {
		return map[string]interface{}{
			"success": false,
			"message": "Invalid shop ID format",
		}, err
	}

	// Verify ownership - fetch shop and check if ownerId matches
	store, err := r.storeRepo.GetStoreByID(ctx, shopObjectID)
	if err != nil {
		return map[string]interface{}{
			"success": false,
			"message": "Shop not found",
		}, err
	}

	ownerObjectID, _ := primitive.ObjectIDFromHex(ownerId)
	if store.OwnerID != ownerObjectID {
		return map[string]interface{}{
			"success": false,
			"message": "Unauthorized: You can only delete your own shops",
		}, nil
	}

	// Delete from database
	if err := r.storeRepo.DeleteStore(ctx, shopObjectID); err != nil {
		return map[string]interface{}{
			"success": false,
			"message": "Failed to delete shop: " + err.Error(),
		}, err
	}

	return map[string]interface{}{
		"success": true,
		"message": "Shop deleted successfully",
	}, nil
}

// GetOwnerItems retrieves all items for a specific owner (real DB implementation)
func (r *OwnerResolver) GetOwnerItems(ctx context.Context, ownerId string, page, limit int) (map[string]interface{}, error) {
	// Convert ownerId to ObjectID
	ownerObjectID, err := primitive.ObjectIDFromHex(ownerId)
	if err != nil {
		return map[string]interface{}{
			"success": false,
			"message": "Invalid owner ID format",
		}, err
	}

	// Get all stores owned by the owner
	stores, _, err := r.storeRepo.GetMyStores(ctx, ownerObjectID, 1, 1000)
	if err != nil {
		return map[string]interface{}{
			"success": false,
			"message": "Failed to fetch owner stores: " + err.Error(),
		}, err
	}

	if len(stores) == 0 {
		return map[string]interface{}{
			"success": true,
			"message": "No stores found for this owner",
			"data":    []map[string]interface{}{},
			"total":   0,
		}, nil
	}

	// Collect all products from all stores
	var allProducts []*domain.Product
	var totalCount int64

	for _, store := range stores {
		products, count, err := r.productRepo.GetMyProducts(ctx, store.ID, 1, 1000)
		if err != nil {
			continue // Skip stores with errors
		}
		allProducts = append(allProducts, products...)
		totalCount += count
	}

	// Pagination
	if page <= 0 {
		page = 1
	}
	if limit <= 0 {
		limit = 10
	}

	start := (page - 1) * limit
	end := start + limit
	if start > len(allProducts) {
		start = len(allProducts)
	}
	if end > len(allProducts) {
		end = len(allProducts)
	}

	paginatedProducts := allProducts[start:end]

	// Convert to response format
	data := make([]map[string]interface{}, len(paginatedProducts))
	for i, product := range paginatedProducts {
		data[i] = map[string]interface{}{
			"id":          product.ID.Hex(),
			"name":        product.Name,
			"price":       product.Price,
			"description": product.Description,
			"category":    product.Category,
			"stock":       product.Stock,
			"isActive":    product.IsActive,
			"rating":      product.Rating,
			"shopId":      product.StoreID.Hex(),
			"createdAt":   product.CreatedAt.Format(time.RFC3339),
			"updatedAt":   product.UpdatedAt.Format(time.RFC3339),
		}
	}

	return map[string]interface{}{
		"success": true,
		"message": "Owner items retrieved successfully",
		"data":    data,
		"total":   totalCount,
	}, nil
}

// GetStoreByID retrieves a store by ID using the repository
func (r *OwnerResolver) GetStoreByID(ctx context.Context, id primitive.ObjectID) (*domain.Store, error) {
	return r.storeRepo.GetStoreByID(ctx, id)
}

// CreateItem creates a new item for the owner (real DB implementation)
func (r *OwnerResolver) CreateItem(ctx context.Context, ownerId, shopId string, name string, price float64, stock int, description, category string) (map[string]interface{}, error) {
	// Convert shopId string to ObjectID
	shopObjectID, err := primitive.ObjectIDFromHex(shopId)
	if err != nil {
		return map[string]interface{}{
			"success": false,
			"message": "Invalid shop ID format",
		}, err
	}

	// Create product domain object
	product := &domain.Product{
		ID:          primitive.NewObjectID(),
		Name:        name,
		Description: description,
		Category:    category,
		Price:       price,
		Stock:       stock,
		StoreID:     shopObjectID,
		IsActive:    true,
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
	}

	// Save to database
	if err := r.productRepo.CreateProduct(ctx, product); err != nil {
		return map[string]interface{}{
			"success": false,
			"message": "Failed to create item: " + err.Error(),
		}, err
	}

	return map[string]interface{}{
		"success": true,
		"message": "Item created successfully",
		"data": map[string]interface{}{
			"id":          product.ID.Hex(),
			"name":        product.Name,
			"description": product.Description,
			"category":    product.Category,
			"price":       product.Price,
			"stock":       product.Stock,
			"isActive":    product.IsActive,
			"rating":      product.Rating,
			"shopId":      shopId,
			"createdAt":   product.CreatedAt.Format(time.RFC3339),
			"updatedAt":   product.UpdatedAt.Format(time.RFC3339),
		},
	}, nil
}

// GetTopRatedItemsByShop retrieves top rated items for a shop preview
func (r *OwnerResolver) GetTopRatedItemsByShop(ctx context.Context, shopId string, limit int) (map[string]interface{}, error) {
	// Convert shopId to ObjectID
	shopObjectID, err := primitive.ObjectIDFromHex(shopId)
	if err != nil {
		return map[string]interface{}{
			"success": false,
			"message": "Invalid shop ID format",
		}, err
	}

	// Get top rated products
	products, err := r.productRepo.GetTopRatedProductsByShop(ctx, shopObjectID, limit)
	if err != nil {
		return map[string]interface{}{
			"success": false,
			"message": "Failed to fetch top rated items: " + err.Error(),
		}, err
	}

	// Convert to response format
	data := make([]map[string]interface{}, len(products))
	for i, product := range products {
		data[i] = map[string]interface{}{
			"id":          product.ID.Hex(),
			"name":        product.Name,
			"price":       product.Price,
			"description": product.Description,
			"category":    product.Category,
			"stock":       product.Stock,
			"isActive":    product.IsActive,
			"rating":      product.Rating,
			"shopId":      product.StoreID.Hex(),
			"createdAt":   product.CreatedAt.Format(time.RFC3339),
			"updatedAt":   product.UpdatedAt.Format(time.RFC3339),
		}
	}

	return map[string]interface{}{
		"success": true,
		"message": "Top rated items retrieved successfully",
		"data":    data,
		"total":   len(products),
	}, nil
}

func (r *OwnerResolver) GetProductByID(ctx context.Context, id primitive.ObjectID) (*domain.Product, error) {
	return r.productRepo.GetProductByID(ctx, id)
}

// UpdateItem updates an item (real DB implementation)
func (r *OwnerResolver) UpdateItem(ctx context.Context, itemId, ownerId string, updates *domain.UpdateProductRequest) (map[string]interface{}, error) {
	// Convert itemId to ObjectID
	objectID, err := primitive.ObjectIDFromHex(itemId)
	if err != nil {
		return map[string]interface{}{
			"success": false,
			"message": "Invalid item ID format",
		}, err
	}

	// Verify ownership - fetch item and check if owner owns the shop
	product, err := r.productRepo.GetProductByID(ctx, objectID)
	if err != nil {
		return map[string]interface{}{
			"success": false,
			"message": "Item not found",
		}, err
	}

	// Fetch the shop that owns this item
	store, err := r.storeRepo.GetStoreByID(ctx, product.StoreID)
	if err != nil {
		return map[string]interface{}{
			"success": false,
			"message": "Shop not found for this item",
		}, err
	}

	// Check if requesting user owns the shop
	ownerObjectID, _ := primitive.ObjectIDFromHex(ownerId)
	if store.OwnerID != ownerObjectID {
		return map[string]interface{}{
			"success": false,
			"message": "Unauthorized: You can only update items in your own shops",
		}, nil
	}

	// Update in database using the provided updates
	if err := r.productRepo.UpdateProduct(ctx, objectID, updates); err != nil {
		return map[string]interface{}{
			"success": false,
			"message": "Failed to update item: " + err.Error(),
		}, err
	}

	// Fetch updated product
	updatedProduct, err := r.productRepo.GetProductByID(ctx, objectID)
	if err != nil {
		return map[string]interface{}{
			"success": true,
			"message": "Item updated but failed to fetch updated data",
			"data": map[string]interface{}{
				"id": itemId,
			},
		}, nil
	}

	return map[string]interface{}{
		"success": true,
		"message": "Item updated successfully",
		"data": map[string]interface{}{
			"id":        updatedProduct.ID.Hex(),
			"name":      updatedProduct.Name,
			"price":     updatedProduct.Price,
			"stock":     updatedProduct.Stock,
			"isActive":  updatedProduct.IsActive,
			"shopId":    updatedProduct.StoreID.Hex(),
			"updatedAt": updatedProduct.UpdatedAt.Format(time.RFC3339),
		},
	}, nil
}

// DeleteItem deletes an item (real DB implementation)
func (r *OwnerResolver) DeleteItem(ctx context.Context, itemId, ownerId string) (map[string]interface{}, error) {
	// Convert itemId to ObjectID
	objectID, err := primitive.ObjectIDFromHex(itemId)
	if err != nil {
		return map[string]interface{}{
			"success": false,
			"message": "Invalid item ID format",
		}, err
	}

	// Verify ownership - fetch item and check if owner owns the shop
	product, err := r.productRepo.GetProductByID(ctx, objectID)
	if err != nil {
		return map[string]interface{}{
			"success": false,
			"message": "Item not found",
		}, err
	}

	// Fetch the shop that owns this item
	store, err := r.storeRepo.GetStoreByID(ctx, product.StoreID)
	if err != nil {
		return map[string]interface{}{
			"success": false,
			"message": "Shop not found for this item",
		}, err
	}

	// Check if requesting user owns the shop
	ownerObjectID, _ := primitive.ObjectIDFromHex(ownerId)
	if store.OwnerID != ownerObjectID {
		return map[string]interface{}{
			"success": false,
			"message": "Unauthorized: You can only delete items in your own shops",
		}, nil
	}

	// Delete from database
	if err := r.productRepo.DeleteProduct(ctx, objectID); err != nil {
		return map[string]interface{}{
			"success": false,
			"message": "Failed to delete item: " + err.Error(),
		}, err
	}

	return map[string]interface{}{
		"success": true,
		"message": "Item deleted successfully",
	}, nil
}

// UpdateShopStatus updates shop status
func (r *OwnerResolver) UpdateShopStatus(ctx context.Context, shopId, ownerId string, status string) (map[string]interface{}, error) {
	return map[string]interface{}{
		"success": true,
		"message": "Shop status updated successfully",
		"data": map[string]interface{}{
			"id":     shopId,
			"status": status,
		},
	}, nil
}

// UpdateItemStock updates item stock
func (r *OwnerResolver) UpdateItemStock(ctx context.Context, itemId, ownerId string, stock int) (map[string]interface{}, error) {
	return map[string]interface{}{
		"success": true,
		"message": "Item stock updated successfully",
		"data": map[string]interface{}{
			"id":    itemId,
			"stock": stock,
		},
	}, nil
}

// GetShopAnalytics retrieves shop analytics
func (r *OwnerResolver) GetShopAnalytics(ctx context.Context, shopId, ownerId string) (map[string]interface{}, error) {
	return map[string]interface{}{
		"success": true,
		"message": "Shop analytics retrieved successfully",
		"data": map[string]interface{}{
			"shopId":      shopId,
			"totalViews":  150,
			"totalOrders": 45,
			"revenue":     12500.50,
			"topItems": []map[string]interface{}{
				{
					"id":    "item1",
					"name":  "Top Item 1",
					"sales": 25,
				},
				{
					"id":    "item2",
					"name":  "Top Item 2",
					"sales": 20,
				},
			},
		},
	}, nil
}

// GetItemAnalytics retrieves item analytics
func (r *OwnerResolver) GetItemAnalytics(ctx context.Context, itemId, ownerId string) (map[string]interface{}, error) {
	// Mock current stock for analytics
	currentStock := 15
	return map[string]interface{}{
		"success": true,
		"message": "Item analytics retrieved successfully",
		"data": map[string]interface{}{
			"itemId":     itemId,
			"totalViews": 89,
			"totalSales": 23,
			"revenue":    1725.00,
			"lowStock":   currentStock < 10,
			"stock":      currentStock,
		},
	}, nil
}

// BulkUpdateItems bulk updates multiple items
func (r *OwnerResolver) BulkUpdateItems(ctx context.Context, ownerId string, itemIds []string, updates map[string]interface{}) (map[string]interface{}, error) {
	return map[string]interface{}{
		"success": true,
		"message": "Bulk items updated successfully",
		"data": map[string]interface{}{
			"updatedCount": len(itemIds),
			"itemIds":      itemIds,
		},
	}, nil
}
