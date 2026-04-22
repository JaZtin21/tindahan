package post

import (
	"context"
	"time"

	"tindahan-backend/domain"
	"tindahan-backend/repository"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
)

type PostResolver struct {
	db       *mongo.Database
	postRepo repository.PostRepository
	userRepo repository.UserRepository
}

func NewPostResolver(db *mongo.Database) *PostResolver {
	return &PostResolver{
		db:       db,
		postRepo: repository.NewPostRepository(db),
		userRepo: repository.NewUserRepository(db),
	}
}

// GetDB returns the MongoDB database instance
func (r *PostResolver) GetDB() *mongo.Database {
	return r.db
}

// CreatePost creates a new post
func (r *PostResolver) CreatePost(ctx context.Context, authorID string, title string, text string, photos []string, types []string, location *domain.PostLocation) (map[string]interface{}, error) {
	// Convert authorID to ObjectID
	authorObjectID, err := primitive.ObjectIDFromHex(authorID)
	if err != nil {
		return map[string]interface{}{
			"success": false,
			"message": "Invalid author ID format",
		}, err
	}

	// Create post domain object
	post := &domain.Post{
		ID:       primitive.NewObjectID(),
		Title:    title,
		Text:     text,
		Photos:   photos,
		Types:    types,
		AuthorID: authorObjectID,
		Location: location,
	}

	// Save to database
	err = r.postRepo.CreatePost(ctx, post)
	if err != nil {
		return map[string]interface{}{
			"success": false,
			"message": "Failed to create post: " + err.Error(),
		}, err
	}

	// Get author info
	author, _ := r.userRepo.GetUserByID(ctx, authorObjectID)
	authorData := map[string]interface{}{}
	if author != nil {
		authorData = map[string]interface{}{
			"id":        author.ID.Hex(),
			"name":      author.FirstName + " " + author.LastName,
			"email":     author.Email,
			"role":      author.Role,
			"isActive":  author.IsActive,
			"createdAt": author.CreatedAt.Format(time.RFC3339),
		}
	}

	// Build location data
	var locationData map[string]interface{}
	if post.Location != nil {
		locationData = map[string]interface{}{
			"lat":  post.Location.Lat,
			"lng":  post.Location.Lng,
			"name": post.Location.Name,
		}
	}

	return map[string]interface{}{
		"success": true,
		"message": "Post created successfully",
		"data": map[string]interface{}{
			"id":           post.ID.Hex(),
			"title":        post.Title,
			"text":         post.Text,
			"photos":       post.Photos,
			"types":        post.Types,
			"author":       authorData,
			"location":     locationData,
			"likes":        post.Likes,
			"isLiked":      false,
			"comments":     []map[string]interface{}{},
			"commentCount": 0,
			"createdAt":    post.CreatedAt.Format(time.RFC3339),
			"updatedAt":    post.UpdatedAt.Format(time.RFC3339),
		},
	}, nil
}

// GetPost retrieves a single post by ID
func (r *PostResolver) GetPost(ctx context.Context, postID string, currentUserID string) (map[string]interface{}, error) {
	postObjectID, err := primitive.ObjectIDFromHex(postID)
	if err != nil {
		return map[string]interface{}{
			"success": false,
			"message": "Invalid post ID format",
		}, err
	}

	post, err := r.postRepo.GetPostByID(ctx, postObjectID)
	if err != nil {
		return map[string]interface{}{
			"success": false,
			"message": "Post not found",
		}, err
	}

	return r.formatPostResponse(ctx, post, currentUserID), nil
}

// GetPosts retrieves all posts with pagination
func (r *PostResolver) GetPosts(ctx context.Context, page, limit int, currentUserID string) (map[string]interface{}, error) {
	posts, total, err := r.postRepo.GetPosts(ctx, page, limit)
	if err != nil {
		return map[string]interface{}{
			"success": false,
			"message": "Failed to fetch posts: " + err.Error(),
		}, err
	}

	data := make([]map[string]interface{}, len(posts))
	for i, post := range posts {
		data[i] = r.formatPostData(ctx, post, currentUserID)
	}

	return map[string]interface{}{
		"success": true,
		"message": "Posts retrieved successfully",
		"data":    data,
		"total":   total,
		"page":    page,
		"limit":   limit,
	}, nil
}

// GetPostsByUserID retrieves posts by a specific user ID (alias for GetMyPosts)
func (r *PostResolver) GetPostsByUserID(ctx context.Context, userID string, page, limit int) (map[string]interface{}, error) {
	return r.GetMyPosts(ctx, userID, page, limit)
}

