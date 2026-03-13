package usecase

import (
	"context"
	"errors"

	"tindahan-backend/domain"
	"tindahan-backend/repository"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type StoreUsecase interface {
	CreateStore(ctx context.Context, req *domain.CreateStoreRequest, ownerID primitive.ObjectID) (*domain.StoreResponse, error)
	GetStoreByID(ctx context.Context, storeID primitive.ObjectID) (*domain.StoreResponse, error)
	UpdateStore(ctx context.Context, storeID primitive.ObjectID, ownerID primitive.ObjectID, req *domain.UpdateStoreRequest) (*domain.StoreResponse, error)
	DeleteStore(ctx context.Context, storeID primitive.ObjectID, ownerID primitive.ObjectID) error
	SearchStores(ctx context.Context, req *domain.StoreSearchRequest) ([]*domain.StoreResponse, int64, error)
	GetMyStores(ctx context.Context, ownerID primitive.ObjectID, page, limit int) ([]*domain.StoreResponse, int64, error)
}

type storeUsecase struct {
	storeRepo repository.StoreRepository
}

func NewStoreUsecase(storeRepo repository.StoreRepository) StoreUsecase {
	return &storeUsecase{
		storeRepo: storeRepo,
	}
}

func (s *storeUsecase) CreateStore(ctx context.Context, req *domain.CreateStoreRequest, ownerID primitive.ObjectID) (*domain.StoreResponse, error) {
	store := &domain.Store{
		Name:        req.Name,
		Description: req.Description,
		Address:     req.Address,
		City:        req.City,
		Latitude:    req.Latitude,
		Longitude:   req.Longitude,
		OwnerID:     ownerID,
		Category:    req.Category,
		IsActive:    true,
	}

	err := s.storeRepo.CreateStore(ctx, store)
	if err != nil {
		return nil, errors.New("failed to create store")
	}

	return &domain.StoreResponse{
		ID:          store.ID.Hex(),
		Name:        store.Name,
		Description: store.Description,
		Address:     store.Address,
		City:        store.City,
		Latitude:    store.Latitude,
		Longitude:   store.Longitude,
		OwnerID:     store.OwnerID.Hex(),
		Category:    store.Category,
		Rating:      store.Rating,
		IsActive:    store.IsActive,
		CreatedAt:   store.CreatedAt,
		UpdatedAt:   store.UpdatedAt,
	}, nil
}

func (s *storeUsecase) GetStoreByID(ctx context.Context, storeID primitive.ObjectID) (*domain.StoreResponse, error) {
	store, err := s.storeRepo.GetStoreByID(ctx, storeID)
	if err != nil {
		return nil, errors.New("store not found")
	}

	return &domain.StoreResponse{
		ID:          store.ID.Hex(),
		Name:        store.Name,
		Description: store.Description,
		Address:     store.Address,
		City:        store.City,
		Latitude:    store.Latitude,
		Longitude:   store.Longitude,
		OwnerID:     store.OwnerID.Hex(),
		Category:    store.Category,
		Rating:      store.Rating,
		IsActive:    store.IsActive,
		CreatedAt:   store.CreatedAt,
		UpdatedAt:   store.UpdatedAt,
	}, nil
}

func (s *storeUsecase) UpdateStore(ctx context.Context, storeID primitive.ObjectID, ownerID primitive.ObjectID, req *domain.UpdateStoreRequest) (*domain.StoreResponse, error) {
	// Check if store exists and belongs to owner
	existingStore, err := s.storeRepo.GetStoreByID(ctx, storeID)
	if err != nil {
		return nil, errors.New("store not found")
	}

	if existingStore.OwnerID != ownerID {
		return nil, errors.New("unauthorized to update this store")
	}

	err = s.storeRepo.UpdateStore(ctx, storeID, req)
	if err != nil {
		return nil, errors.New("failed to update store")
	}

	// Get updated store
	return s.GetStoreByID(ctx, storeID)
}

func (s *storeUsecase) DeleteStore(ctx context.Context, storeID primitive.ObjectID, ownerID primitive.ObjectID) error {
	// Check if store exists and belongs to owner
	existingStore, err := s.storeRepo.GetStoreByID(ctx, storeID)
	if err != nil {
		return errors.New("store not found")
	}

	if existingStore.OwnerID != ownerID {
		return errors.New("unauthorized to delete this store")
	}

	return s.storeRepo.DeleteStore(ctx, storeID)
}

func (s *storeUsecase) SearchStores(ctx context.Context, req *domain.StoreSearchRequest) ([]*domain.StoreResponse, int64, error) {
	stores, total, err := s.storeRepo.SearchStores(ctx, req)
	if err != nil {
		return nil, 0, err
	}

	var storeResponses []*domain.StoreResponse
	for _, store := range stores {
		storeResponses = append(storeResponses, &domain.StoreResponse{
			ID:          store.ID.Hex(),
			Name:        store.Name,
			Description: store.Description,
			Address:     store.Address,
			City:        store.City,
			Latitude:    store.Latitude,
			Longitude:   store.Longitude,
			OwnerID:     store.OwnerID.Hex(),
			Category:    store.Category,
			Rating:      store.Rating,
			IsActive:    store.IsActive,
			CreatedAt:   store.CreatedAt,
			UpdatedAt:   store.UpdatedAt,
		})
	}

	return storeResponses, total, nil
}

func (s *storeUsecase) GetMyStores(ctx context.Context, ownerID primitive.ObjectID, page, limit int) ([]*domain.StoreResponse, int64, error) {
	stores, total, err := s.storeRepo.GetMyStores(ctx, ownerID, page, limit)
	if err != nil {
		return nil, 0, err
	}

	var storeResponses []*domain.StoreResponse
	for _, store := range stores {
		storeResponses = append(storeResponses, &domain.StoreResponse{
			ID:          store.ID.Hex(),
			Name:        store.Name,
			Description: store.Description,
			Address:     store.Address,
			City:        store.City,
			Latitude:    store.Latitude,
			Longitude:   store.Longitude,
			OwnerID:     store.OwnerID.Hex(),
			Category:    store.Category,
			Rating:      store.Rating,
			IsActive:    store.IsActive,
			CreatedAt:   store.CreatedAt,
			UpdatedAt:   store.UpdatedAt,
		})
	}

	return storeResponses, total, nil
}
