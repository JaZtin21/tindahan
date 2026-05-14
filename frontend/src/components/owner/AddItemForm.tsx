import { useState, useEffect } from 'react';
import type { NewItemForm, Item, AddItemFormProps } from '../../types/owner';

export function AddItemForm({ onAddItem, item, onCancel }: AddItemFormProps) {
  const isEditMode = !!item;
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [newItem, setNewItem] = useState<NewItemForm>({
    name: '',
    price: '',
    description: '',
    category: '',
    stock: ''
  });

  // Populate form when editing
  useEffect(() => {
    if (item) {
      setNewItem({
        name: item.name,
        price: item.price.toString(),
        description: item.description,
        category: item.category,
        stock: item.stock.toString()
      });
    }
  }, [item]);

  const handleSubmit = async () => {
    if (newItem.name && newItem.price && newItem.stock) {
      setIsSubmitting(true);
      try {
        const itemData: Item = {
          id: item?.id || Date.now().toString(),
          name: newItem.name,
          price: parseFloat(newItem.price),
          description: newItem.description,
          category: newItem.category || '',
          stock: parseInt(newItem.stock),
          // Required fields with defaults
          coverPhoto: item?.coverPhoto || 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=400',
          otherPhotos: item?.otherPhotos || [],
          tags: item?.tags || [],
          isActive: item?.isActive ?? true
        };

        await onAddItem(itemData);

        // Reset form only if adding (not editing)
        if (!isEditMode) {
          setNewItem({
            name: '',
            price: '',
            description: '',
            category: '',
            stock: ''
          });
        }
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const categories = [
    'Grains',
    'Canned Goods', 
    'Instant Food',
    'Bakery',
    'Cooking',
    'Beverages',
    'Snacks',
    'Personal Care'
  ];

  return (
    <div className="bg-zinc-50 dark:bg-zinc-800 rounded-lg p-6 shadow-lg">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">Item Name <span className="text-red-500">*</span></label>
          <input
            type="text"
            value={newItem.name}
            onChange={(e) => setNewItem({...newItem, name: e.target.value})}
            className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-900 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            placeholder="Enter item name"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Price (₱) <span className="text-red-500">*</span></label>
            <input
              type="number"
              value={newItem.price}
              onChange={(e) => setNewItem({...newItem, price: e.target.value})}
              className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-900 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              placeholder="0.00"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Stock Quantity <span className="text-red-500">*</span></label>
            <input
              type="number"
              value={newItem.stock}
              onChange={(e) => setNewItem({...newItem, stock: e.target.value})}
              className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-900 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              placeholder="0"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Category (optional)</label>
          <select
            value={newItem.category}
            onChange={(e) => setNewItem({...newItem, category: e.target.value})}
            className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-900 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          >
            <option value="">Select category</option>
            {categories.map(category => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Description <span className="text-red-500">*</span></label>
          <textarea
            value={newItem.description}
            onChange={(e) => setNewItem({...newItem, description: e.target.value})}
            className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-900 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            rows={3}
            placeholder="Enter item description"
          />
        </div>
        
        <div className="flex gap-4">
          <button
            onClick={handleSubmit}
            disabled={!newItem.name || !newItem.price || !newItem.stock || isSubmitting}
            className="px-6 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 disabled:bg-zinc-400 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting ? 'Saving...' : (isEditMode ? 'Save Changes' : 'Add Item')}
          </button>
          {isEditMode ? (
            <button
              onClick={onCancel}
              disabled={isSubmitting}
              className="px-6 py-2 bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-lg hover:bg-zinc-300 dark:hover:bg-zinc-600 disabled:bg-zinc-300 disabled:cursor-not-allowed transition-colors"
            >
              Cancel
            </button>
          ) : (
            <button
              onClick={() => setNewItem({
                name: '',
                price: '',
                description: '',
                category: '',
                stock: ''
              })}
              disabled={isSubmitting}
              className="px-6 py-2 bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-lg hover:bg-zinc-300 dark:hover:bg-zinc-600 disabled:bg-zinc-300 disabled:cursor-not-allowed transition-colors"
            >
              Clear
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
