import { useState, useRef, type ChangeEvent } from 'react';
import { useMutation } from '@apollo/client/react';
import { CREATE_REVIEW_MUTATION, UPDATE_REVIEW_MUTATION } from '../../api/graphql/review/review-queries';
import { StarRating } from './StarRating';
import type { AddReviewModalProps } from '../../types/review';

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

export function AddReviewModal({ isOpen, onClose, storeId, storeName, existingReview, onSuccess }: AddReviewModalProps) {
  const [rating, setRating] = useState(existingReview?.rating || 0);
  const [text, setText] = useState(existingReview?.text || '');
  // Track existing URLs separately from new files
  const [existingPhotos, setExistingPhotos] = useState<string[]>(existingReview?.photos || []);
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [newPreviews, setNewPreviews] = useState<string[]>([]);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isEditing = !!existingReview;

  const [createReview, { loading: creating }] = useMutation(CREATE_REVIEW_MUTATION);
  const [updateReview, { loading: updating }] = useMutation(UPDATE_REVIEW_MUTATION);

  const loading = creating || updating;

  // Combined previews for display
  const allPreviews = [...existingPhotos, ...newPreviews];

  if (!isOpen) return null;

  const handlePhotoSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const remainingSlots = 5 - allPreviews.length;
    if (remainingSlots <= 0) {
      setError('Maximum 5 photos allowed');
      return;
    }

    const filesArray = Array.from(files).slice(0, remainingSlots);
    const previews = filesArray.map(file => URL.createObjectURL(file));

    setNewFiles(prev => [...prev, ...filesArray]);
    setNewPreviews(prev => [...prev, ...previews]);
  };

  const removePhoto = (index: number) => {
    if (index < existingPhotos.length) {
      // Removing an existing photo
      setExistingPhotos(prev => prev.filter((_, i) => i !== index));
    } else {
      // Removing a new file
      const newIndex = index - existingPhotos.length;
      URL.revokeObjectURL(newPreviews[newIndex]);
      setNewFiles(prev => prev.filter((_, i) => i !== newIndex));
      setNewPreviews(prev => prev.filter((_, i) => i !== newIndex));
    }
  };

  const handleSubmit = async () => {
    if (rating === 0) {
      setError('Please select a rating');
      return;
    }

    setError('');

    try {
      if (isEditing && existingReview) {
        await updateReview({
          variables: {
            id: existingReview.id,
            input: {
              rating,
              text: text || undefined,
              photos: existingPhotos,
              newPhotos: newFiles,
            },
          },
        });
      } else {
        await createReview({
          variables: {
            input: {
              storeId,
              rating,
              text: text || undefined,
              photos: newFiles,
            },
          },
        });
      }

      onSuccess();
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit review');
    }
  };

  const handleClose = () => {
    // Revoke only new file blob URLs
    newPreviews.forEach(url => URL.revokeObjectURL(url));
    setRating(0);
    setText('');
    setExistingPhotos([]);
    setNewFiles([]);
    setNewPreviews([]);
    setError('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose} />

      {/* Modal */}
      <div className="relative bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-zinc-100 dark:border-zinc-800">
          <div>
            <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
              {isEditing ? 'Edit Your Review' : 'Write a Review'}
            </h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">for {storeName}</p>
          </div>
          <button
            onClick={handleClose}
            className="p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <XIcon className="w-5 h-5 text-zinc-500 dark:text-zinc-400" />
          </button>
        </div>

        {/* Form */}
        <div className="p-6 space-y-5">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Rating */}
          <div className="text-center">
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              How would you rate this store?
            </label>
            <div className="flex justify-center">
              <StarRating
                rating={rating}
                size="lg"
                interactive
                onRatingChange={setRating}
              />
            </div>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
              {rating === 0 && 'Tap a star to rate'}
              {rating === 1 && 'Terrible'}
              {rating === 2 && 'Bad'}
              {rating === 3 && 'Okay'}
              {rating === 4 && 'Good'}
              {rating === 5 && 'Excellent'}
            </p>
          </div>

          {/* Review Text */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              Your Review (optional)
            </label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Share your experience with this store..."
              rows={4}
              maxLength={2000}
              className="w-full px-4 py-3 bg-zinc-100 dark:bg-zinc-800 border-0 rounded-lg text-zinc-900 dark:text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
            />
            <p className="text-xs text-zinc-400 mt-1 text-right">{text.length}/2000</p>
          </div>

          {/* Photos */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              Add Photos (optional)
            </label>
            
            {/* Photo Gallery */}
            {allPreviews.length > 0 && (
              <div className="mb-3">
                <div className="flex flex-wrap gap-2">
                  {allPreviews.map((photo, index) => (
                    <div key={index} className="relative">
                      <img
                        src={photo}
                        alt={`Review photo ${index + 1}`}
                        className="w-20 h-20 object-cover rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={() => removePhoto(index)}
                        className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-600"
                      >
                        <XIcon className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Upload Button */}
            <label className="flex items-center justify-center gap-2 w-full py-3 px-4 border-2 border-dashed border-zinc-300 dark:border-zinc-600 rounded-lg cursor-pointer hover:border-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handlePhotoSelect}
                disabled={loading || allPreviews.length >= 5}
                className="hidden"
              />
              {loading ? (
                <>
                  <svg className="w-5 h-5 animate-spin text-emerald-600" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span className="text-emerald-600 font-medium">Submitting...</span>
                </>
              ) : (
                <>
                  <ImageIcon className="w-5 h-5 text-zinc-500" />
                  <span className="text-zinc-600 dark:text-zinc-400 font-medium">Add Photos</span>
                </>
              )}
            </label>
            <p className="text-xs text-zinc-400 mt-1">Max 5 photos, 5MB each</p>
          </div>

          {/* Submit Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 py-2.5 px-4 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-medium rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading || rating === 0}
              className="flex-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-zinc-400 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
            >
              {loading ? 'Submitting...' : isEditing ? 'Update Review' : 'Post Review'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
