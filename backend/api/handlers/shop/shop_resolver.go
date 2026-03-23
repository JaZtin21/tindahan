package shop

import (
	"context"
)

type ShopResolver struct{}

func NewShopResolver() *ShopResolver {
	return &ShopResolver{}
}

// Shop resolves the shop query
func (r *ShopResolver) Shop(ctx context.Context, id string) (map[string]interface{}, error) {
	return map[string]interface{}{
		"success": true,
		"message": "Shop retrieved successfully",
		"data": map[string]interface{}{
			"id":   id,
			"name": "Test Shop",
			"location": "Test Location",
			"coordinates": map[string]interface{}{
				"lat": 0.0,
				"lng": 0.0,
			},
			"coverPhoto": "test-cover.jpg",
			"otherPhotos": []string{"test1.jpg", "test2.jpg"},
			"businessHours": map[string]interface{}{
				"openTime":  "09:00",
				"closeTime": "18:00",
				"days":      []string{"Mon", "Tue", "Wed", "Thu", "Fri"},
			},
			"businessType": "SARI_SARI_STORE",
			"paymentMethods": map[string]interface{}{
				"cash":   true,
				"gcash":  false,
				"paymaya": false,
				"card":   false,
			},
			"delivery": map[string]interface{}{
				"available": false,
				"radius":    5.0,
				"fee":       50.0,
				"minOrder":  200.0,
			},
			"socialMedia": map[string]interface{}{
				"facebook":  "https://facebook.com/testshop",
				"instagram": "https://instagram.com/testshop",
			},
			"verification": map[string]interface{}{
				"isVerified":   true,
				"verifiedDate": "2023-01-01T00:00:00Z",
				"verificationId": "VER123",
			},
			"contactDetails": map[string]interface{}{
				"phone":   "1234567890",
				"email":   "shop@example.com",
				"address": "Test Address",
			},
			"inventory": []map[string]interface{}{
				{
					"id":           "item1",
					"name":         "Test Item 1",
					"price":        100.0,
					"description":  "Test Description 1",
					"category":     "Test Category",
					"subCategory":  "Test SubCategory",
					"stock":        10,
					"coverPhoto":   "item1.jpg",
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
					"shopId":       id,
				},
			},
			"createdAt": "2023-01-01T00:00:00Z",
			"updatedAt": "2023-01-01T00:00:00Z",
			"createdBy": "owner123",
			"status": "ACTIVE",
		},
	}, nil
}

// Shops resolves the shops query (for normal users browsing)
func (r *ShopResolver) Shops(ctx context.Context, page, limit int) (map[string]interface{}, error) {
	return map[string]interface{}{
		"success": true,
		"message": "Shops retrieved successfully",
		"data": []map[string]interface{}{
			{
				"id":     "public-shop-id",
				"name":   "Public Shop 1",
				"location": "Public Location 1",
				"coordinates": map[string]interface{}{
					"lat": 14.5995,
					"lng": 120.9842,
				},
				"coverPhoto": "public-cover-1.jpg",
				"businessType": "SARI_SARI_STORE",
				"status": "ACTIVE",
				"contactDetails": map[string]interface{}{
					"phone":   "1234567890",
					"email":   "public1@example.com",
					"address": "Public Address 1",
				},
				"verification": map[string]interface{}{
					"isVerified": true,
					"verifiedDate": "2023-01-01T00:00:00Z",
					"verificationId": "VER123",
				},
			},
			{
				"id":     "public-shop-id-2",
				"name":   "Public Shop 2",
				"location": "Public Location 2",
				"coordinates": map[string]interface{}{
					"lat": 14.6091,
					"lng": 120.9822,
				},
				"coverPhoto": "public-cover-2.jpg",
				"businessType": "GROCERY",
				"status": "ACTIVE",
				"contactDetails": map[string]interface{}{
					"phone":   "0987654321",
					"email":   "public2@example.com",
					"address": "Public Address 2",
				},
				"verification": map[string]interface{}{
					"isVerified": false,
					"verifiedDate": nil,
					"verificationId": "",
				},
			},
		},
	}, nil
}

// Shop resolver provides public shop browsing APIs only
// Owner operations (Create, Update, Delete) are handled by owner resolver
