import { useEffect, useRef, useState, useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { useMutation } from '@apollo/client/react';
import { clearSideNavContent } from '../../store';
import { ReviewsList } from '../reviews/ReviewsList';
import { AddReviewModal } from '../reviews/AddReviewModal';
import { Modal } from '../Modal';
import { DELETE_REVIEW_MUTATION } from '../../api/graphql/review/review-queries';
import type { Review } from '../../types/review';
import { useIsMobile } from '../../hooks/useIsMobile';

interface SideNavProps {
  isOpen: boolean;
  onClose: () => void;
  selectedLocation?: {
    name: string;
    lat: number;
    lng: number;
    type: 'store' | 'location';
    description?: string;
    image?: string;
    address?: string;
    phone?: string;
    email?: string;
    hours?: string;
    storeId?: string;
  };
}

type TabType = 'about' | 'reviews';

export function SideNav({ isOpen, onClose, selectedLocation }: SideNavProps) {
  const dispatch = useDispatch();
  const sideNavRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile(768);
  const [activeTab, setActiveTab] = useState<TabType>('about');
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [editingReview, setEditingReview] = useState<Review | null>(null);
  
  // Mobile sheet height state (for draggable bottom sheet)
  const [sheetHeight, setSheetHeight] = useState(50); // Start at 50% height
  const [isDragging, setIsDragging] = useState(false);
  const dragStartY = useRef(0);
  const dragStartHeight = useRef(50);
  
  // Delete confirmation modal state
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; review: Review | null }>({ isOpen: false, review: null });
  
  // Success/Error feedback modal state
  const [feedbackModal, setFeedbackModal] = useState<{ 
    isOpen: boolean; 
    title: string; 
    message: string; 
    type: 'success' | 'error' 
  }>({ isOpen: false, title: '', message: '', type: 'success' });
  
  const showSuccess = (title: string, message: string) => {
    setFeedbackModal({ isOpen: true, title, message, type: 'success' });
  };
  
  const showError = (title: string, message: string) => {
    setFeedbackModal({ isOpen: true, title, message, type: 'error' });
  };
  
  // Store ref to reviews cache actions
  const reviewsCacheRef = useRef<{
    refetchReviews: () => void;
    refetchStats: () => void;
    addReviewToCache: (review: Review) => void;
    removeReviewFromCache: (reviewId: string) => void;
  } | null>(null);
  
  const [deleteReview] = useMutation(DELETE_REVIEW_MUTATION);

  // Handle reviews change - store cache actions
  const handleReviewsChange = useCallback((actions: {
    refetchReviews: () => void;
    refetchStats: () => void;
    addReviewToCache: (review: Review) => void;
    removeReviewFromCache: (reviewId: string) => void;
  }) => {
    reviewsCacheRef.current = actions;
  }, []);

  // Reset to about tab when location changes
  useEffect(() => {
    setActiveTab('about');
  }, [selectedLocation?.storeId]);
  
  // Listen for delete review events
  useEffect(() => {
    const handleDeleteReview = (e: CustomEvent) => {
      const review = e.detail as Review;
      setDeleteModal({ isOpen: true, review });
    };
    
    window.addEventListener('deleteReview', handleDeleteReview as EventListener);
    return () => {
      window.removeEventListener('deleteReview', handleDeleteReview as EventListener);
    };
  }, []);

  const handleAddReview = () => {
    setEditingReview(null);
    setIsReviewModalOpen(true);
  };

  const handleEditReview = (review: Review) => {
    setEditingReview(review);
    setIsReviewModalOpen(true);
  };

  const handleCloseReviewModal = () => {
    setIsReviewModalOpen(false);
    setEditingReview(null);
  };

  const isStore = selectedLocation?.type === 'store';
  const hasStoreId = !!selectedLocation?.storeId;

  useEffect(() => {
    if (!isOpen && selectedLocation) {
      // Clear content after 300ms (animation duration)
      const timer = setTimeout(() => {
        dispatch(clearSideNavContent());
      }, 300);
      
      return () => clearTimeout(timer);
    }
  }, [isOpen, selectedLocation, dispatch]);

  // Handle drag start for mobile sheet
  const handleDragStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!isMobile) return;
    setIsDragging(true);
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    dragStartY.current = clientY;
    dragStartHeight.current = sheetHeight;
  }, [isMobile, sheetHeight]);

  // Handle drag move
  const handleDragMove = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!isDragging || !isMobile) return;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const deltaY = dragStartY.current - clientY;
    const windowHeight = window.innerHeight;
    const newHeightPercent = Math.min(90, Math.max(30, dragStartHeight.current + (deltaY / windowHeight * 100)));
    setSheetHeight(newHeightPercent);
  }, [isDragging, isMobile]);

  // Handle drag end
  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
    // Snap to nearest preset height
    if (sheetHeight < 40) {
      setSheetHeight(30); // Min height
    } else if (sheetHeight > 70) {
      setSheetHeight(90); // Max height
    } else {
      setSheetHeight(50); // Default height
    }
  }, [sheetHeight]);

  // Reset sheet height when opening
  useEffect(() => {
    if (isOpen) {
      setSheetHeight(50);
    }
  }, [isOpen]);

  // Close on backdrop click for mobile
  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  }, [onClose]);

  // Content component to share between desktop and mobile
  const SideNavContent = () => (
    <>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-zinc-200 dark:border-zinc-700">
        <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
          {selectedLocation?.type === 'store' ? 'Store Details' : 'Location Details'}
        </h2>
        <button
          onClick={onClose}
          className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
        >
          <svg className="w-5 h-5 text-zinc-600 dark:text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto h-[calc(100vh-64px)] md:h-[calc(100vh-64px)]">
        {selectedLocation ? (
          <div className="flex flex-col min-h-full">
            {/* Fixed Header Section - Image */}
            <div className="aspect-video bg-zinc-200 dark:bg-zinc-800 overflow-hidden flex-shrink-0">
              {selectedLocation.image ? (
                <img 
                  src={selectedLocation.image} 
                  alt={selectedLocation.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-zinc-500 dark:text-zinc-400">
                  {selectedLocation.type === 'store' ? '🏪' : '📍'}
                  <span className="ml-2">No image available</span>
                </div>
              )}
            </div>

            {/* Title and Tabs Section */}
            <div className="p-4 border-b border-zinc-200 dark:border-zinc-700 sticky top-0 bg-white dark:bg-zinc-900 z-10">
              {/* Title */}
              <h3 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-4">
                {selectedLocation.name}
              </h3>

              {/* Tabs - Only show for stores with storeId */}
              {isStore && hasStoreId ? (
                <div className="flex gap-1 bg-zinc-100 dark:bg-zinc-800 p-1 rounded-lg">
                  <button
                    onClick={() => setActiveTab('about')}
                    className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
                      activeTab === 'about'
                        ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm'
                        : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
                    }`}
                  >
                    About
                  </button>
                  <button
                    onClick={() => setActiveTab('reviews')}
                    className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
                      activeTab === 'reviews'
                        ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm'
                        : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
                    }`}
                  >
                    Reviews
                  </button>
                </div>
              ) : null}
            </div>

            {/* Tab Content */}
            <div className="p-4 space-y-6">
              {activeTab === 'about' && (
                <>
                  {/* Description */}
                  {selectedLocation.description && (
                    <div>
                      <h4 className="font-semibold text-zinc-900 dark:text-zinc-100 mb-2">Description</h4>
                      <p className="text-zinc-600 dark:text-zinc-400">
                        {selectedLocation.description}
                      </p>
                    </div>
                  )}

                  {/* Address */}
                  {selectedLocation.address && (
                    <div>
                      <h4 className="font-semibold text-zinc-900 dark:text-zinc-100 mb-2">Address</h4>
                      <p className="text-zinc-600 dark:text-zinc-400">
                        {selectedLocation.address}
                      </p>
                    </div>
                  )}

                  {/* Contact Info */}
                  <div className="space-y-3">
                    {selectedLocation.phone && (
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center text-sm">
                          📞
                        </div>
                        <div>
                          <p className="font-medium text-zinc-900 dark:text-zinc-100">Phone</p>
                          <p className="text-zinc-600 dark:text-zinc-400">{selectedLocation.phone}</p>
                        </div>
                      </div>
                    )}

                    {selectedLocation.email && (
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center text-sm">
                          📧
                        </div>
                        <div>
                          <p className="font-medium text-zinc-900 dark:text-zinc-100">Email</p>
                          <p className="text-zinc-600 dark:text-zinc-400">{selectedLocation.email}</p>
                        </div>
                      </div>
                    )}

                    {selectedLocation.hours && (
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center text-sm">
                          🕐
                        </div>
                        <div>
                          <p className="font-medium text-zinc-900 dark:text-zinc-100">Hours</p>
                          <p className="text-zinc-600 dark:text-zinc-400">{selectedLocation.hours}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Reviews in About tab for non-store locations */}
                  {!isStore && (
                    <div className="pt-4 border-t border-zinc-200 dark:border-zinc-700">
                      <p className="text-zinc-500 dark:text-zinc-400 text-sm">
                        Reviews are only available for stores.
                      </p>
                    </div>
                  )}
                </>
              )}

              {activeTab === 'reviews' && isStore && hasStoreId && (
                <ReviewsList
                  storeId={selectedLocation.storeId!}
                  onAddReview={handleAddReview}
                  onEditReview={handleEditReview}
                  onReviewsChange={handleReviewsChange}
                />
              )}

              {/* Action Buttons */}
              <div className="space-y-3 pt-4 mt-auto">
                <button className="w-full py-3 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors font-medium">
                  Get Directions
                </button>
                <button className="w-full py-3 border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors font-medium">
                  Share Location
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 px-4">
            <div className="text-zinc-500 dark:text-zinc-400">
              <div className="text-4xl mb-2">📍</div>
              <p>No location selected</p>
              <p className="text-sm mt-1">Click on a store or search result to view details</p>
            </div>
          </div>
        )}
      </div>
    </>
  );

  return (
    <>
      {/* Desktop: Side Navigation - LEFT SIDE with FIXED WIDTH */}
      {!isMobile && (
        <div 
          ref={sideNavRef}
          className="fixed top-0 left-0 h-full w-80 max-w-sm bg-white dark:bg-zinc-900 shadow-2xl z-50"
          style={{
            transform: isOpen ? 'translateX(0)' : 'translateX(-100%)',
            transition: 'transform 0.3s ease-in-out',
            willChange: 'transform'
          }}
        >
          <SideNavContent />
        </div>
      )}

      {/* Mobile: Bottom Sheet */}
      {isMobile && (
        <>
          {/* Backdrop */}
          <div 
            className={`fixed inset-0 bg-black/50 z-40 transition-opacity duration-300 ${
              isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
            onClick={handleBackdropClick}
          />
          
          {/* Bottom Sheet */}
          <div
            ref={sheetRef}
            className={`fixed left-0 right-0 bg-white dark:bg-zinc-900 z-50 rounded-t-2xl shadow-2xl transition-transform duration-300 ease-out ${
              isOpen ? 'translate-y-0' : 'translate-y-full'
            }`}
            style={{
              bottom: 0,
              height: `${sheetHeight}%`,
              maxHeight: '90vh',
              willChange: 'transform',
            }}
            onMouseMove={handleDragMove}
            onMouseUp={handleDragEnd}
            onMouseLeave={handleDragEnd}
            onTouchMove={handleDragMove}
            onTouchEnd={handleDragEnd}
          >
            {/* Drag Handle */}
            <div 
              className="w-full flex justify-center pt-2 pb-1 cursor-grab active:cursor-grabbing"
              onMouseDown={handleDragStart}
              onTouchStart={handleDragStart}
            >
              <div className="w-12 h-1.5 bg-zinc-300 dark:bg-zinc-600 rounded-full" />
            </div>
            
            {/* Sheet Content */}
            <div className="flex flex-col h-[calc(100%-24px)] overflow-hidden">
              <SideNavContent />
            </div>
          </div>
        </>
      )}

      {/* Review Modal */}
      {selectedLocation?.storeId && isReviewModalOpen && (
        <AddReviewModal
          isOpen={isReviewModalOpen}
          onClose={handleCloseReviewModal}
          storeId={selectedLocation.storeId}
          storeName={selectedLocation.name}
          existingReview={editingReview}
          onSuccess={(review?: Review) => {
            // Update cache directly without refetching the list
            if (review && reviewsCacheRef.current) {
              if (editingReview) {
                // For edits, refetch to get updated data
                reviewsCacheRef.current.refetchReviews();
                showSuccess('Review Updated', 'Your review has been updated successfully.');
              } else {
                // For new reviews, add directly to cache
                reviewsCacheRef.current.addReviewToCache(review);
                showSuccess('Review Added', 'Your review has been added successfully.');
              }
              // Always refetch stats to update averages
              reviewsCacheRef.current.refetchStats();
            }
          }}
          onError={(message: string) => showError('Error', message)}
        />
      )}
      
      {/* Delete Review Confirmation Modal */}
      <Modal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, review: null })}
        title="Delete Review"
        message="Are you sure you want to delete this review? This action cannot be undone."
        type="error"
        showCancel
        onConfirm={async () => {
          if (deleteModal.review) {
            try {
              const result = await deleteReview({ variables: { id: deleteModal.review.id } });
              if (result.data?.deleteReview?.success) {
                // Remove from cache directly without refetching the list
                if (reviewsCacheRef.current) {
                  reviewsCacheRef.current.removeReviewFromCache(deleteModal.review.id);
                  // Refetch stats to update averages
                  reviewsCacheRef.current.refetchStats();
                }
                setDeleteModal({ isOpen: false, review: null });
                showSuccess('Review Deleted', 'Your review has been deleted successfully.');
              } else {
                showError('Delete Failed', result.data?.deleteReview?.message || 'Failed to delete review. Please try again.');
              }
            } catch (error) {
              console.error('Failed to delete review:', error);
              setFeedbackModal({ isOpen: true, title: 'Error', message: 'An error occurred while deleting the review. Please try again.', type: 'error' });
            }
          }
        }}
      />

      {/* Success/Error Feedback Modal */}
      <Modal
        isOpen={feedbackModal.isOpen}
        onClose={() => setFeedbackModal(prev => ({ ...prev, isOpen: false }))}
        title={feedbackModal.title}
        message={feedbackModal.message}
        type={feedbackModal.type}
      />
    </>
  );
}
