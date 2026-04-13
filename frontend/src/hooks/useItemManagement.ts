import { useCallback } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import { CREATE_ITEM_MUTATION, DELETE_ITEM_MUTATION } from '../api/graphql/product/product-queries';
import { GET_OWNER_ITEMS_QUERY } from '../api/graphql/owner/owner-queries';
import type { Item as ProductItem, CreateItemInput } from '../api/graphql/product/product-queries';
import type { Item, Shop } from '../types/owner';

export interface UseItemManagementProps {
  selectedShop: Shop | null;
  isAuthenticated: boolean;
  onSuccess?: (title: string, message: string) => void;
  onError?: (title: string, message: string) => void;
  onConfirmDelete?: (item: Item, onConfirm: () => void) => void;
}

export interface UseItemManagementReturn {
  items: ProductItem[];
  itemsLoading: boolean;
  handleAddItem: (item: Item) => Promise<void>;
  handleEditItem: (shopId: string, itemId: string) => void;
  handleDeleteItem: (shopId: string, itemId: string) => void;
  refreshItems: () => Promise<void>;
}

export function useItemManagement({
  selectedShop,
  isAuthenticated,
  onSuccess,
  onError,
  onConfirmDelete,
}: UseItemManagementProps): UseItemManagementReturn {
  const { data: itemsData, loading: itemsLoading, refetch } = useQuery(GET_OWNER_ITEMS_QUERY, {
    variables: { page: 1, limit: 100 },
    fetchPolicy: 'network-only',
    skip: !selectedShop || !isAuthenticated,
  });

  const [createItemMutation] = useMutation(CREATE_ITEM_MUTATION);
  const [deleteItemMutation] = useMutation(DELETE_ITEM_MUTATION);

  const handleAddItem = useCallback(async (item: Item) => {
    if (!selectedShop) {
      onError?.('Error', 'No shop selected. Please select a shop first.');
      return;
    }

    try {
      const input: CreateItemInput = {
        name: item.name,
        price: item.price,
        description: item.description,
        category: item.category,
        stock: item.stock,
        coverPhoto: item.coverPhoto,
        otherPhotos: item.otherPhotos,
        tags: item.tags,
        shopId: selectedShop.id,
      };

      const result = await createItemMutation({
        variables: { input },
      });

      const response = (result.data as { createItem?: { success: boolean; message?: string } })?.createItem;

      if (response?.success) {
        await refetch();
        onSuccess?.('Item Added!', `"${item.name}" has been added to your inventory.`);
      } else {
        onError?.('Failed to Add Item', response?.message || 'Could not add item. Please try again.');
      }
    } catch (error) {
      console.error('Error adding item:', error);
      onError?.('Error', 'An error occurred while adding the item. Please try again.');
    }
  }, [selectedShop, createItemMutation, refetch, onSuccess, onError]);

  const handleEditItem = useCallback((shopId: string, itemId: string) => {
    // TODO: Implement edit item form
    console.log('Edit item:', shopId, itemId);
  }, []);

  const confirmDeleteItem = useCallback(async (itemId: string) => {
    try {
      const result = await deleteItemMutation({
        variables: { id: itemId },
      });

      const response = (result.data as { deleteItem?: { success: boolean; message?: string } })?.deleteItem;

      if (response?.success) {
        await refetch();
        onSuccess?.('Item Deleted', 'The item has been deleted successfully.');
      } else {
        onError?.('Delete Failed', response?.message || 'Failed to delete item. Please try again.');
      }
    } catch (error) {
      console.error('Error deleting item:', error);
      onError?.('Error', 'An error occurred while deleting the item. Please try again.');
    }
  }, [deleteItemMutation, refetch, onSuccess, onError]);

  const handleDeleteItem = useCallback((shopId: string, itemId: string) => {
    const item = selectedShop?.inventory?.find((i) => i.id === itemId);
    if (!item) return;

    onConfirmDelete?.(item, () => confirmDeleteItem(itemId));
  }, [selectedShop, onConfirmDelete, confirmDeleteItem]);

  const items: ProductItem[] = (itemsData as { myItems?: { data: ProductItem[] } })?.myItems?.data || [];

  const refreshItems = useCallback(async () => {
    await refetch();
  }, [refetch]);

  return {
    items,
    itemsLoading,
    handleAddItem,
    handleEditItem,
    handleDeleteItem,
    refreshItems,
  };
}
