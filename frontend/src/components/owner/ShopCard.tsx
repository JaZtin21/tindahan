import type { Shop } from '../../types/owner';

interface ShopCardProps {
  shop: Shop;
  onManageShop: (shopId: string) => void;
  onDeleteShop?: (shopId: string) => void;
}

export function ShopCard({ shop, onManageShop, onDeleteShop }: ShopCardProps) {
  return (
    <div className="bg-zinc-50 dark:bg-zinc-800 rounded-lg p-6 shadow-lg">
      <div className="aspect-video mb-4 rounded-lg overflow-hidden">
        <img
          src={shop.coverPhoto}
          alt={shop.name}
          className="w-full h-full object-cover"
          onError={(e) => {
            e.currentTarget.src = 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=400';
          }}
        />
      </div>
      <h3 className="text-xl font-semibold mb-2">{shop.name}</h3>
      <p className="text-zinc-600 dark:text-zinc-400 mb-4">{shop.location}</p>

      <div className="space-y-2 mb-4">
        <div className="flex items-center gap-2 text-sm">
          <span className="font-medium">📞</span>
          <span>{shop.contactDetails.phone}</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="font-medium">📧</span>
          <span>{shop.contactDetails.email}</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="font-medium">📍</span>
          <span>{shop.contactDetails.address}</span>
        </div>
      </div>

      <div className="flex justify-between items-center">
        <span className="text-sm text-zinc-500 dark:text-zinc-400">
          {shop.inventory?.length || 0} items in stock
        </span>
        <div className="flex gap-2">
          <button
            onClick={() => onManageShop(shop.id)}
            className="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors"
          >
            Manage Shop
          </button>
          {onDeleteShop && (
            <button
              onClick={() => onDeleteShop(shop.id)}
              className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
            >
              Delete
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
