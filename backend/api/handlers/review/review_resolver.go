package review

import (
	"context"
	"log"
	"time"

	"tindahan-backend/bootstrap"
	"tindahan-backend/domain"
	"tindahan-backend/internal/imageutil"
	"tindahan-backend/repository"

	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
)

type ReviewResolver struct {
	reviewRepo repository.ReviewRepository
	userRepo   repository.UserRepository
	storeRepo  repository.StoreRepository
}

func NewReviewResolver(db *mongo.Database) *ReviewResolver {
	return &ReviewResolver{
		reviewRepo: repository.NewReviewRepository(db),
		userRepo:   repository.NewUserRepository(db),
		storeRepo:  repository.NewStoreRepository(db),
	}
}

func (r *ReviewResolver) GetReviewByID(ctx context.Context, reviewID primitive.ObjectID) (*domain.Review, error) {
	return r.reviewRepo.GetReviewByID(ctx, reviewID)
}

// ReviewsByStore resolves the reviewsByStore query
func (r *ReviewResolver) ReviewsByStore(ctx context.Context, storeID string, page, limit int) (map[string]interface{}, error) {
	storeObjectID, err := primitive.ObjectIDFromHex(storeID)
	if err != nil {
		return map[string]interface{}{
			"success": false,
			"message": "Invalid store ID format",
		}, err
	}

	reviews, total, err := r.reviewRepo.GetReviewsByStore(ctx, storeObjectID, page, limit)
	if err != nil {
		return map[string]interface{}{
			"success": false,
			"message": "Failed to fetch reviews: " + err.Error(),
		}, err
	}

	reviewData := make([]map[string]interface{}, len(reviews))
	for i, review := range reviews {
		reviewData[i] = r.reviewToMap(ctx, review)
	}

	hasMore := (page * limit) < int(total)

	return map[string]interface{}{
		"success": true,
		"message": "Reviews fetched successfully",
		"data":    reviewData,
		"total":   total,
		"hasMore": hasMore,
	}, nil
}

// ReviewsByUser resolves the reviewsByUser query
func (r *ReviewResolver) ReviewsByUser(ctx context.Context, userID string, page, limit int) (map[string]interface{}, error) {
	userObjectID, err := primitive.ObjectIDFromHex(userID)
	if err != nil {
		return map[string]interface{}{
			"success": false,
			"message": "Invalid user ID format",
		}, err
	}

	reviews, total, err := r.reviewRepo.GetReviewsByUser(ctx, userObjectID, page, limit)
	if err != nil {
		return map[string]interface{}{
			"success": false,
			"message": "Failed to fetch reviews: " + err.Error(),
		}, err
	}

	reviewData := make([]map[string]interface{}, len(reviews))
	for i, review := range reviews {
		reviewData[i] = r.reviewToMap(ctx, review)
	}

	hasMore := (page * limit) < int(total)

	return map[string]interface{}{
		"success": true,
		"message": "Reviews fetched successfully",
		"data":    reviewData,
		"total":   total,
		"hasMore": hasMore,
	}, nil
}

// MyReviewForStore resolves the myReviewForStore query
func (r *ReviewResolver) MyReviewForStore(ctx context.Context, userID, storeID string) (map[string]interface{}, error) {
	userObjectID, err := primitive.ObjectIDFromHex(userID)
	if err != nil {
		return map[string]interface{}{
			"success": false,
			"message": "Invalid user ID format",
		}, err
	}

	storeObjectID, err := primitive.ObjectIDFromHex(storeID)
	if err != nil {
		return map[string]interface{}{
			"success": false,
			"message": "Invalid store ID format",
		}, err
	}

	// Get reviews by user and filter for this store
	reviews, _, err := r.reviewRepo.GetReviewsByUser(ctx, userObjectID, 1, 100)
	if err != nil {
		return map[string]interface{}{
			"success": false,
			"message": "Failed to fetch review: " + err.Error(),
		}, err
	}

	for _, review := range reviews {
		if review.StoreID == storeObjectID {
			return map[string]interface{}{
				"success": true,
				"message": "Review found",
				"data":    r.reviewToMap(ctx, review),
			}, nil
		}
	}

	return map[string]interface{}{
		"success": true,
		"message": "No review found for this store",
		"data":    nil,
	}, nil
}

