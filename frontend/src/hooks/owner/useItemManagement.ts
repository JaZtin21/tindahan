import { useCallback, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import { CREATE_ITEM_MUTATION, DELETE_ITEM_MUTATION, UPDATE_ITEM_MUTATION } from '../../api/graphql/product/product-queries';
import { GET_OWNER_ITEMS_QUERY } from '../../api/graphql/owner/owner-queries';
import type { Item as ProductItem, CreateItemInput, UpdateItemInput } from '../../api/graphql/product/product-queries';
import type { Item, UseItemManagementProps, UseItemManagementReturn } from '../../types/owner';

export function useItemManagement({
  selectedShop,
  isAuthenticated,
  onSuccess,
  onError,
  onConfirmDelete,
}: UseItemManagementProps): UseItemManagementReturn {
  const [page, setPage] = useState(1);

  const { data: itemsData, loading: itemsLoading, refetch } = useQuery(GET_OWNER_ITEMS_QUERY, {
    variables: { page, limit: 20, shopId: selectedShop?.id },
    fetchPolicy: 'network-only',
    skip: !selectedShop || !isAuthenticated,
  });

  // Derive items array and pagination data from query data - must be before callbacks that use it
  const items: ProductItem[] = (itemsData as { myItems?: { data: ProductItem[] } })?.myItems?.data || [];
  const total = (itemsData as { myItems?: { total?: number } })?.myItems?.total || 0;
  const totalPages = (itemsData as { myItems?: { totalPages?: number } })?.myItems?.totalPages || 1;

  const [createItemMutation] = useMutation(CREATE_ITEM_MUTATION);
  const [updateItemMutation] = useMutation(UPDATE_ITEM_MUTATION);
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
        coverPhoto: item.newCoverPhoto || undefined,
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

  const handleEditItem = useCallback(async (shopId: string, itemId: string, itemData: Item) => {
    if (!selectedShop) {
      onError?.('Error', 'No shop selected. Please select a shop first.');
      return;
    }

    try {
      const input: UpdateItemInput = {
        name: itemData.name,
        price: itemData.price,
        description: itemData.description,
        category: itemData.category,
        stock: itemData.stock,
        coverPhoto: itemData.coverPhoto,
        newCoverPhoto: itemData.newCoverPhoto || undefined,
        tags: itemData.tags,
      };

      const result = await updateItemMutation({
        variables: { id: itemId, input },
      });

      const response = (result.data as { updateItem?: { success: boolean; message?: string } })?.updateItem;

      if (response?.success) {
        await refetch();
        onSuccess?.('Item Updated!', `"${itemData.name}" has been updated.`);
      } else {
        onError?.('Failed to Update Item', response?.message || 'Could not update item. Please try again.');
      }
    } catch (error) {
      console.error('Error updating item:', error);
      onError?.('Error', 'An error occurred while updating the item. Please try again.');
    }
  }, [selectedShop, updateItemMutation, refetch, onSuccess, onError]);

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
    // Find item from the loaded items array
    const item = items.find((i) => i.id === itemId);
    if (!item) {
      console.error('Item not found for deletion:', itemId);
      onError?.('Error', 'Item not found');
      return;
    }

    onConfirmDelete?.(item as unknown as Item, () => confirmDeleteItem(itemId));
  }, [items, onConfirmDelete, confirmDeleteItem, onError]);

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
    page,
    setPage,
    total,
    totalPages,
  };
}
