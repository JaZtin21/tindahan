import { useState, useRef, useEffect, type ChangeEvent } from 'react';
import { useMutation } from '@apollo/client/react';
import { UPDATE_POST_MUTATION } from '../../api/graphql/post/post-queries';
import { Modal } from '../common/Modal';
import type { Post } from '../../types/post';
import { POST_TYPES } from '../../types/post';

interface EditPostModalProps {
  isOpen: boolean;
  onClose: () => void;
  post: Post | null;
  onSuccess?: (updatedPost?: Post) => void;
  onError?: (message: string) => void;
}

// Inline SVG icons
const ImageIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
);

const XIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

export function EditPostModal({ isOpen, onClose, post, onSuccess, onError }: EditPostModalProps) {
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [types, setTypes] = useState<string[]>([]);
  const [existingPhotos, setExistingPhotos] = useState<string[]>([]);
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [newPreviews, setNewPreviews] = useState<string[]>([]);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [updatePost, { loading }] = useMutation(UPDATE_POST_MUTATION);

  // Update state when post changes or modal opens
  useEffect(() => {
    if (post && isOpen) {
      setTitle(post.title || '');
      setText(post.text || '');
      setTypes(post.types || []);
      setExistingPhotos(post.photos || []);
      setNewFiles([]);
      setNewPreviews([]);
      setError('');
    }
  }, [post, isOpen]);

  // Combined previews for display
  const allPreviews = [...existingPhotos, ...newPreviews];

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
    setError('');

    try {
      const result = await updatePost({
        variables: {
          id: post.id,
          input: {
            title: title || undefined,
            text: text || undefined,
            types: types.length > 0 ? types : undefined,
            photos: existingPhotos,
            newPhotos: newFiles,
          },
        },
      });

      // Get updated post data from mutation result
      const updatedPost = result.data?.updatePost?.data;
      onSuccess?.(updatedPost);
      handleClose();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update post';
      setError(errorMessage);
      onError?.(errorMessage);
    }
  };

  const handleClose = () => {
    // Revoke only new file blob URLs
    newPreviews.forEach(url => URL.revokeObjectURL(url));
    setTitle('');
    setText('');
    setTypes([]);
    setExistingPhotos([]);
    setNewFiles([]);
    setNewPreviews([]);
    setError('');
    onClose();
  };

  const toggleType = (type: string) => {
    setTypes(prev => 
      prev.includes(type) 
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Edit Post"
      mobileBottomSheet
      maxWidth="md"
    >
      <div className="space-y-5">
        {/* Error */}
        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
            Title
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter post title..."
            className="w-full px-4 py-3 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            maxLength={200}
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
            Description
          </label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="What's on your mind?"
            rows={4}
            className="w-full px-4 py-3 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
            maxLength={2000}
          />
          <p className="text-xs text-zinc-400 mt-1 text-right">{text.length}/2000</p>
        </div>

        {/* Post Types */}
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
            Post Type
          </label>
          <div className="flex flex-wrap gap-2">
            {POST_TYPES.map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => toggleType(type)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  types.includes(type)
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300'
                    : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        {/* Photos */}
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
            Photos
          </label>
          
          {/* Photo Gallery */}
          {allPreviews.length > 0 && (
            <div className="mb-3">
              <div className="flex flex-wrap gap-2">
                {allPreviews.map((photo, index) => (
                  <div key={index} className="relative">
                    <img
                      src={photo}
                      alt={`Photo ${index + 1}`}
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
                <span className="text-emerald-600 font-medium">Updating...</span>
              </>
            ) : (
              <>
                <ImageIcon className="w-5 h-5 text-zinc-500" />
                <span className="text-zinc-600 dark:text-zinc-400 font-medium">Add Photos</span>
              </>
            )}
          </label>
          <p className="text-xs text-zinc-400 mt-1">
            {allPreviews.length}/5 photos. Click photos to remove.
          </p>
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
            disabled={loading}
            className="flex-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-zinc-400 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
          >
            {loading ? 'Updating...' : 'Update Post'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