// ReviewStats resolves the reviewStats query
func (r *ReviewResolver) ReviewStats(ctx context.Context, storeID string) (map[string]interface{}, error) {
	storeObjectID, err := primitive.ObjectIDFromHex(storeID)
	if err != nil {
		return map[string]interface{}{
			"success": false,
			"message": "Invalid store ID format",
		}, err
	}

	stats, err := r.reviewRepo.GetReviewStats(ctx, storeObjectID)
	if err != nil {
		return map[string]interface{}{
			"success": false,
			"message": "Failed to fetch review stats: " + err.Error(),
		}, err
	}

	return map[string]interface{}{
		"success":       true,
		"message":       "Review stats fetched successfully",
		"averageRating": stats.AverageRating,
		"totalReviews":  stats.TotalReviews,
		"fiveStars":     stats.FiveStars,
		"fourStars":     stats.FourStars,
		"threeStars":    stats.ThreeStars,
		"twoStars":      stats.TwoStars,
		"oneStar":       stats.OneStar,
	}, nil
}

// CreateReview resolves the createReview mutation
func (r *ReviewResolver) CreateReview(ctx context.Context, userID string, input map[string]interface{}) (map[string]interface{}, error) {
	log.Printf("[CreateReview] Starting review creation for user %s", userID)
	log.Printf("[CreateReview] Input: %+v", input)

	userObjectID, err := primitive.ObjectIDFromHex(userID)
	if err != nil {
		return map[string]interface{}{
			"success": false,
			"message": "Invalid user ID",
		}, err
	}

	storeID := input["storeId"].(string)
	storeObjectID, err := primitive.ObjectIDFromHex(storeID)
	if err != nil {
		return map[string]interface{}{
			"success": false,
			"message": "Invalid store ID",
		}, err
	}

	// Check if user already reviewed this store
	alreadyReviewed, err := r.reviewRepo.HasUserReviewedStore(ctx, userObjectID, storeObjectID)
	if err != nil {
		return map[string]interface{}{
			"success": false,
			"message": "Error checking existing review",
		}, err
	}
	if alreadyReviewed {
		return map[string]interface{}{
			"success": false,
			"message": "You have already reviewed this store",
		}, nil
	}

	// Get photos array - handle both []string and []interface{}
	var photos []string
	if input["photos"] != nil {
		switch v := input["photos"].(type) {
		case []string:
			photos = v
		case []interface{}:
			photos = make([]string, len(v))
			for i, p := range v {
				if s, ok := p.(string); ok {
					photos[i] = s
				}
			}
		}
	}

	review := &domain.Review{
		StoreID: storeObjectID,
		UserID:  userObjectID,
		Rating:  input["rating"].(int),
		Text:    "",
		Photos:  photos,
	}

	if input["text"] != nil {
		switch v := input["text"].(type) {
		case string:
			review.Text = v
		case *string:
			if v != nil {
				review.Text = *v
			}
		}
	}

	if err := r.reviewRepo.CreateReview(ctx, review); err != nil {
		return map[string]interface{}{
			"success": false,
			"message": "Failed to create review: " + err.Error(),
		}, err
	}

	return map[string]interface{}{
		"success": true,
		"message": "Review created successfully",
		"data":    r.reviewToMap(ctx, review),
	}, nil
}

