package product

import (
	"context"
	"tindahan-backend/domain"
	"tindahan-backend/repository"
)

type ProductResolver struct {
	productRepo repository.ProductRepository
}

func NewProductResolver(productRepo repository.ProductRepository) *ProductResolver {
	return &ProductResolver{
		productRepo: productRepo,
	}
}

// Item resolves the item query
func (r *ProductResolver) Item(ctx context.Context, id string) (map[string]interface{}, error) {
	return map[string]interface{}{
		"success": true,
		"message": "Item retrieved successfully",
		"data": map[string]interface{}{
			"id":          id,
			"name":        "Test Item",
			"price":       100.0,
			"description": "Test Description",
			"category":    "Test Category",
			"subCategory": "Test SubCategory",
			"stock":       10,
			"coverPhoto":  "test-item.jpg",
			"otherPhotos": []string{"item1a.jpg", "item1b.jpg"},
			"sku":         "SKU001",
			"barcode":     "BAR001",
			"weight":      1.5,
			"unit":        "kg",
			"expiryDate":  "2024-12-31",
			"supplier":    "Test Supplier",
			"brand":       "Test Brand",
			"origin":      "Test Origin",
			"tags":        []string{"test", "sample"},
			"isActive":    true,
			"discount": map[string]interface{}{
				"percentage": 10.0,
				"validUntil": "2024-12-31",
			},
			"createdAt": "2023-01-01T00:00:00Z",
			"updatedAt": "2023-01-01T00:00:00Z",
			"shopId":    "shop123",
		},
	}, nil
}

// Items resolves the items query (for normal users browsing)
func (r *ProductResolver) Items(ctx context.Context, page, limit int, query *string) (map[string]interface{}, error) {
	// Build search query
	searchQuery := ""
	if query != nil {
		searchQuery = *query
	}

	// Validate that query is not blank/empty
	if searchQuery == "" {
		return map[string]interface{}{
			"success": false,
			"message": "Search query cannot be empty",
			"data":    []map[string]interface{}{},
		}, nil
	}

	// Cap limit at 10 to prevent scraping/spamming
	if limit > 10 {
		limit = 10
	}
	if limit <= 0 {
		limit = 10
	}

	// Search all products (no filter to get public items)
	products, _, err := r.productRepo.SearchProducts(ctx, &domain.ProductSearchRequest{
		Query: searchQuery,
		Page:  page,
		Limit: limit,
	})
	if err != nil {
		return map[string]interface{}{
			"success": false,
			"message": err.Error(),
			"data":    []map[string]interface{}{},
		}, nil
	}

	// Convert products to map format
	items := make([]map[string]interface{}, len(products))
	for i, p := range products {
		items[i] = map[string]interface{}{
			"id":          p.ID.Hex(),
			"name":        p.Name,
			"price":       p.Price,
			"description": p.Description,
			"category":    p.Category,
			"subCategory": p.SubCategory,
			"stock":       p.Stock,
			"coverPhoto":  p.CoverPhoto,
			"otherPhotos": p.OtherPhotos,
			"sku":         p.SKU,
			"barcode":     p.Barcode,
			"weight":      p.Weight,
			"unit":        p.Unit,
			"expiryDate":  p.ExpiryDate,
			"supplier":    p.Supplier,
			"brand":       p.Brand,
			"origin":      p.Origin,
			"tags":        p.Tags,
			"isActive":    p.IsActive,
			"discount": map[string]interface{}{
				"percentage": p.Discount.Percentage,
				"validUntil": p.Discount.ValidUntil,
			},
			"createdAt": p.CreatedAt,
			"updatedAt": p.UpdatedAt,
			"shopId":    p.StoreID.Hex(),
		}
	}

	return map[string]interface{}{
		"success": true,
		"message": "Items retrieved successfully",
		"data":    items,
	}, nil
}

// Product resolver provides public product browsing APIs only
// Owner operations (Create, Update, Delete) are handled by owner resolver
