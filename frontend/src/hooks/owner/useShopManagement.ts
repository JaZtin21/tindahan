import { useCallback } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import { CREATE_SHOP_MUTATION, UPDATE_SHOP_MUTATION, DELETE_SHOP_MUTATION } from '../../api/graphql/shop/shop-queries';
import { GET_OWNER_SHOPS_QUERY } from '../../api/graphql/owner/owner-queries';
import type { OwnerShop } from '../../api/graphql/owner/owner-queries';
import type { Shop, UseShopManagementProps, UseShopManagementReturn } from '../../types/owner';

function convertOwnerShopToShop(ownerShop: OwnerShop): Shop {
  return {
    id: ownerShop.id,
    name: ownerShop.name,
    description: ownerShop.description,
    location: ownerShop.location,
    coordinates: ownerShop.coordinates,
    coverPhoto: ownerShop.coverPhoto,
    otherPhotos: ownerShop.otherPhotos,
    businessHours: ownerShop.businessHours,
    businessType: ownerShop.businessType,
    paymentMethods: ownerShop.paymentMethods,
    delivery: ownerShop.delivery,
    socialMedia: ownerShop.socialMedia,
    verification: ownerShop.verification,
    contactDetails: ownerShop.contactDetails,
    inventory: [],
    createdAt: ownerShop.createdAt,
    updatedAt: ownerShop.updatedAt,
    createdBy: ownerShop.createdBy,
    status: ownerShop.status,
  };
}

interface CreateShopInput {
  name: string;
  description?: string;
  location: string;
  coordinates: { lat: number; lng: number };
  coverPhoto?: File;
  otherPhotos?: File[];
  businessHours: {
    openTime: string;
    closeTime: string;
    days: string[];
  };
  businessType: string;
  paymentMethods: {
    cash: boolean;
    gcash: boolean;
    paymaya: boolean;
    card: boolean;
  };
  delivery: {
    available: boolean;
    radius?: number;
    fee?: number;
    minOrder?: number;
  };
  socialMedia: {
    facebook?: string;
    instagram?: string;
  };
  contactDetails: {
    phone: string;
    email: string;
    address: string;
  };
}

interface UpdateShopInput {
  name?: string;
  description?: string;
  location?: string;
  coordinates?: { lat: number; lng: number };
  coverPhoto?: string;
  newCoverPhoto?: File;
  otherPhotos?: string[];
  newOtherPhotos?: File[];
  businessHours?: {
    openTime: string;
    closeTime: string;
    days: string[];
  };
  businessType?: string;
  paymentMethods?: {
    cash: boolean;
    gcash: boolean;
    paymaya: boolean;
    card: boolean;
  };
  delivery?: {
    available: boolean;
    radius?: number;
    fee?: number;
    minOrder?: number;
  };
  socialMedia?: {
    facebook?: string;
    instagram?: string;
  };
  contactDetails?: {
    phone: string;
    email: string;
    address: string;
  };
  status?: string;
}

function shopToCreateInput(shop: Shop, coverPhotoFile?: File, otherPhotoFiles?: File[]): CreateShopInput {
  return {
    name: shop.name,
    description: shop.description,
    location: shop.location,
    coordinates: shop.coordinates,
    coverPhoto: coverPhotoFile,
    otherPhotos: otherPhotoFiles,
    businessHours: shop.businessHours,
    businessType: shop.businessType,
    paymentMethods: shop.paymentMethods,
    delivery: shop.delivery,
    socialMedia: shop.socialMedia,
    contactDetails: shop.contactDetails,
  };
}

function shopToUpdateInput(shop: Shop, existingCoverPhoto?: string, newCoverFile?: File, newOtherPhotoFiles?: File[]): UpdateShopInput {
  return {
    name: shop.name,
    description: shop.description,
    location: shop.location,
    coordinates: shop.coordinates,
    coverPhoto: existingCoverPhoto || shop.coverPhoto,
    newCoverPhoto: newCoverFile,
    otherPhotos: shop.otherPhotos,
    newOtherPhotos: newOtherPhotoFiles,
    businessHours: shop.businessHours,
    businessType: shop.businessType,
    paymentMethods: shop.paymentMethods,
    delivery: shop.delivery,
    socialMedia: shop.socialMedia,
    contactDetails: shop.contactDetails,
    status: shop.status,
  };
}

