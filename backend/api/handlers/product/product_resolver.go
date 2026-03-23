package product

import (
	"context"
)

type ProductResolver struct{}

func NewProductResolver() *ProductResolver {
	return &ProductResolver{}
}

// Item resolves the item query
func (r *ProductResolver) Item(ctx context.Context, id string) (map[string]interface{}, error) {
	return map[string]interface{}{
		"success": true,
		"message": "Item retrieved successfully",
		"data": map[string]interface{}{
			"id":           id,
			"name":         "Test Item",
			"price":        100.0,
			"description":  "Test Description",
			"category":     "Test Category",
			"subCategory":  "Test SubCategory",
			"stock":        10,
			"coverPhoto":   "test-item.jpg",
			"otherPhotos":  []string{"item1a.jpg", "item1b.jpg"},
			"sku":          "SKU001",
			"barcode":      "BAR001",
			"weight":       1.5,
			"unit":         "kg",
			"expiryDate":  "2024-12-31",
			"supplier":     "Test Supplier",
			"brand":        "Test Brand",
			"origin":       "Test Origin",
			"tags":         []string{"test", "sample"},
			"isActive":    true,
			"discount": map[string]interface{}{
				"percentage": 10.0,
				"validUntil": "2024-12-31",
			},
			"createdAt":    "2023-01-01T00:00:00Z",
			"updatedAt":    "2023-01-01T00:00:00Z",
			"shopId":       "shop123",
		},
	}, nil
}

// Items resolves the items query (for normal users browsing)
func (r *ProductResolver) Items(ctx context.Context, page, limit int) (map[string]interface{}, error) {
	return map[string]interface{}{
		"success": true,
		"message": "Items retrieved successfully",
		"data": []map[string]interface{}{
			{
				"id":           "public-item-id-1",
				"name":         "Public Item 1",
				"price":        100.0,
				"description":  "Public Item Description 1",
				"category":     "Public Category 1",
				"subCategory":  "Public SubCategory 1",
				"stock":        50,
				"coverPhoto":   "public-item-1.jpg",
				"otherPhotos":  []string{"public1a.jpg", "public1b.jpg"},
				"sku":          "PUB001",
				"barcode":      "PUBBAR001",
				"weight":       1.0,
				"unit":         "kg",
				"expiryDate":  "2024-12-31",
				"supplier":     "Public Supplier 1",
				"brand":        "Public Brand 1",
				"origin":       "Public Origin 1",
				"tags":         []string{"public", "sample"},
				"isActive":    true,
				"discount": map[string]interface{}{
					"percentage": 10.0,
					"validUntil": "2024-12-31",
				},
				"createdAt":    "2023-01-01T00:00:00Z",
				"updatedAt":    "2023-01-01T00:00:00Z",
				"shopId":       "public-shop-id-1",
			},
			{
				"id":           "public-item-id-2",
				"name":         "Public Item 2",
				"price":        75.0,
				"description":  "Public Item Description 2",
				"category":     "Public Category 2",
				"subCategory":  "Public SubCategory 2",
				"stock":        25,
				"coverPhoto":   "public-item-2.jpg",
				"otherPhotos":  []string{"public2a.jpg", "public2b.jpg"},
				"sku":          "PUB002",
				"barcode":      "PUBBAR002",
				"weight":       0.5,
				"unit":         "kg",
				"expiryDate":  "2024-11-30",
				"supplier":     "Public Supplier 2",
				"brand":        "Public Brand 2",
				"origin":       "Public Origin 2",
				"tags":         []string{"public", "sample2"},
				"isActive":    true,
				"discount": map[string]interface{}{
					"percentage": 15.0,
					"validUntil": "2024-11-30",
				},
				"createdAt":    "2023-02-01T00:00:00Z",
				"updatedAt":    "2023-02-01T00:00:00Z",
				"shopId":       "public-shop-id-2",
			},
		},
	}, nil
}

// Product resolver provides public product browsing APIs only
// Owner operations (Create, Update, Delete) are handled by owner resolver
