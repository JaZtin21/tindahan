import { useState, useEffect, useRef, type ChangeEvent } from 'react';
import type { NewItemForm, Item, AddItemFormProps } from '../../types/owner';

const DEFAULT_IMAGE = 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=400';

// Inline SVG icons
const XIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const ImageIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
);

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

  // Cover photo upload state - track existing and new separately like ShopForm
  const [existingCoverPhoto, setExistingCoverPhoto] = useState<string>(item?.coverPhoto || '');
  const [newCoverFile, setNewCoverFile] = useState<File | null>(null);
  const [newCoverPreview, setNewCoverPreview] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Combined preview for display
  const coverPhotoPreview = newCoverPreview || existingCoverPhoto;

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
      setExistingCoverPhoto(item.coverPhoto || '');
    }
  }, [item]);

  const handleCoverPhotoSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];

    // Revoke previous preview URL if it was a blob URL
    if (newCoverPreview && newCoverPreview.startsWith('blob:')) {
      URL.revokeObjectURL(newCoverPreview);
    }

    setNewCoverFile(file);
    const preview = URL.createObjectURL(file);
    setNewCoverPreview(preview);
  };

  const removeCoverPhoto = () => {
    if (newCoverPreview && newCoverPreview.startsWith('blob:')) {
      URL.revokeObjectURL(newCoverPreview);
    }
    // If there's a new file, remove it
    if (newCoverFile) {
      setNewCoverFile(null);
      setNewCoverPreview('');
    } else {
      // Otherwise remove the existing
      setExistingCoverPhoto('');
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

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
          // Pass both existing URL and new File - upload happens via GraphQL mutation
          coverPhoto: existingCoverPhoto,
          newCoverPhoto: newCoverFile || undefined,
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
          setExistingCoverPhoto('');
          setNewCoverFile(null);
          setNewCoverPreview('');
          if (fileInputRef.current) fileInputRef.current.value = '';
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
            onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
            className="w-full px-3 py-2 border  border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-900 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            placeholder="Enter item name"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Price (₱) <span className="text-red-500">*</span></label>
            <input
              type="number"
              value={newItem.price}
              onChange={(e) => setNewItem({ ...newItem, price: e.target.value })}
              className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-900 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              placeholder="0.00"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Stock Quantity <span className="text-red-500">*</span></label>
            <input
              type="number"
              value={newItem.stock}
              onChange={(e) => setNewItem({ ...newItem, stock: e.target.value })}
              className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-900 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              placeholder="0"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Category (optional)</label>
          <select
            value={newItem.category}
            onChange={(e) => setNewItem({ ...newItem, category: e.target.value })}
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
            onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
            className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-900 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            rows={3}
            placeholder="Enter item description"
          />
        </div>

        {/* Cover Photo Upload */}
        <div className="border border-zinc-200 dark:border-zinc-700 rounded-lg p-4">
          <label className="block text-sm font-medium mb-4">Item Photo</label>

          {/* Photo preview */}
          {coverPhotoPreview ? (
            <div className="relative aspect-video rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-700 mb-4">
              <img
                src={coverPhotoPreview}
                alt="Cover preview"
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.src = DEFAULT_IMAGE;
                }}
              />
              <button
                type="button"
                onClick={removeCoverPhoto}
                className="absolute top-2 right-2 p-1.5 bg-black/50 hover:bg-black/70 rounded-full transition-colors"
              >
                <XIcon className="w-4 h-4 text-white" />
              </button>
            </div>
          ) : (
            <div className="aspect-video rounded-lg bg-zinc-100 dark:bg-zinc-800 border-2 border-dashed border-zinc-300 dark:border-zinc-600 flex items-center justify-center mb-4">
              <div className="text-center">
                <ImageIcon className="w-12 h-12 text-zinc-400 mx-auto mb-2" />
                <p className="text-sm text-zinc-500 dark:text-zinc-400">No cover photo selected</p>
              </div>
            </div>
          )}

          {/* Upload button */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-lg hover:bg-emerald-200 dark:hover:bg-emerald-900/50 transition-colors"
            >
              <ImageIcon className="w-5 h-5" />
              <span>{coverPhotoPreview ? 'Change Photo' : 'Upload Photo'}</span>
            </button>
            {coverPhotoPreview && (
              <span className="text-sm text-zinc-500 dark:text-zinc-400">
                {newCoverFile ? 'New photo selected' : (existingCoverPhoto ? 'Using existing photo' : '')}
              </span>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleCoverPhotoSelect}
            className="hidden"
          />

          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2">
            Max 5MB. Recommended aspect ratio: 1:1
          </p>
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
              onClick={() => {
                setNewItem({
                  name: '',
                  price: '',
                  description: '',
                  category: '',
                  stock: ''
                });
                setExistingCoverPhoto('');
                setNewCoverFile(null);
                setNewCoverPreview('');
                if (fileInputRef.current) fileInputRef.current.value = '';
              }}
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