export function useShopManagement({
  isAuthenticated,
  authLoading,
  onSuccess,
  onError,
}: UseShopManagementProps): UseShopManagementReturn {
  const {
    data: shopsData,
    loading: shopsLoading,
    error: shopsError,
    refetch: refetchShops,
  } = useQuery(GET_OWNER_SHOPS_QUERY, {
    variables: { page: 1, limit: 50 },
    fetchPolicy: 'network-only',
    skip: authLoading || !isAuthenticated,
  });

  const [createShopMut, { loading: createLoading }] = useMutation(CREATE_SHOP_MUTATION);
  const [updateShopMut, { loading: updateLoading }] = useMutation(UPDATE_SHOP_MUTATION);
  const [deleteShopMut, { loading: deleteLoading }] = useMutation(DELETE_SHOP_MUTATION);

  const createShop = useCallback(
    async (shop: Shop, _existingCoverPhoto?: string, newCoverFile?: File, otherPhotoFiles?: File[]): Promise<{ success: boolean; message?: string }> => {
      try {
        const result = await createShopMut({
          variables: { input: shopToCreateInput(shop, newCoverFile, otherPhotoFiles) },
        });

        const response = (result.data as { createShop?: { success: boolean; message?: string } })?.createShop;

        if (response?.success) {
          await refetchShops();
          onSuccess?.('Shop Created!', 'Your new shop has been created successfully.');
          return { success: true };
        } else {
          onError?.('Creation Failed', response?.message || 'Could not create shop. Please try again.');
          return { success: false, message: response?.message };
        }
      } catch (error) {
        console.error('Error creating shop:', error);
        onError?.('Error', 'An error occurred while creating the shop. Please try again.');
        return { success: false, message: 'An error occurred' };
      }
    },
    [createShopMut, refetchShops, onSuccess, onError]
  );

  const updateShop = useCallback(
    async (shop: Shop, existingCoverPhoto?: string, newCoverFile?: File, newOtherPhotoFiles?: File[]): Promise<{ success: boolean; message?: string }> => {
      try {
        const result = await updateShopMut({
          variables: {
            id: shop.id,
            input: shopToUpdateInput(shop, existingCoverPhoto, newCoverFile, newOtherPhotoFiles),
          },
        });

        const response = (result.data as { updateShop?: { success: boolean; message?: string } })?.updateShop;

        if (response?.success) {
          await refetchShops();
          onSuccess?.('Shop Updated!', 'Your shop has been updated successfully.');
          return { success: true };
        } else {
          onError?.('Update Failed', response?.message || 'Could not update shop. Please try again.');
          return { success: false, message: response?.message };
        }
      } catch (error) {
        console.error('Error updating shop:', error);
        onError?.('Error', 'An error occurred while updating the shop. Please try again.');
        return { success: false, message: 'An error occurred' };
      }
    },
    [updateShopMut, refetchShops, onSuccess, onError]
  );

  const deleteShop = useCallback(
    async (shopId: string): Promise<{ success: boolean; message?: string }> => {
      try {
        const result = await deleteShopMut({
          variables: { id: shopId },
        });

        const response = (result.data as { deleteShop?: { success: boolean; message?: string } })?.deleteShop;

        if (response?.success) {
          await refetchShops();
          onSuccess?.('Shop Deleted', 'The shop has been deleted successfully.');
          return { success: true };
        } else {
          onError?.('Delete Failed', response?.message || 'Failed to delete shop. Please try again.');
          return { success: false, message: response?.message };
        }
      } catch (error) {
        console.error('Error deleting shop:', error);
        onError?.('Error', 'An error occurred while deleting the shop. Please try again.');
        return { success: false, message: 'An error occurred' };
      }
    },
    [deleteShopMut, refetchShops, onSuccess, onError]
  );

  const shops: Shop[] = (shopsData as { myShops?: { data: OwnerShop[] } })?.myShops?.data?.map((shop: OwnerShop) => convertOwnerShopToShop(shop)) || [];

  return {
    shops,
    shopsLoading,
    shopsError,
    createShop,
    updateShop,
    deleteShop,
    createLoading,
    updateLoading,
    deleteLoading,
    refreshShops: async () => { await refetchShops(); },
  };
}
