import { useState } from 'react';
import { ShopCard, AddItemForm, InventoryTable, Tabs, Inquiries, ShopForm } from '../../components/owner';
import { sampleShops } from '../../utils/owner/sampleData';
import type { Shop, Item, ActiveTab } from '../../types/owner';

export function OwnerPage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('shops');
  const [selectedShop, setSelectedShop] = useState<Shop | null>(null);
  const [shops, setShops] = useState<Shop[]>(sampleShops);

  const handleManageShop = (shopId: string) => {
    const shop = shops.find(s => s.id === shopId);
    if (shop) {
      setSelectedShop(shop);
      setActiveTab('add-item');
    }
  };

  const handleAddItem = (item: Item) => {
    if (selectedShop) {
      setShops(prev => prev.map(shop => 
        shop.id === selectedShop.id 
          ? { ...shop, inventory: [...shop.inventory, item] }
          : shop
      ));
    }
  };

  const handleEditItem = (shopId: string, itemId: string) => {
    console.log('Edit item:', shopId, itemId);
  };

  const handleDeleteItem = (shopId: string, itemId: string) => {
    setShops(prev => prev.map(shop => 
      shop.id === shopId 
        ? { ...shop, inventory: shop.inventory.filter(item => item.id !== itemId) }
        : shop
    ));
  };

  const handleSaveShop = (shopData: Shop) => {
    if (selectedShop) {
      // Update existing shop
      setShops(prev => prev.map(shop => 
        shop.id === shopData.id ? shopData : shop
      ));
      setSelectedShop(shopData);
    } else {
      // Add new shop
      setShops(prev => [...prev, shopData]);
      setSelectedShop(shopData);
      setActiveTab('add-item');
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
              onClick={() => setSelectedShop(null)}
              className="text-emerald-600 hover:text-emerald-700 font-medium"
            >
              ← Back to My Shops
            </button>
            <h2 className="text-2xl font-semibold mt-2">{selectedShop.name}</h2>
          </div>
        )}
        
        <Tabs activeTab={activeTab} onTabChange={setActiveTab} isShopView={isShopView} />

        {/* Tab Content */}
        {!isShopView && activeTab === 'shops' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold">My Shops</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {shops.map(shop => (
                <ShopCard 
                  key={shop.id} 
                  shop={shop} 
                  onManageShop={handleManageShop}
                />
              ))}
            </div>
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
    </div>
  );
}
