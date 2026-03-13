package usecase

import (
	"context"
	"errors"

	"tindahan-backend/domain"
	"tindahan-backend/repository"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type ProductUsecase interface {
	CreateProduct(ctx context.Context, req *domain.CreateProductRequest, storeID primitive.ObjectID) (*domain.ProductResponse, error)
	GetProductByID(ctx context.Context, productID primitive.ObjectID) (*domain.ProductResponse, error)
	UpdateProduct(ctx context.Context, productID primitive.ObjectID, storeID primitive.ObjectID, req *domain.UpdateProductRequest) (*domain.ProductResponse, error)
	DeleteProduct(ctx context.Context, productID primitive.ObjectID, storeID primitive.ObjectID) error
	SearchProducts(ctx context.Context, req *domain.ProductSearchRequest) ([]*domain.ProductResponse, int64, error)
	GetMyProducts(ctx context.Context, storeID primitive.ObjectID, page, limit int) ([]*domain.ProductResponse, int64, error)
}

type productUsecase struct {
	productRepo repository.ProductRepository
	storeRepo   repository.StoreRepository
}

func NewProductUsecase(productRepo repository.ProductRepository, storeRepo repository.StoreRepository) ProductUsecase {
	return &productUsecase{
		productRepo: productRepo,
		storeRepo:   storeRepo,
	}
}

func (p *productUsecase) CreateProduct(ctx context.Context, req *domain.CreateProductRequest, storeID primitive.ObjectID) (*domain.ProductResponse, error) {
	product := &domain.Product{
		Name:        req.Name,
		Description: req.Description,
		Category:    req.Category,
		Price:       req.Price,
		ImageURL:    req.ImageURL,
		StoreID:     storeID,
		Stock:       req.Stock,
		IsActive:    true,
	}

	err := p.productRepo.CreateProduct(ctx, product)
	if err != nil {
		return nil, errors.New("failed to create product")
	}

	// Get store name for response
	store, err := p.storeRepo.GetStoreByID(ctx, storeID)
	if err != nil {
		return nil, errors.New("store not found")
	}

	return &domain.ProductResponse{
		ID:          product.ID.Hex(),
		Name:        product.Name,
		Description: product.Description,
		Category:    product.Category,
		Price:       product.Price,
		ImageURL:    product.ImageURL,
		StoreID:     product.StoreID.Hex(),
		StoreName:   store.Name,
		Stock:       product.Stock,
		IsActive:    product.IsActive,
		CreatedAt:   product.CreatedAt,
		UpdatedAt:   product.UpdatedAt,
	}, nil
}

func (p *productUsecase) GetProductByID(ctx context.Context, productID primitive.ObjectID) (*domain.ProductResponse, error) {
	product, err := p.productRepo.GetProductByID(ctx, productID)
	if err != nil {
		return nil, errors.New("product not found")
	}

	// Get store name for response
	store, err := p.storeRepo.GetStoreByID(ctx, product.StoreID)
	if err != nil {
		return nil, errors.New("store not found")
	}

	return &domain.ProductResponse{
		ID:          product.ID.Hex(),
		Name:        product.Name,
		Description: product.Description,
		Category:    product.Category,
		Price:       product.Price,
		ImageURL:    product.ImageURL,
		StoreID:     product.StoreID.Hex(),
		StoreName:   store.Name,
		Stock:       product.Stock,
		IsActive:    product.IsActive,
		CreatedAt:   product.CreatedAt,
		UpdatedAt:   product.UpdatedAt,
	}, nil
}

func (p *productUsecase) UpdateProduct(ctx context.Context, productID primitive.ObjectID, storeID primitive.ObjectID, req *domain.UpdateProductRequest) (*domain.ProductResponse, error) {
	// Check if product exists and belongs to store
	existingProduct, err := p.productRepo.GetProductByID(ctx, productID)
	if err != nil {
		return nil, errors.New("product not found")
	}

	if existingProduct.StoreID != storeID {
		return nil, errors.New("unauthorized to update this product")
	}

	err = p.productRepo.UpdateProduct(ctx, productID, req)
	if err != nil {
		return nil, errors.New("failed to update product")
	}

	// Get updated product
	return p.GetProductByID(ctx, productID)
}

func (p *productUsecase) DeleteProduct(ctx context.Context, productID primitive.ObjectID, storeID primitive.ObjectID) error {
	// Check if product exists and belongs to store
	existingProduct, err := p.productRepo.GetProductByID(ctx, productID)
	if err != nil {
		return errors.New("product not found")
	}

	if existingProduct.StoreID != storeID {
		return errors.New("unauthorized to delete this product")
	}

	return p.productRepo.DeleteProduct(ctx, productID)
}

func (p *productUsecase) SearchProducts(ctx context.Context, req *domain.ProductSearchRequest) ([]*domain.ProductResponse, int64, error) {
	products, total, err := p.productRepo.SearchProducts(ctx, req)
	if err != nil {
		return nil, 0, err
	}

	var productResponses []*domain.ProductResponse
	for _, product := range products {
		// Get store name for each product
		store, err := p.storeRepo.GetStoreByID(ctx, product.StoreID)
		if err != nil {
			continue // Skip product if store not found
		}

		productResponses = append(productResponses, &domain.ProductResponse{
			ID:          product.ID.Hex(),
			Name:        product.Name,
			Description: product.Description,
			Category:    product.Category,
			Price:       product.Price,
			ImageURL:    product.ImageURL,
			StoreID:     product.StoreID.Hex(),
			StoreName:   store.Name,
			Stock:       product.Stock,
			IsActive:    product.IsActive,
			CreatedAt:   product.CreatedAt,
			UpdatedAt:   product.UpdatedAt,
		})
	}

	return productResponses, total, nil
}

func (p *productUsecase) GetMyProducts(ctx context.Context, storeID primitive.ObjectID, page, limit int) ([]*domain.ProductResponse, int64, error) {
	products, total, err := p.productRepo.GetMyProducts(ctx, storeID, page, limit)
	if err != nil {
		return nil, 0, err
	}

	// Get store name
	store, err := p.storeRepo.GetStoreByID(ctx, storeID)
	if err != nil {
		return nil, 0, errors.New("store not found")
	}

	var productResponses []*domain.ProductResponse
	for _, product := range products {
		productResponses = append(productResponses, &domain.ProductResponse{
			ID:          product.ID.Hex(),
			Name:        product.Name,
			Description: product.Description,
			Category:    product.Category,
			Price:       product.Price,
			ImageURL:    product.ImageURL,
			StoreID:     product.StoreID.Hex(),
			StoreName:   store.Name,
			Stock:       product.Stock,
			IsActive:    product.IsActive,
			CreatedAt:   product.CreatedAt,
			UpdatedAt:   product.UpdatedAt,
		})
	}

	return productResponses, total, nil
}
