package inquiry

import (
	"context"
	"time"

	"tindahan-backend/domain"
	"tindahan-backend/repository"

	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
)

type InquiryResolver struct {
	db          *mongo.Database
	inquiryRepo repository.InquiryRepository
	userRepo    repository.UserRepository
	storeRepo   repository.StoreRepository
}

func NewInquiryResolver(db *mongo.Database) *InquiryResolver {
	return &InquiryResolver{
		db:          db,
		inquiryRepo: repository.NewInquiryRepository(db),
		userRepo:    repository.NewUserRepository(db),
		storeRepo:   repository.NewStoreRepository(db),
	}
}

// GetDB returns the MongoDB database instance
func (r *InquiryResolver) GetDB() *mongo.Database {
	return r.db
}

// CreateInquiry creates a new inquiry
func (r *InquiryResolver) CreateInquiry(ctx context.Context, userID, shopID, item, message string) (map[string]interface{}, error) {
	// Convert IDs to ObjectIDs
	userObjectID, err := primitive.ObjectIDFromHex(userID)
	if err != nil {
		return map[string]interface{}{
			"success": false,
			"message": "Invalid user ID format",
		}, err
	}

	shopObjectID, err := primitive.ObjectIDFromHex(shopID)
	if err != nil {
		return map[string]interface{}{
			"success": false,
			"message": "Invalid shop ID format",
		}, err
	}

	// Verify shop exists
	_, err = r.storeRepo.GetStoreByID(ctx, shopObjectID)
	if err != nil {
		return map[string]interface{}{
			"success": false,
			"message": "Shop not found",
		}, err
	}

	// Create inquiry
	inquiry := &domain.Inquiry{
		ID:        primitive.NewObjectID(),
		UserID:    userObjectID,
		ShopID:    shopObjectID,
		Item:      item,
		Message:   message,
		Status:    domain.InquiryStatusPending,
		Replies:   []domain.InquiryReply{},
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	if err := r.inquiryRepo.CreateInquiry(ctx, inquiry); err != nil {
		return map[string]interface{}{
			"success": false,
			"message": "Failed to create inquiry: " + err.Error(),
		}, err
	}

	return map[string]interface{}{
		"success": true,
		"message": "Inquiry created successfully",
		"data":    inquiry,
	}, nil
}

// ReplyToInquiry adds a reply to an inquiry
func (r *InquiryResolver) ReplyToInquiry(ctx context.Context, inquiryID, authorID, message string) (map[string]interface{}, error) {
	// Convert IDs to ObjectIDs
	inquiryObjectID, err := primitive.ObjectIDFromHex(inquiryID)
	if err != nil {
		return map[string]interface{}{
			"success": false,
			"message": "Invalid inquiry ID format",
		}, err
	}

	authorObjectID, err := primitive.ObjectIDFromHex(authorID)
	if err != nil {
		return map[string]interface{}{
			"success": false,
			"message": "Invalid author ID format",
		}, err
	}

	// Verify inquiry exists
	inquiry, err := r.inquiryRepo.GetInquiryByID(ctx, inquiryObjectID)
	if err != nil {
		return map[string]interface{}{
			"success": false,
			"message": "Inquiry not found",
		}, err
	}

	// Create reply
	reply := domain.InquiryReply{
		ID:        primitive.NewObjectID(),
		InquiryID: inquiryObjectID,
		AuthorID:  authorObjectID,
		Message:   message,
		CreatedAt: time.Now(),
	}

	if err := r.inquiryRepo.AddReply(ctx, inquiryObjectID, reply); err != nil {
		return map[string]interface{}{
			"success": false,
			"message": "Failed to add reply: " + err.Error(),
		}, err
	}

	// Update inquiry in response
	inquiry.Replies = append(inquiry.Replies, reply)
	inquiry.Status = domain.InquiryStatusResponded
	inquiry.UpdatedAt = time.Now()

	return map[string]interface{}{
		"success": true,
		"message": "Reply added successfully",
		"data":    reply,
	}, nil
}

// UpdateInquiryStatus updates the status of an inquiry
func (r *InquiryResolver) UpdateInquiryStatus(ctx context.Context, inquiryID string, status domain.InquiryStatus) (map[string]interface{}, error) {
	// Convert ID to ObjectID
	inquiryObjectID, err := primitive.ObjectIDFromHex(inquiryID)
	if err != nil {
		return map[string]interface{}{
			"success": false,
			"message": "Invalid inquiry ID format",
		}, err
	}

	// Verify inquiry exists
	inquiry, err := r.inquiryRepo.GetInquiryByID(ctx, inquiryObjectID)
	if err != nil {
		return map[string]interface{}{
			"success": false,
			"message": "Inquiry not found",
		}, err
	}

	if err := r.inquiryRepo.UpdateStatus(ctx, inquiryObjectID, status); err != nil {
		return map[string]interface{}{
			"success": false,
			"message": "Failed to update inquiry status: " + err.Error(),
		}, err
	}

	// Update inquiry in response
	inquiry.Status = status
	inquiry.UpdatedAt = time.Now()

	return map[string]interface{}{
		"success": true,
		"message": "Inquiry status updated successfully",
		"data":    inquiry,
	}, nil
}

// GetInquiry gets a single inquiry by ID
func (r *InquiryResolver) GetInquiry(ctx context.Context, inquiryID string) (map[string]interface{}, error) {
	// Convert ID to ObjectID
	inquiryObjectID, err := primitive.ObjectIDFromHex(inquiryID)
	if err != nil {
		return map[string]interface{}{
			"success": false,
			"message": "Invalid inquiry ID format",
		}, err
	}

	inquiry, err := r.inquiryRepo.GetInquiryByID(ctx, inquiryObjectID)
	if err != nil {
		return map[string]interface{}{
			"success": false,
			"message": "Inquiry not found",
		}, err
	}

	return map[string]interface{}{
		"success": true,
		"message": "Inquiry found",
		"data":    inquiry,
	}, nil
}

// GetInquiriesForShop gets all inquiries for a specific shop
func (r *InquiryResolver) GetInquiriesForShop(ctx context.Context, shopID string, page, limit int) (map[string]interface{}, error) {
	// Convert ID to ObjectID
	shopObjectID, err := primitive.ObjectIDFromHex(shopID)
	if err != nil {
		return map[string]interface{}{
			"success": false,
			"message": "Invalid shop ID format",
		}, err
	}

	inquiries, total, err := r.inquiryRepo.GetInquiriesForShop(ctx, shopObjectID, page, limit)
	if err != nil {
		return map[string]interface{}{
			"success": false,
			"message": "Failed to fetch inquiries: " + err.Error(),
		}, err
	}

	totalPages := int(total) / limit
	if int(total)%limit > 0 {
		totalPages++
	}

	return map[string]interface{}{
		"success":    true,
		"message":    "Inquiries fetched successfully",
		"data":       inquiries,
		"total":      total,
		"page":       page,
		"totalPages": totalPages,
	}, nil
}

// GetUserInquiryForShop gets a user's inquiry for a specific shop
func (r *InquiryResolver) GetUserInquiryForShop(ctx context.Context, userID, shopID string) (map[string]interface{}, error) {
	// Convert IDs to ObjectIDs
	userObjectID, err := primitive.ObjectIDFromHex(userID)
	if err != nil {
		return map[string]interface{}{
			"success": false,
			"message": "Invalid user ID format",
		}, err
	}

	shopObjectID, err := primitive.ObjectIDFromHex(shopID)
	if err != nil {
		return map[string]interface{}{
			"success": false,
			"message": "Invalid shop ID format",
		}, err
	}

	// Get inquiry for user and shop
	inquiry, err := r.inquiryRepo.GetUserInquiryForShop(ctx, userObjectID, shopObjectID)
	if err != nil {
		return map[string]interface{}{
			"success": false,
			"message": "Inquiry not found",
		}, err
	}

	return map[string]interface{}{
		"success": true,
		"message": "Inquiry found",
		"data":    inquiry,
	}, nil
}

// GetInquiriesByUser gets all inquiries created by a specific user
func (r *InquiryResolver) GetInquiriesByUser(ctx context.Context, userID string, page, limit int) (map[string]interface{}, error) {
	// Convert ID to ObjectID
	userObjectID, err := primitive.ObjectIDFromHex(userID)
	if err != nil {
		return map[string]interface{}{
			"success": false,
			"message": "Invalid user ID format",
		}, err
	}

	inquiries, total, err := r.inquiryRepo.GetInquiriesByUser(ctx, userObjectID, page, limit)
	if err != nil {
		return map[string]interface{}{
			"success": false,
			"message": "Failed to fetch inquiries: " + err.Error(),
		}, err
	}

	totalPages := int(total) / limit
	if int(total)%limit > 0 {
		totalPages++
	}

	return map[string]interface{}{
		"success":    true,
		"message":    "Inquiries fetched successfully",
		"data":       inquiries,
		"total":      total,
		"page":       page,
		"totalPages": totalPages,
	}, nil
}
