import { useState } from 'react';
import { useQuery } from '@apollo/client/react';
import type { Review, ReviewStats } from '../../types/review';
import { REVIEWS_BY_STORE_QUERY, REVIEW_STATS_QUERY } from '../../api/graphql/review/review-queries';
import { StarRating } from './StarRating';
import { ReviewCard } from './ReviewCard';
import { useAuth } from '../../api/graphql/apolloProviderWithAuth';
import { useSelector } from 'react-redux';
import type { RootState } from '../../store';

interface ReviewsListProps {
  storeId: string;
  onAddReview: () => void;
  onEditReview: (review: Review) => void;
}

export function ReviewsList({ storeId, onAddReview, onEditReview }: ReviewsListProps) {
  const { isAuthenticated, user } = useAuth();
  const currentUser = useSelector((state: RootState) => state.user);
  const [page, setPage] = useState(1);
  const limit = 5;

  // Fetch reviews
  const { data: reviewsData, loading: reviewsLoading } = useQuery(REVIEWS_BY_STORE_QUERY, {
    variables: { storeId, page, limit },
    skip: !storeId,
    fetchPolicy: 'network-only',
  });

  // Fetch review stats
  const { data: statsData } = useQuery(REVIEW_STATS_QUERY, {
    variables: { storeId },
    skip: !storeId,
    fetchPolicy: 'network-only',
  });

  const reviews: Review[] = reviewsData?.reviewsByStore?.data || [];
  const stats: ReviewStats | null = statsData?.reviewStats || null;
  const hasMore = reviewsData?.reviewsByStore?.hasMore || false;
  const total = reviewsData?.reviewsByStore?.total || 0;

  // Check if user has already reviewed
  const myReview = reviews.find(r => r.userId === currentUser?.id);
  const hasReviewed = !!myReview;

  const handleLoadMore = () => {
    setPage(prev => prev + 1);
  };

  const renderRatingBar = (count: number, total: number, label: string) => {
    const percentage = total > 0 ? (count / total) * 100 : 0;
    return (
      <div className="flex items-center gap-2 text-sm">
        <span className="w-8 text-zinc-500 dark:text-zinc-400">{label}</span>
        <div className="flex-1 h-2 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-yellow-400 rounded-full"
            style={{ width: `${percentage}%` }}
          />
        </div>
        <span className="w-8 text-right text-zinc-600 dark:text-zinc-400">{count}</span>
      </div>
    );
  };

  if (reviewsLoading && page === 1) {
    return (
      <div className="p-4">
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-zinc-200 dark:bg-zinc-700 rounded w-1/3" />
          <div className="h-20 bg-zinc-200 dark:bg-zinc-700 rounded" />
          <div className="h-20 bg-zinc-200 dark:bg-zinc-700 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with overall rating */}
      <div className="bg-gradient-to-r from-emerald-50 to-blue-50 dark:from-emerald-900/20 dark:to-blue-900/20 rounded-xl p-4">
        <div className="flex items-center gap-4">
          <div className="text-center">
            <p className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">
              {stats?.averageRating?.toFixed(1) || '0.0'}
            </p>
            <StarRating rating={Math.round(stats?.averageRating || 0)} size="sm" />
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              {stats?.totalReviews || 0} reviews
            </p>
          </div>

          {/* Rating distribution bars */}
          {stats && stats.totalReviews > 0 && (
            <div className="flex-1 space-y-1">
              {renderRatingBar(stats.fiveStars, stats.totalReviews, '5 ★')}
              {renderRatingBar(stats.fourStars, stats.totalReviews, '4 ★')}
              {renderRatingBar(stats.threeStars, stats.totalReviews, '3 ★')}
              {renderRatingBar(stats.twoStars, stats.totalReviews, '2 ★')}
              {renderRatingBar(stats.oneStar, stats.totalReviews, '1 ★')}
            </div>
          )}
        </div>
      </div>

      {/* Add Review Button */}
      {isAuthenticated && (
        <div className="flex gap-2">
          {hasReviewed ? (
            <button
              onClick={() => myReview && onEditReview(myReview)}
              className="flex-1 py-2.5 px-4 bg-emerald-100 dark:bg-emerald-900/30 hover:bg-emerald-200 dark:hover:bg-emerald-900/50 text-emerald-700 dark:text-emerald-400 font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Edit Your Review
            </button>
          ) : (
            <button
              onClick={onAddReview}
              className="flex-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Write a Review
            </button>
          )}
        </div>
      )}

      {/* Reviews List */}
      <div className="space-y-3">
        {reviews.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-zinc-500 dark:text-zinc-400 mb-2">No reviews yet</p>
            <p className="text-sm text-zinc-400 dark:text-zinc-500">
              Be the first to review this store!
            </p>
          </div>
        ) : (
          <>
            {reviews.map((review) => (
              <ReviewCard
                key={review.id}
                review={review}
                isMyReview={review.userId === currentUser?.id}
                onEdit={() => onEditReview(review)}
                onDelete={() => {
                  window.dispatchEvent(new CustomEvent('deleteReview', { detail: review }));
                }}
              />
            ))}

            {/* Load More */}
            {hasMore && (
              <button
                onClick={handleLoadMore}
                className="w-full py-2 text-sm text-emerald-600 dark:text-emerald-400 font-medium hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg transition-colors"
              >
                Load more reviews
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
