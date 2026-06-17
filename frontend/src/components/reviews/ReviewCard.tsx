import { useState } from 'react';
import type { Review } from '../../types/review';
import { StarRating } from './StarRating';
import { PhotoGallery } from '../common/PhotoGallery';

interface ReviewCardProps {
  review: Review;
  isMyReview?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
}

export function ReviewCard({ review, isMyReview, onEdit, onDelete }: ReviewCardProps) {
  const [showFullText, setShowFullText] = useState(false);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const shouldTruncate = review.text && review.text.length > 150;
  const displayText = !showFullText && shouldTruncate
    ? review.text?.slice(0, 150) + '...'
    : review.text;

  return (
    <div className={`bg-white dark:bg-zinc-800 rounded-xl p-4 ${isMyReview ? 'border-2 border-secondary' : ''}`}>
      {/* Header - User info and rating */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-row w-full gap-3 flex">

          {review.user?.profilePhoto ? (
            <img
              src={review.user.profilePhoto}
              alt={review.user.name}
              className="w-10 h-10 rounded-full object-cover"
              crossOrigin="anonymous"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-gray-300 dark:bg-gray-700  flex items-center justify-center text-white font-semibold">
              {review.user?.name?.charAt(0).toUpperCase() || '?'}
            </div>
          )}
          <div className="flex flex-col gap-1">
            <p className="font-medium text-zinc-900 dark:text-zinc-100">
              {review.user?.name || 'Anonymous'}
              {isMyReview && (
                <span className="ml-2 text-xs bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-full">
                  You
                </span>
              )}
            </p>

            <div className="flex gap-1 flex-col">
              <StarRating rating={review.rating} size="sm" />
            </div>

          </div>

        </div>

        {/* Edit/Delete actions for my review */}
        {isMyReview && (
          <div className="flex items-center gap-1">
            <button
              onClick={onEdit}
              className="p-1.5 text-zinc-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg transition-colors"
              title="Edit review"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
            <button
              onClick={onDelete}
              className="p-1.5 text-zinc-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
              title="Delete review"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        )}
      </div>

      {/* Review text */}
      {review.text && (
        <div className="mb-1">
          <p className="text-zinc-700 dark:text-zinc-300 text-sm leading-relaxed whitespace-pre-wrap font-semibold">
            {displayText}
          </p>
          {shouldTruncate && (
            <button
              onClick={() => setShowFullText(!showFullText)}
              className="text-xs text-emerald-600 hover:text-emerald-700 mt-1 font-medium"
            >
              {showFullText ? 'Show less' : 'Read more'}
            </button>
          )}
        </div>
      )}

      {/* Photos */}
      {review.photos && review.photos.length > 0 && (
        <div className="mb-1">
          <PhotoGallery photos={review.photos} size="small" />
        </div>
      )}
      <span className="text-xs text-zinc-500 dark:text-zinc-400">
        {formatDate(review.createdAt)}
      </span>
    </div>
  );
}
