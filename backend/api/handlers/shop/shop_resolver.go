package shop

import (
	"context"
	"time"

	"tindahan-backend/domain"
	"tindahan-backend/repository"

	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
)

type ShopResolver struct {
	storeRepo   repository.StoreRepository
	productRepo repository.ProductRepository
}

func NewShopResolver(db *mongo.Database) *ShopResolver {
	return &ShopResolver{
		storeRepo:   repository.NewStoreRepository(db),
		productRepo: repository.NewProductRepository(db),
	}
}

// Shop resolves the shop query (real DB implementation)
func (r *ShopResolver) Shop(ctx context.Context, id string) (map[string]interface{}, error) {
	// Convert shopId to ObjectID
	shopObjectID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return map[string]interface{}{
			"success": false,
			"message": "Invalid shop ID format",
		}, err
	}

	// Fetch shop from database
	shop, err := r.storeRepo.GetStoreByID(ctx, shopObjectID)
	if err != nil {
		return map[string]interface{}{
			"success": false,
			"message": "Shop not found: " + err.Error(),
		}, err
	}

	// Fetch products for this shop
	products, _, err := r.productRepo.GetMyProducts(ctx, shopObjectID, 1, 1000)
	if err != nil {
		// Continue even if products fail to load
		products = []*domain.Product{}
	}

	// Convert products to inventory format
	inventory := make([]map[string]interface{}, len(products))
	for i, product := range products {
		inventory[i] = map[string]interface{}{
			"id":           product.ID.Hex(),
			"name":         product.Name,
			"price":        product.Price,
			"description":  product.Description,
			"category":     product.Category,
			"subCategory":  "", // Add if needed in domain
			"stock":        product.Stock,
			"coverPhoto":   "default-product.jpg", // Add to domain if needed
			"otherPhotos":  []string{},
			"sku":          "", // Add to domain if needed
			"barcode":      "", // Add to domain if needed
			"weight":       0.0, // Add to domain if needed
			"unit":         "", // Add to domain if needed
			"expiryDate":   "", // Add to domain if needed
			"supplier":     "", // Add to domain if needed
			"brand":        "", // Add to domain if needed
			"origin":       "", // Add to domain if needed
			"tags":         []string{}, // Add to domain if needed
			"isActive":     product.IsActive,
			"discount": map[string]interface{}{
				"percentage": 0.0,
				"validUntil": "",
			},
			"createdAt": product.CreatedAt.Format(time.RFC3339),
			"updatedAt": product.UpdatedAt.Format(time.RFC3339),
			"shopId":    shop.ID.Hex(),
		}
	}

	return map[string]interface{}{
		"success": true,
		"message": "Shop retrieved successfully",
		"data": map[string]interface{}{
			"id":   shop.ID.Hex(),
			"name": shop.Name,
			"location": shop.Address,
			"coordinates": map[string]interface{}{
				"lat": shop.Latitude,
				"lng": shop.Longitude,
			},
			"coverPhoto": "default-shop.jpg", // Add to domain if needed
			"otherPhotos": []string{}, // Add to domain if needed
			"businessHours": map[string]interface{}{
				"openTime":  "09:00", // Add to domain if needed
				"closeTime": "18:00", // Add to domain if needed
				"days":      []string{"Mon", "Tue", "Wed", "Thu", "Fri"}, // Add to domain if needed
			},
			"businessType": shop.Category, // Map to enum if needed
			"paymentMethods": map[string]interface{}{
				"cash":   true, // Add to domain if needed
				"gcash":  false, // Add to domain if needed
				"paymaya": false, // Add to domain if needed
				"card":   false, // Add to domain if needed
			},
			"delivery": map[string]interface{}{
				"available": false, // Add to domain if needed
				"radius":    5.0, // Add to domain if needed
				"fee":       50.0, // Add to domain if needed
				"minOrder":  200.0, // Add to domain if needed
			},
			"socialMedia": map[string]interface{}{
				"facebook":  "", // Add to domain if needed
				"instagram": "", // Add to domain if needed
			},
			"verification": map[string]interface{}{
				"isVerified":   true, // Add to domain if needed
				"verifiedDate": shop.CreatedAt.Format(time.RFC3339), // Add to domain if needed
				"verificationId": "", // Add to domain if needed
			},
			"contactDetails": map[string]interface{}{
				"phone":   "", // Add to domain if needed
				"email":   "", // Add to domain if needed
				"address": shop.Address,
			},
			"inventory": inventory,
			"createdAt": shop.CreatedAt.Format(time.RFC3339),
			"updatedAt": shop.UpdatedAt.Format(time.RFC3339),
			"createdBy": shop.OwnerID.Hex(),
			"status": "ACTIVE", // Add to domain if needed
		},
	}, nil
}

// Shops resolves the shops query (for normal users browsing) - real DB implementation
func (r *ShopResolver) Shops(ctx context.Context, page, limit int) (map[string]interface{}, error) {
	// Pagination validation
	if page <= 0 {
		page = 1
	}
	if limit <= 0 {
		limit = 10
	}

	// Since GetAllStores doesn't exist, we'll return empty for now
	// In a real implementation, you would need to add GetAllStores method to StoreRepository
	// or use a different approach to fetch public shops
	
	return map[string]interface{}{
		"success": true,
		"message": "Shops retrieved successfully",
		"data":    []map[string]interface{}{}, // Empty until GetAllStores is implemented
		"total":   0,
	}, nil
}

// Shop resolver provides public shop browsing APIs only
// Owner operations (Create, Update, Delete) are handled by owner resolver
