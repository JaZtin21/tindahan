import type { ShopCardProps } from '../../types/owner';

export function ShopCard({ shop, onManageShop, onDeleteShop }: ShopCardProps) {
  return (
    <div className="bg-zinc-50 dark:bg-zinc-800 rounded-lg p-6 shadow-lg flex flex-col">
      <div className="aspect-video mb-4 rounded-lg overflow-hidden">
        {shop.coverPhoto ? (
          <img
            src={shop.coverPhoto}
            alt={shop.name}
            className="w-full h-full object-cover"
            onError={(e) => {
              e.currentTarget.src = 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=400';
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-zinc-500 dark:text-zinc-400 bg-primary/20">
            <span className="ml-2">No image available</span>
          </div>
        )}
      </div>
      <h3 className="text-xl font-semibold mb-2">{shop.name}</h3>
      {shop.description && (
        <p className="text-zinc-600 dark:text-zinc-400 mb-4">{shop.description}</p>
      )}

      <div className="space-y-2 mb-4">
        {shop.contactDetails?.phone && (
          <div className="flex items-start gap-2 text-sm">
            <span className="font-medium">📞</span>
            <span>{shop.contactDetails.phone}</span>
          </div>
        )}
        {shop.contactDetails?.email && (
          <div className="flex items-start gap-2 text-sm">
            <span className="font-medium">📧</span>
            <span>{shop.contactDetails.email}</span>
          </div>
        )}
        <div className="flex items-start gap-2 text-sm">
          <span className="font-medium">🏪</span>
          <span>{shop.contactDetails?.address || shop.location}</span>
        </div>
      </div>

      <div className="mt-auto pt-4 flex justify-end gap-3">
        <button
          onClick={() => onManageShop(shop.id)}
          className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          Manage Shop
        </button>
        {onDeleteShop && (
          <button
            onClick={() => onDeleteShop(shop.id)}
            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-900 transition-colors"
          >
            Delete
          </button>
        )}
      </div>
    </div>
  );
}