// GetMyPosts retrieves posts by a specific author
func (r *PostResolver) GetMyPosts(ctx context.Context, authorID string, page, limit int) (map[string]interface{}, error) {
	authorObjectID, err := primitive.ObjectIDFromHex(authorID)
	if err != nil {
		return map[string]interface{}{
			"success": false,
			"message": "Invalid author ID format",
		}, err
	}

	posts, total, err := r.postRepo.GetMyPosts(ctx, authorObjectID, page, limit)
	if err != nil {
		return map[string]interface{}{
			"success": false,
			"message": "Failed to fetch posts: " + err.Error(),
		}, err
	}

	data := make([]map[string]interface{}, len(posts))
	for i, post := range posts {
		data[i] = r.formatPostData(ctx, post, authorID)
	}

	return map[string]interface{}{
		"success": true,
		"message": "Posts retrieved successfully",
		"data":    data,
		"total":   total,
		"page":    page,
		"limit":   limit,
	}, nil
}

// GetPostsNearLocation retrieves posts near a specific location
func (r *PostResolver) GetPostsNearLocation(ctx context.Context, lat, lng, radius float64, page, limit int, currentUserID string) (map[string]interface{}, error) {
	posts, total, err := r.postRepo.GetPostsNearLocation(ctx, lat, lng, radius, page, limit)
	if err != nil {
		return map[string]interface{}{
			"success": false,
			"message": "Failed to fetch posts: " + err.Error(),
		}, err
	}

	data := make([]map[string]interface{}, len(posts))
	for i, post := range posts {
		data[i] = r.formatPostData(ctx, post, currentUserID)
	}

	return map[string]interface{}{
		"success": true,
		"message": "Posts retrieved successfully",
		"data":    data,
		"total":   total,
		"page":    page,
		"limit":   limit,
	}, nil
}

// UpdatePost updates an existing post
func (r *PostResolver) UpdatePost(ctx context.Context, postID, authorID string, title *string, text *string, photos []string, types []string, location *domain.PostLocation) (map[string]interface{}, error) {
	postObjectID, err := primitive.ObjectIDFromHex(postID)
	if err != nil {
		return map[string]interface{}{
			"success": false,
			"message": "Invalid post ID format",
		}, err
	}

	// Get existing post to verify ownership
	existingPost, err := r.postRepo.GetPostByID(ctx, postObjectID)
	if err != nil {
		return map[string]interface{}{
			"success": false,
			"message": "Post not found",
		}, err
	}

	// Verify ownership
	if existingPost.AuthorID.Hex() != authorID {
		return map[string]interface{}{
			"success": false,
			"message": "Unauthorized: you can only update your own posts",
		}, nil
	}

	// Build update document
	updates := bson.M{}
	if title != nil {
		updates["title"] = *title
	}
	if text != nil {
		updates["text"] = *text
	}
	if photos != nil {
		updates["photos"] = photos
	}
	if types != nil {
		updates["types"] = types
	}
	if location != nil {
		updates["location"] = location
	}

	err = r.postRepo.UpdatePost(ctx, postObjectID, updates)
	if err != nil {
		return map[string]interface{}{
			"success": false,
			"message": "Failed to update post: " + err.Error(),
		}, err
	}

	// Fetch updated post
	updatedPost, _ := r.postRepo.GetPostByID(ctx, postObjectID)
	return r.formatPostResponse(ctx, updatedPost, authorID), nil
}

// DeletePost deletes a post
func (r *PostResolver) DeletePost(ctx context.Context, postID, authorID string) (map[string]interface{}, error) {
	postObjectID, err := primitive.ObjectIDFromHex(postID)
	if err != nil {
		return map[string]interface{}{
			"success": false,
			"message": "Invalid post ID format",
		}, err
	}

	// Get existing post to verify ownership
	existingPost, err := r.postRepo.GetPostByID(ctx, postObjectID)
	if err != nil {
		return map[string]interface{}{
			"success": false,
			"message": "Post not found",
		}, err
	}

	// Verify ownership
	if existingPost.AuthorID.Hex() != authorID {
		return map[string]interface{}{
			"success": false,
			"message": "Unauthorized: you can only delete your own posts",
		}, nil
	}

	err = r.postRepo.DeletePost(ctx, postObjectID)
	if err != nil {
		return map[string]interface{}{
			"success": false,
			"message": "Failed to delete post: " + err.Error(),
		}, err
	}

	return map[string]interface{}{
		"success": true,
		"message": "Post deleted successfully",
	}, nil
}

