import { useState } from 'react';
import { ShopCard, AddItemForm, InventoryTable, Tabs, Inquiries, ShopForm } from '../../components/owner';
import { Modal } from '../../components';
import { useItemManagement, useShopManagement } from '../../hooks';
import { useAuth } from '../../api/graphql/apolloProviderWithAuth';
import type { Shop, ActiveTab } from '../../types/owner';

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

  const { items, handleAddItem, handleEditItem, handleDeleteItem } = useItemManagement({
    selectedShop,
    isAuthenticated,
    onSuccess: showSuccess,
    onError: showError,
  });

  // Update selected shop with items from API
  if (selectedShop && items.length > 0) {
    const shopItems = items.filter((item) => item.shopId === selectedShop.id);
    selectedShop.inventory = shopItems.map((item) => ({
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
    }));
  }

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
        // Find the newly created shop
        await refreshShops();
        const newShop = shops.find((s) => s.name === shopData.name);
        if (newShop) {
          setSelectedShop(newShop);
          setActiveTab('add-item');
        }
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

  const handleDeleteItemClick = (shopId: string, itemId: string) => {
    const item = selectedShop?.inventory?.find((i) => i.id === itemId);
    showConfirm(
      'Delete Item?',
      `Are you sure you want to delete "${item?.name || 'this item'}"? This action cannot be undone.`,
      () => confirmDeleteItem(itemId)
    );
  };

  const confirmDeleteItem = async (itemId: string) => {
    setModal((prev) => ({ ...prev, isOpen: false }));
    await handleDeleteItem(selectedShop?.id || '', itemId);
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

        {isShopView && activeTab === 'inventory' && selectedShop && (
          <InventoryTable
            shops={[selectedShop]}
            onEditItem={handleEditItem}
            onDeleteItem={handleDeleteItemClick}
          />
        )}

        {isShopView && activeTab === 'inquiries' && selectedShop && (
          <Inquiries shop={selectedShop} />
        )}

        {isShopView && activeTab === 'edit-shop' && selectedShop && (
          <ShopForm
            shop={selectedShop}
            onSaveShop={handleSaveShop}
            onCancel={handleCancelShopForm}
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
