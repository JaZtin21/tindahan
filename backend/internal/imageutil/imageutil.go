package imageutil

import (
	"context"
	"fmt"
	"io"
	"path/filepath"
	"strings"
	"time"

	"github.com/cloudinary/cloudinary-go/v2"
	"github.com/cloudinary/cloudinary-go/v2/api/uploader"
)

// ImageUploader handles image uploads to Cloudinary
type ImageUploader struct {
	cloudinary *cloudinary.Cloudinary
	folder     string
}

// UploadResult contains the result of an image upload
type UploadResult struct {
	URL      string
	PublicID string
	Format   string
	Width    int
	Height   int
	Size     int
}

// NewImageUploader creates a new ImageUploader instance
func NewImageUploader(cloudName, apiKey, apiSecret, folder string) (*ImageUploader, error) {
	cld, err := cloudinary.NewFromParams(cloudName, apiKey, apiSecret)
	if err != nil {
		return nil, fmt.Errorf("failed to initialize cloudinary: %w", err)
	}

	return &ImageUploader{
		cloudinary: cld,
		folder:     folder,
	}, nil
}

// UploadImage uploads a single image to Cloudinary
func (u *ImageUploader) UploadImage(ctx context.Context, reader io.Reader, filename string) (*UploadResult, error) {
	if err := u.validateFile(filename); err != nil {
		return nil, err
	}

	// Generate unique public ID
	publicID := u.generatePublicID(filename)

	uploadParams := uploader.UploadParams{
		PublicID:       publicID,
		Folder:         u.folder,
		ResourceType:   "image",
		Transformation: "f_auto,q_auto", // Auto format and quality optimization
	}

	result, err := u.cloudinary.Upload.Upload(ctx, reader, uploadParams)
	if err != nil {
		return nil, fmt.Errorf("failed to upload image: %w", err)
	}

	return &UploadResult{
		URL:      result.SecureURL,
		PublicID: result.PublicID,
		Format:   result.Format,
		Width:    result.Width,
		Height:   result.Height,
		Size:     result.Bytes,
	}, nil
}

// UploadBase64 uploads a base64-encoded image
func (u *ImageUploader) UploadBase64(ctx context.Context, base64Data, filename string) (*UploadResult, error) {
	if err := u.validateFile(filename); err != nil {
		return nil, err
	}

	publicID := u.generatePublicID(filename)

	uploadParams := uploader.UploadParams{
		PublicID:       publicID,
		Folder:         u.folder,
		ResourceType:   "image",
		Transformation: "f_auto,q_auto",
	}

	result, err := u.cloudinary.Upload.Upload(ctx, base64Data, uploadParams)
	if err != nil {
		return nil, fmt.Errorf("failed to upload base64 image: %w", err)
	}

	return &UploadResult{
		URL:      result.SecureURL,
		PublicID: result.PublicID,
		Format:   result.Format,
		Width:    result.Width,
		Height:   result.Height,
		Size:     result.Bytes,
	}, nil
}

// DeleteImage deletes an image from Cloudinary by its public ID
func (u *ImageUploader) DeleteImage(ctx context.Context, publicID string) error {
	_, err := u.cloudinary.Upload.Destroy(ctx, uploader.DestroyParams{
		PublicID: publicID,
	})
	if err != nil {
		return fmt.Errorf("failed to delete image: %w", err)
	}
	return nil
}

// GetOptimizedURL returns an optimized URL for an existing image
func (u *ImageUploader) GetOptimizedURL(publicID string, width, height int) (string, error) {
	img, err := u.cloudinary.Image(publicID)
	if err != nil {
		return "", fmt.Errorf("failed to get image asset: %w", err)
	}

	if width > 0 && height > 0 {
		img.Transformation = fmt.Sprintf("w_%d,h_%d,c_fill", width, height)
	}

	url, err := img.String()
	if err != nil {
		return "", fmt.Errorf("failed to generate image URL: %w", err)
	}
	return url, nil
}

// validateFile checks if the file has an allowed extension
func (u *ImageUploader) validateFile(filename string) error {
	ext := strings.ToLower(filepath.Ext(filename))
	allowed := []string{".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg", ".bmp", ".ico"}

	for _, allowedExt := range allowed {
		if ext == allowedExt {
			return nil
		}
	}

	return fmt.Errorf("unsupported file type: %s (allowed: jpg, jpeg, png, gif, webp, svg, bmp, ico)", ext)
}

// generatePublicID creates a unique public ID for the image
func (u *ImageUploader) generatePublicID(filename string) string {
	ext := filepath.Ext(filename)
	name := strings.TrimSuffix(filename, ext)
	// Clean the name - remove special characters and spaces
	name = strings.ReplaceAll(name, " ", "_")
	name = strings.ReplaceAll(name, "-", "_")

	timestamp := time.Now().Unix()
	return fmt.Sprintf("%s_%d", name, timestamp)
}

// WithFolder creates a new uploader with a different folder
func (u *ImageUploader) WithFolder(folder string) *ImageUploader {
	return &ImageUploader{
		cloudinary: u.cloudinary,
		folder:     folder,
	}
}

// AllowedMimeTypes returns the list of allowed MIME types
func AllowedMimeTypes() []string {
	return []string{
		"image/jpeg",
		"image/png",
		"image/gif",
		"image/webp",
		"image/svg+xml",
		"image/bmp",
		"image/x-icon",
	}
}

// MaxFileSize returns the maximum allowed file size (10MB)
func MaxFileSize() int64 {
	return 10 * 1024 * 1024 // 10MB
}