// LikePost adds a like to a post
func (r *PostResolver) LikePost(ctx context.Context, postID, userID string) (map[string]interface{}, error) {
	postObjectID, err := primitive.ObjectIDFromHex(postID)
	if err != nil {
		return map[string]interface{}{
			"success": false,
			"message": "Invalid post ID format",
		}, err
	}

	userObjectID, err := primitive.ObjectIDFromHex(userID)
	if err != nil {
		return map[string]interface{}{
			"success": false,
			"message": "Invalid user ID format",
		}, err
	}

	err = r.postRepo.LikePost(ctx, postObjectID, userObjectID)
	if err != nil {
		return map[string]interface{}{
			"success": false,
			"message": "Failed to like post: " + err.Error(),
		}, err
	}

	post, _ := r.postRepo.GetPostByID(ctx, postObjectID)
	return r.formatPostResponse(ctx, post, userID), nil
}

// UnlikePost removes a like from a post
func (r *PostResolver) UnlikePost(ctx context.Context, postID, userID string) (map[string]interface{}, error) {
	postObjectID, err := primitive.ObjectIDFromHex(postID)
	if err != nil {
		return map[string]interface{}{
			"success": false,
			"message": "Invalid post ID format",
		}, err
	}

	userObjectID, err := primitive.ObjectIDFromHex(userID)
	if err != nil {
		return map[string]interface{}{
			"success": false,
			"message": "Invalid user ID format",
		}, err
	}

	err = r.postRepo.UnlikePost(ctx, postObjectID, userObjectID)
	if err != nil {
		return map[string]interface{}{
			"success": false,
			"message": "Failed to unlike post: " + err.Error(),
		}, err
	}

	post, _ := r.postRepo.GetPostByID(ctx, postObjectID)
	return r.formatPostResponse(ctx, post, userID), nil
}

// Helper methods

func (r *PostResolver) formatPostResponse(ctx context.Context, post *domain.Post, currentUserID string) map[string]interface{} {
	return map[string]interface{}{
		"success": true,
		"message": "Post retrieved successfully",
		"data":    r.formatPostData(ctx, post, currentUserID),
	}
}

func (r *PostResolver) formatPostData(ctx context.Context, post *domain.Post, currentUserID string) map[string]interface{} {
	// Get author info
	author, _ := r.userRepo.GetUserByID(ctx, post.AuthorID)
	authorData := map[string]interface{}{
		"id":       "",
		"name":     "Unknown",
		"email":    "",
		"role":     "CUSTOMER",
		"isActive": false,
	}
	if author != nil {
		authorData = map[string]interface{}{
			"id":        author.ID.Hex(),
			"name":      author.FirstName + " " + author.LastName,
			"email":     author.Email,
			"role":      author.Role,
			"isActive":  author.IsActive,
			"createdAt": author.CreatedAt.Format(time.RFC3339),
			"updatedAt": author.UpdatedAt.Format(time.RFC3339),
		}
	}

	// Check if current user liked this post
	isLiked := false
	if currentUserID != "" {
		currentUserObjectID, _ := primitive.ObjectIDFromHex(currentUserID)
		isLiked, _ = r.postRepo.IsPostLikedByUser(ctx, post.ID, currentUserObjectID)
	}

	// Format comments
	comments := make([]map[string]interface{}, len(post.Comments))
	for i, comment := range post.Comments {
		commentAuthor, _ := r.userRepo.GetUserByID(ctx, comment.AuthorID)
		commentAuthorData := map[string]interface{}{}
		if commentAuthor != nil {
			commentAuthorData = map[string]interface{}{
				"id":        commentAuthor.ID.Hex(),
				"name":      commentAuthor.FirstName + " " + commentAuthor.LastName,
				"email":     commentAuthor.Email,
				"role":      commentAuthor.Role,
				"isActive":  commentAuthor.IsActive,
				"createdAt": commentAuthor.CreatedAt.Format(time.RFC3339),
				"updatedAt": commentAuthor.UpdatedAt.Format(time.RFC3339),
			}
		}
		comments[i] = map[string]interface{}{
			"id":        comment.ID.Hex(),
			"text":      comment.Text,
			"author":    commentAuthorData,
			"createdAt": comment.CreatedAt.Format(time.RFC3339),
			"updatedAt": comment.UpdatedAt.Format(time.RFC3339),
		}
	}

	// Build location data
	var locationData map[string]interface{}
	if post.Location != nil {
		locationData = map[string]interface{}{
			"lat":  post.Location.Lat,
			"lng":  post.Location.Lng,
			"name": post.Location.Name,
		}
	}

	return map[string]interface{}{
		"id":           post.ID.Hex(),
		"title":        post.Title,
		"text":         post.Text,
		"photos":       post.Photos,
		"types":        post.Types,
		"author":       authorData,
		"location":     locationData,
		"likes":        post.Likes,
		"isLiked":      isLiked,
		"comments":     comments,
		"commentCount": len(post.Comments),
		"createdAt":    post.CreatedAt.Format(time.RFC3339),
		"updatedAt":    post.UpdatedAt.Format(time.RFC3339),
	}
}
