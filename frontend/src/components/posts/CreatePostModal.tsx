import { useState, useRef, type ChangeEvent } from 'react';
import { LocationPicker } from '../owner/LocationPicker';

interface CreatePostModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (post: { text: string; photos: File[]; location: { lat: number; lng: number; name: string } }) => void;
  isSubmitting?: boolean;
  currentLocation?: { lat: number; lng: number; name?: string } | null;
}

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

export function CreatePostModal({ isOpen, onClose, onSubmit, isSubmitting: externalSubmitting, currentLocation }: CreatePostModalProps) {
  const [text, setText] = useState('');
  const [photos, setPhotos] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number; name: string } | null>(
    currentLocation?.name ? { lat: currentLocation.lat, lng: currentLocation.lng, name: currentLocation.name } : null
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleLocationSelect = (coordinates: { lat: number; lng: number }, address: string) => {
    setSelectedLocation({
      lat: coordinates.lat,
      lng: coordinates.lng,
      name: address
    });
  };

  const handlePhotoSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newPhotos = Array.from(files).slice(0, 4 - photos.length); // Max 4 photos
    const newPreviews = newPhotos.map(file => URL.createObjectURL(file));

    setPhotos(prev => [...prev, ...newPhotos]);
    setPhotoPreviews(prev => [...prev, ...newPreviews]);
  };

  const removePhoto = (index: number) => {
    URL.revokeObjectURL(photoPreviews[index]);
    setPhotos(prev => prev.filter((_, i) => i !== index));
    setPhotoPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!text.trim() && photos.length === 0) return;
    if (!selectedLocation) {
      alert('Please select a location');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({
        text: text.trim(),
        photos,
        location: selectedLocation
      });
      // Reset form
      setText('');
      photoPreviews.forEach(url => URL.revokeObjectURL(url));
      setPhotos([]);
      setPhotoPreviews([]);
      setSelectedLocation(null);
      onClose();
    } catch (error) {
      console.error('Failed to create post:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    photoPreviews.forEach(url => URL.revokeObjectURL(url));
    setPhotos([]);
    setPhotoPreviews([]);
    setText('');
    setSelectedLocation(null);
    onClose();
  };

  const isLoading = externalSubmitting || isSubmitting;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-200 dark:border-zinc-700">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            Create Post
          </h2>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-full transition-colors"
          >
            <XIcon className="w-5 h-5 text-zinc-500 dark:text-zinc-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto max-h-[60vh]">
          {/* Text input */}
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="What's on your mind?"
            className="w-full min-h-[120px] p-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500"
          />

          {/* Location Picker - Required Field */}
          <div className="mt-4">
            <label className="block text-sm font-medium mb-2 text-zinc-700 dark:text-zinc-300">
              Location <span className="text-red-500">*</span>
            </label>
            <LocationPicker
              onLocationSelect={handleLocationSelect}
              initialLocation={selectedLocation || (currentLocation ? { lat: currentLocation.lat, lng: currentLocation.lng } : undefined)}
            />
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              Click to select your location on the map
            </p>
          </div>

          {/* Photo previews */}
          {photoPreviews.length > 0 && (
            <div className="grid grid-cols-2 gap-2 mt-4">
              {photoPreviews.map((preview, index) => (
                <div key={index} className="relative aspect-square rounded-lg overflow-hidden">
                  <img
                    src={preview}
                    alt={`Preview ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                  <button
                    onClick={() => removePhoto(index)}
                    className="absolute top-1 right-1 p-1 bg-black/50 hover:bg-black/70 rounded-full transition-colors"
                  >
                    <XIcon className="w-4 h-4 text-white" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Add photo button */}
          {photos.length < 4 && (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 mt-4 px-4 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors text-zinc-700 dark:text-zinc-300"
            >
              <ImageIcon className="w-5 h-5" />
              <span className="text-sm font-medium">Add Photo</span>
            </button>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handlePhotoSelect}
            className="hidden"
          />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-zinc-200 dark:border-zinc-700">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={(!text.trim() && photos.length === 0) || !selectedLocation || isLoading}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-300 dark:disabled:bg-zinc-600 disabled:cursor-not-allowed rounded-lg transition-colors"
          >
            {isLoading ? 'Posting...' : 'Post'}
          </button>
        </div>
      </div>
    </div>
  );
}