// UpdateReview resolves the updateReview mutation
func (r *ReviewResolver) UpdateReview(ctx context.Context, userID string, reviewID string, input map[string]interface{}) (map[string]interface{}, error) {
	userObjectID, err := primitive.ObjectIDFromHex(userID)
	if err != nil {
		return map[string]interface{}{
			"success": false,
			"message": "Invalid user ID",
		}, err
	}

	reviewObjectID, err := primitive.ObjectIDFromHex(reviewID)
	if err != nil {
		return map[string]interface{}{
			"success": false,
			"message": "Invalid review ID",
		}, err
	}

	// Get existing review to verify ownership
	existingReview, err := r.reviewRepo.GetReviewByID(ctx, reviewObjectID)
	if err != nil {
		return map[string]interface{}{
			"success": false,
			"message": "Review not found",
		}, err
	}

	if existingReview.UserID != userObjectID {
		return map[string]interface{}{
			"success": false,
			"message": "You can only update your own reviews",
		}, nil
	}

	updates := &domain.UpdateReviewRequest{}

	if input["rating"] != nil {
		rating := input["rating"].(int)
		updates.Rating = &rating
	}
	if input["text"] != nil {
		text := input["text"].(string)
		updates.Text = &text
	}
	var deletedPhotos []string
	if input["photos"] != nil {
		var photos []string
		switch v := input["photos"].(type) {
		case []string:
			photos = v
		case []interface{}:
			photos = make([]string, len(v))
			for i, p := range v {
				if s, ok := p.(string); ok {
					photos[i] = s
				}
			}
		}
		updates.Photos = photos
		deletedPhotos = diffPhotoURLs(existingReview.Photos, photos)
	}

	if err := r.reviewRepo.UpdateReview(ctx, reviewObjectID, updates); err != nil {
		return map[string]interface{}{
			"success": false,
			"message": "Failed to update review: " + err.Error(),
		}, err
	}

	if len(deletedPhotos) > 0 {
		env := bootstrap.LoadEnv()
		if env.CloudinaryCloudName != "" && env.CloudinaryAPIKey != "" && env.CloudinaryAPISecret != "" {
			uploader, err := imageutil.NewImageUploader(
				env.CloudinaryCloudName,
				env.CloudinaryAPIKey,
				env.CloudinaryAPISecret,
				env.CloudinaryFolder,
			)
			if err == nil {
				for _, photoURL := range deletedPhotos {
					_ = uploader.DeleteImageByURL(ctx, photoURL)
				}
			}
		}
	}

	// Fetch updated review
	updatedReview, _ := r.reviewRepo.GetReviewByID(ctx, reviewObjectID)

	return map[string]interface{}{
		"success": true,
		"message": "Review updated successfully",
		"data":    r.reviewToMap(ctx, updatedReview),
	}, nil
}

func diffPhotoURLs(existing, keep []string) []string {
	keepSet := make(map[string]struct{}, len(keep))
	for _, url := range keep {
		keepSet[url] = struct{}{}
	}

	var removed []string
	for _, url := range existing {
		if _, ok := keepSet[url]; !ok {
			removed = append(removed, url)
		}
	}
	return removed
}

// DeleteReview resolves the deleteReview mutation
func (r *ReviewResolver) DeleteReview(ctx context.Context, userID string, reviewID string) (map[string]interface{}, error) {
	userObjectID, err := primitive.ObjectIDFromHex(userID)
	if err != nil {
		return map[string]interface{}{
			"success": false,
			"message": "Invalid user ID",
		}, err
	}

	reviewObjectID, err := primitive.ObjectIDFromHex(reviewID)
	if err != nil {
		return map[string]interface{}{
			"success": false,
			"message": "Invalid review ID",
		}, err
	}

	// Get existing review to verify ownership
	existingReview, err := r.reviewRepo.GetReviewByID(ctx, reviewObjectID)
	if err != nil {
		return map[string]interface{}{
			"success": false,
			"message": "Review not found",
		}, err
	}

	if existingReview.UserID != userObjectID {
		return map[string]interface{}{
			"success": false,
			"message": "You can only delete your own reviews",
		}, nil
	}

	if err := r.reviewRepo.DeleteReview(ctx, reviewObjectID); err != nil {
		return map[string]interface{}{
			"success": false,
			"message": "Failed to delete review: " + err.Error(),
		}, err
	}

	return map[string]interface{}{
		"success": true,
		"message": "Review deleted successfully",
	}, nil
}

// Helper to convert review to map
func (r *ReviewResolver) reviewToMap(ctx context.Context, review *domain.Review) map[string]interface{} {
	// Fetch user data
	user, _ := r.userRepo.GetUserByID(ctx, review.UserID)
	userData := map[string]interface{}{
		"id":    review.UserID.Hex(),
		"name":  "Unknown",
		"email": "",
	}
	if user != nil {
		userData["id"] = user.ID.Hex()
		userData["name"] = user.FirstName + " " + user.LastName
		if userData["name"] == " " {
			userData["name"] = user.Email
		}
		userData["email"] = user.Email
		userData["profilePhoto"] = user.ProfilePhoto
	}

	// For new reviews, UpdatedAt might be zero - use CreatedAt in that case
	updatedAt := review.UpdatedAt
	if updatedAt.IsZero() {
		updatedAt = review.CreatedAt
	}

	return map[string]interface{}{
		"id":        review.ID.Hex(),
		"storeId":   review.StoreID.Hex(),
		"userId":    review.UserID.Hex(),
		"user":      userData,
		"rating":    review.Rating,
		"text":      review.Text,
		"photos":    review.Photos,
		"createdAt": review.CreatedAt.Format(time.RFC3339),
		"updatedAt": updatedAt.Format(time.RFC3339),
	}
}
