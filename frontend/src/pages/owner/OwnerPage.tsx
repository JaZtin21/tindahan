import { useState, useEffect, useCallback } from 'react';
import { ShopCard, AddItemForm, InventoryTable, Tabs, Inquiries, ShopForm } from '../../components/owner';
import { Modal } from '../../components';
import { useItemManagement, useShopManagement } from '../../hooks';
import { useAuth } from '../../api/graphql/apolloProviderWithAuth';
import type { Shop, ActiveTab, Item } from '../../types/owner';

interface ModalState {
  isOpen: boolean;
  type: 'success' | 'error' | 'info';
  title?: string;
  message: string;
  onConfirm?: () => void;
  showCancel?: boolean;
}

export function OwnerPage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('shops');
  const [selectedShop, setSelectedShop] = useState<Shop | null>(null);
  const { isLoading: authLoading, isAuthenticated } = useAuth();
  const [modal, setModal] = useState<ModalState>({
    isOpen: false,
    type: 'success',
    message: '',
  });
  const [shopToDelete, setShopToDelete] = useState<string | null>(null);
  // Track shop with inventory data separately to avoid mutating state
  const [shopWithInventory, setShopWithInventory] = useState<Shop | null>(null);
  // Track item being edited
  const [itemToEdit, setItemToEdit] = useState<Item | null>(null);

  // Modal helpers
  const showSuccess = (title: string, message: string) => {
    setModal({ isOpen: true, type: 'success', title, message });
  };

  const showError = (title: string, message: string) => {
    setModal({ isOpen: true, type: 'error', title, message });
  };

  const showConfirm = (title: string, message: string, onConfirm: () => void) => {
    setModal({ isOpen: true, type: 'info', title, message, onConfirm, showCancel: true });
  };

  // Use custom hooks for data management
  const { shops, shopsLoading, shopsError, createShop, updateShop, deleteShop, refreshShops } = useShopManagement({
    isAuthenticated,
    authLoading,
    onSuccess: showSuccess,
    onError: showError,
  });

  const { items, handleAddItem, handleEditItem: handleEditItemBase, handleDeleteItem } = useItemManagement({
    selectedShop,
    isAuthenticated,
    onSuccess: showSuccess,
    onError: showError,
    onConfirmDelete: (item, onConfirm) => showConfirm(
      'Delete Item?',
      `Are you sure you want to delete "${item.name}"?`,
      onConfirm
    ),
  });

  // Wrapper for edit item that opens edit form
  const handleEditItem = useCallback((_shopId: string, itemId: string) => {
    const item = items.find((i) => i.id === itemId);
    if (item) {
      setItemToEdit(item);
      setActiveTab('edit-item');
    }
  }, [items]);

  // Handle save edited item
  const handleSaveEditItem = useCallback(async (item: Item) => {
    await handleEditItemBase(selectedShop?.id || '', item.id, item);
    setItemToEdit(null);
    setActiveTab('inventory');
  }, [handleEditItemBase, selectedShop]);

  // Cancel edit and go back to inventory
  const handleCancelEditItem = useCallback(() => {
    setItemToEdit(null);
    setActiveTab('inventory');
  }, []);

  // Debug logging
  useEffect(() => {
    console.log('DEBUG - selectedShop:', selectedShop?.id, selectedShop?.name);
    console.log('DEBUG - items count:', items.length);
    console.log('DEBUG - items:', items.map(i => ({ id: i.id, name: i.name, shopId: i.shopId })));
  }, [selectedShop, items]);

  // Update shopWithInventory when selectedShop or items change
  useEffect(() => {
    if (selectedShop) {
      const shopItems = items.filter((item) => item.shopId === selectedShop.id);
      console.log('DEBUG - filtered shopItems:', shopItems.length, 'for shop', selectedShop.id);
      setShopWithInventory({
        ...selectedShop,
        inventory: shopItems.map((item) => ({
          id: item.id,
          name: item.name,
          price: item.price,
          description: item.description,
          category: item.category,
          stock: item.stock,
          coverPhoto: item.coverPhoto,
          otherPhotos: item.otherPhotos,
          tags: item.tags,
          isActive: item.isActive,
        })),
      });
    } else {
      setShopWithInventory(null);
    }
  }, [selectedShop, items]);

  const handleManageShop = (shopId: string) => {
    const shop = shops.find((s) => s.id === shopId);
    if (shop) {
      setSelectedShop(shop);
      setActiveTab('add-item');
    }
  };

  const handleSaveShop = async (shopData: Shop) => {
    if (selectedShop) {
      const result = await updateShop(shopData);
      if (result.success) {
        setSelectedShop(shopData);
      }
    } else {
      const result = await createShop(shopData);
      if (result.success) {
        // Refresh shops list and navigate to My Shops tab
        await refreshShops();
        setSelectedShop(null);
        setActiveTab('shops');
      }
    }
  };

  const handleDeleteShopClick = (shopId: string) => {
    setShopToDelete(shopId);
    const shop = shops.find((s) => s.id === shopId);
    showConfirm(
      'Delete Shop?',
      `Are you sure you want to delete "${shop?.name || 'this shop'}"? This action cannot be undone.`,
      () => confirmDeleteShop(shopId)
    );
  };

  const confirmDeleteShop = async (shopId: string) => {
    setModal((prev) => ({ ...prev, isOpen: false }));
    const result = await deleteShop(shopId);
    if (result.success) {
      if (selectedShop?.id === shopId) {
        setSelectedShop(null);
      }
      setActiveTab('shops');
      setShopToDelete(null);
    }
  };

  const handleCancelShopForm = () => {
    setActiveTab(selectedShop ? 'add-item' : 'shops');
  };

  const isShopView = selectedShop !== null;

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Shop Owner Portal</h1>

        {isShopView && (
          <div className="mb-6">
            <button
              onClick={() => {
                setSelectedShop(null);
                setActiveTab('shops');
              }}
              className="text-emerald-600 hover:text-emerald-700 font-medium"
            >
              ← Back to My Shops
            </button>
            <h2 className="text-2xl font-semibold mt-2">{selectedShop.name}</h2>
          </div>
        )}

        <Tabs activeTab={activeTab} onTabChange={setActiveTab} isShopView={isShopView} />

        {/* Error State */}
        {shopsError && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
            <p className="text-red-700 dark:text-red-300">
              Error loading shops: {shopsError.message}
            </p>
            <button
              onClick={() => refreshShops()}
              className="mt-2 text-sm text-red-600 dark:text-red-400 underline"
            >
              Retry
            </button>
          </div>
        )}

        {/* Loading State - Show auth loading or shops loading */}
        {(authLoading || shopsLoading) && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
            <span className="ml-3 text-zinc-600 dark:text-zinc-400">
              {authLoading ? 'Authenticating...' : 'Loading shops...'}
            </span>
          </div>
        )}

        {/* Tab Content */}
        {!isShopView && activeTab === 'shops' && !shopsLoading && (
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold">My Shops</h2>
            {shops.length === 0 ? (
              <div className="text-center py-12 bg-zinc-50 dark:bg-zinc-800 rounded-lg">
                <p className="text-zinc-600 dark:text-zinc-400">You don&apos;t have any shops yet.</p>
                <button
                  onClick={() => setActiveTab('add-shop')}
                  className="mt-4 px-6 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors"
                >
                  Create Your First Shop
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {shops.map(shop => (
                  <ShopCard
                    key={shop.id}
                    shop={shop}
                    onManageShop={handleManageShop}
                    onDeleteShop={handleDeleteShopClick}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {!isShopView && activeTab === 'add-shop' && (
          <ShopForm
            shop={null}
            onSaveShop={handleSaveShop}
            onCancel={handleCancelShopForm}
          />
        )}

        {isShopView && activeTab === 'add-item' && selectedShop && (
          <AddItemForm onAddItem={handleAddItem} />
        )}

        {isShopView && activeTab === 'inventory' && shopWithInventory && (
          <InventoryTable
            shops={[shopWithInventory]}
            onEditItem={handleEditItem}
            onDeleteItem={handleDeleteItem}
          />
        )}

        {isShopView && activeTab === 'inquiries' && shopWithInventory && (
          <Inquiries shop={shopWithInventory} />
        )}

        {isShopView && activeTab === 'edit-shop' && selectedShop && (
          <ShopForm
            shop={shopWithInventory || selectedShop}
            onSaveShop={handleSaveShop}
            onCancel={handleCancelShopForm}
          />
        )}

        {isShopView && activeTab === 'edit-item' && selectedShop && itemToEdit && (
          <AddItemForm
            item={itemToEdit}
            onAddItem={handleSaveEditItem}
            onCancel={handleCancelEditItem}
          />
        )}
      </div>

      {/* Modal */}
      <Modal
        isOpen={modal.isOpen}
        onClose={() => {
          setModal(prev => ({ ...prev, isOpen: false }));
          setShopToDelete(null);
        }}
        type={modal.type}
        title={modal.title}
        message={modal.message}
        onConfirm={modal.onConfirm}
        showCancel={modal.showCancel}
      />
    </div>
  );
}
