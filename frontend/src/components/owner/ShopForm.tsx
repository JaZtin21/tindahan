import { useState } from 'react';
import { LocationPicker } from './LocationPicker';
import type { Shop } from '../../types/owner';

interface ShopFormProps {
  shop?: Shop | null;
  onSaveShop: (shop: Shop) => void;
  onCancel: () => void;
}

export function ShopForm({ shop, onSaveShop, onCancel }: ShopFormProps) {
  const [formData, setFormData] = useState({
    name: shop?.name || '',
    phone: shop?.contactDetails.phone || '',
    email: shop?.contactDetails.email || '',
    address: shop?.contactDetails.address || '',
    storefrontImage: shop?.storefrontImage || 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=400',
    coordinates: shop?.coordinates || { lat: 14.5995, lng: 120.9842 }
  });

  const handleLocationSelect = (coordinates: { lat: number; lng: number }, address: string) => {
    console.log('Location selected in ShopForm:', coordinates, address);
    setFormData(prev => ({
      ...prev,
      coordinates,
      address: address
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name) {
      alert('Please fill in shop name');
      return;
    }

    const shopData: Shop = {
      id: shop?.id || Date.now().toString(),
      name: formData.name,
      location: formData.address,
      coordinates: formData.coordinates,
      storefrontImage: formData.storefrontImage || 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=400',
      contactDetails: {
        phone: formData.phone,
        email: formData.email,
        address: formData.address
      },
      inventory: shop?.inventory || [],
      createdAt: shop?.createdAt || new Date().toISOString().split('T')[0]
    };

    onSaveShop(shopData);
  };

  return (
    <div className="w-full">
      <div className="bg-zinc-50 dark:bg-zinc-800 rounded-lg p-6 shadow-lg">
        <h2 className="text-2xl font-semibold mb-6">
          {shop ? 'Edit Shop' : 'Add New Shop'}
        </h2>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Shop Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-900 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                placeholder="Enter shop name"
                required
              />
            </div>
            
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Phone</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({...formData, phone: e.target.value})}
                className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-900 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                placeholder="+63 XXX XXX XXXX"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-900 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                placeholder="shop@email.com"
              />
            </div>
          </div>

          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
            <div className="flex items-start space-x-2">
              <span className="text-amber-600 dark:text-amber-400 text-sm">⚠️</span>
              <p className="text-sm text-amber-800 dark:text-amber-200">
                <strong>Privacy Notice:</strong> Don't put your personal phone number or email to prevent receiving spam messages or calls. Use a business contact instead.
              </p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Full Address *</label>
            <div className="relative">
              <LocationPicker
                onLocationSelect={handleLocationSelect}
                initialLocation={formData.coordinates}
              />
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2">
                Click button to select location on map
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            <div className="md:col-span-1">
              <label className="block text-sm font-medium mb-2">Storefront Image URL</label>
              <input
                type="url"
                value={formData.storefrontImage}
                onChange={(e) => setFormData({...formData, storefrontImage: e.target.value})}
                className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-900 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                placeholder="https://example.com/image.jpg"
              />
            </div>
          </div>

          <div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              Leave empty to use default image
            </p>
          </div>

          {formData.storefrontImage && (
            <div>
              <label className="block text-sm font-medium mb-2">Image Preview</label>
              <div className="aspect-video rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-700">
                <img 
                  src={formData.storefrontImage} 
                  alt="Storefront preview"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.src = 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=400';
                  }}
                />
              </div>
            </div>
          )}

          <div className="flex gap-4">
            <button
              type="submit"
              className="px-6 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors"
            >
              {shop ? 'Update Shop' : 'Add Shop'}
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="px-6 py-2 bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-lg hover:bg-zinc-300 dark:hover:bg-zinc-600 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
