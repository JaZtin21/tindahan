import { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client/react';
import { ShopCard, AddItemForm, InventoryTable, Tabs, Inquiries, ShopForm } from '../../components/owner';
import { Modal } from '../../components';
import { GET_OWNER_SHOPS_QUERY } from '../../api/graphql/owner/owner-queries';
import { CREATE_SHOP_MUTATION, UPDATE_SHOP_MUTATION, DELETE_SHOP_MUTATION } from '../../api/graphql/shop/shop-queries';
import { useAuth } from '../../api/graphql/apolloProviderWithAuth';
import type { Shop, Item, ActiveTab } from '../../types/owner';
import type { OwnerShop } from '../../api/graphql/owner/owner-queries';

// Convert OwnerShop from API to local Shop type
function convertOwnerShopToShop(ownerShop: OwnerShop): Shop {
  return {
    id: ownerShop.id,
    name: ownerShop.name,
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
    inventory: [], // Will be fetched separately if needed
    createdAt: ownerShop.createdAt,
    updatedAt: ownerShop.updatedAt,
    createdBy: ownerShop.createdBy,
    status: ownerShop.status,
  };
}

// Convert local Shop to CreateShopInput for API
function shopToCreateInput(shop: Shop) {
  return {
    name: shop.name,
    location: shop.location,
    coordinates: shop.coordinates,
    coverPhoto: shop.coverPhoto,
    otherPhotos: shop.otherPhotos,
    businessHours: shop.businessHours,
    businessType: shop.businessType,
    paymentMethods: shop.paymentMethods,
    delivery: shop.delivery,
    socialMedia: shop.socialMedia,
    contactDetails: shop.contactDetails,
  };
}

// Convert local Shop to UpdateShopInput for API
function shopToUpdateInput(shop: Shop) {
  return {
    name: shop.name,
    location: shop.location,
    coordinates: shop.coordinates,
    coverPhoto: shop.coverPhoto,
    otherPhotos: shop.otherPhotos,
    businessHours: shop.businessHours,
    businessType: shop.businessType,
    paymentMethods: shop.paymentMethods,
    delivery: shop.delivery,
    socialMedia: shop.socialMedia,
    contactDetails: shop.contactDetails,
    status: shop.status,
  };
}

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

  // GraphQL queries and mutations - wait for auth to be ready
  const { data: shopsData, loading: shopsLoading, error: shopsError, refetch: refetchShops } = useQuery(GET_OWNER_SHOPS_QUERY, {
    variables: { page: 1, limit: 50 },
    fetchPolicy: 'network-only',
    skip: authLoading || !isAuthenticated, // Skip query until auth is ready
  });

  const [createShop] = useMutation(CREATE_SHOP_MUTATION);
  const [updateShop] = useMutation(UPDATE_SHOP_MUTATION);
  const [deleteShop] = useMutation(DELETE_SHOP_MUTATION);

  // Convert API shops to local format
  const shops: Shop[] = shopsData?.myShops?.data?.map((shop: OwnerShop) => convertOwnerShopToShop(shop)) || [];

  const handleManageShop = (shopId: string) => {
    const shop = shops.find(s => s.id === shopId);
    if (shop) {
      setSelectedShop(shop);
      setActiveTab('add-item');
    }
  };

  const handleAddItem = (item: Item) => {
    // TODO: Implement with CREATE_ITEM_MUTATION when ready
    console.log('Add item:', item);
  };

  const handleEditItem = (shopId: string, itemId: string) => {
    console.log('Edit item:', shopId, itemId);
  };

  const handleDeleteItem = (shopId: string, itemId: string) => {
    console.log('Delete item:', shopId, itemId);
  };

  const handleSaveShop = async (shopData: Shop) => {
    try {
      if (selectedShop) {
        // Update existing shop
        const result = await updateShop({
          variables: {
            id: shopData.id,
            input: shopToUpdateInput(shopData),
          },
        });

        if (result.data?.updateShop?.success) {
          await refetchShops();
          setSelectedShop(shopData);
          setModal({
            isOpen: true,
            type: 'success',
            title: 'Shop Updated!',
            message: 'Your shop has been updated successfully.',
          });
        } else {
          setModal({
            isOpen: true,
            type: 'error',
            title: 'Update Failed',
            message: result.data?.updateShop?.message || 'Failed to update shop. Please try again.',
          });
        }
      } else {
        // Create new shop
        const result = await createShop({
          variables: {
            input: shopToCreateInput(shopData),
          },
        });

        if (result.data?.createShop?.success) {
          const newShop = convertOwnerShopToShop(result.data.createShop.data);
          await refetchShops();
          setSelectedShop(newShop);
          setActiveTab('add-item');
          setModal({
            isOpen: true,
            type: 'success',
            title: 'Shop Created!',
            message: 'Your new shop has been created successfully.',
          });
        } else {
          setModal({
            isOpen: true,
            type: 'error',
            title: 'Creation Failed',
            message: result.data?.createShop?.message || 'Failed to create shop. Please try again.',
          });
        }
      }
    } catch (error) {
      console.error('Error saving shop:', error);
      setModal({
        isOpen: true,
        type: 'error',
        title: 'Error',
        message: 'An error occurred while saving the shop. Please try again.',
      });
    }
  };

  const handleDeleteShop = (shopId: string) => {
    setShopToDelete(shopId);
    const shop = shops.find(s => s.id === shopId);
    setModal({
      isOpen: true,
      type: 'info',
      title: 'Delete Shop?',
      message: `Are you sure you want to delete "${shop?.name || 'this shop'}"? This action cannot be undone.`,
      onConfirm: () => confirmDeleteShop(shopId),
      showCancel: true,
    });
  };

  const confirmDeleteShop = async (shopId: string) => {
    setModal(prev => ({ ...prev, isOpen: false }));
    
    try {
      const result = await deleteShop({
        variables: { id: shopId },
      });

      if (result.data?.deleteShop?.success) {
        await refetchShops();
        if (selectedShop?.id === shopId) {
          setSelectedShop(null);
        }
        setActiveTab('shops');
        setShopToDelete(null);
        setModal({
          isOpen: true,
          type: 'success',
          title: 'Shop Deleted',
          message: 'The shop has been deleted successfully.',
        });
      } else {
        setShopToDelete(null);
        setModal({
          isOpen: true,
          type: 'error',
          title: 'Delete Failed',
          message: result.data?.deleteShop?.message || 'Failed to delete shop. Please try again.',
        });
      }
    } catch (error) {
      console.error('Error deleting shop:', error);
      setShopToDelete(null);
      setModal({
        isOpen: true,
        type: 'error',
        title: 'Error',
        message: 'An error occurred while deleting the shop. Please try again.',
      });
    }
  };

  const handleCancelShopForm = () => {
    if (selectedShop) {
      setActiveTab('add-item');
    } else {
      setActiveTab('shops');
    }
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
              onClick={() => refetchShops()}
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
                    onDeleteShop={handleDeleteShop}
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
            onDeleteItem={handleDeleteItem}
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
