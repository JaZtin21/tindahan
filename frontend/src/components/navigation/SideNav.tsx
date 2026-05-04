import { useEffect, useRef, useState, memo } from 'react';
import { useDispatch } from 'react-redux';
import { useMutation } from '@apollo/client/react';
import { clearSideNavContent } from '../../store';
import { ReviewsList } from '../reviews/ReviewsList';
import { AddReviewModal } from '../reviews/AddReviewModal';
import { Modal } from '../common/Modal';
import { DELETE_REVIEW_MUTATION } from '../../api/graphql/review/review-queries';
import type { Review } from '../../types/review';

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

function SideNavInner({ isOpen, onClose, selectedLocation }: SideNavProps) {
  const dispatch = useDispatch();

  // Tab state - always start on 'about'
  const [activeTab, setActiveTab] = useState<TabType>('about');

  // LAZY LOADING: Track if reviews tab has EVER been opened for current store
  const [hasOpenedReviews, setHasOpenedReviews] = useState(false);

  // Track last store to reset state when store changes
  const lastStoreIdRef = useRef<string | undefined>(undefined);

  // Reset to 'about' tab and clear hasOpenedReviews when switching stores
  if (lastStoreIdRef.current !== selectedLocation?.storeId) {
    lastStoreIdRef.current = selectedLocation?.storeId;
    if (activeTab !== 'about') setActiveTab('about');
    setHasOpenedReviews(false);
  }

  // Modal states
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [editingReview, setEditingReview] = useState<Review | null>(null);
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; review: Review | null }>({ isOpen: false, review: null });
  const [feedbackModal, setFeedbackModal] = useState<{ isOpen: boolean; title: string; message: string; type: 'success' | 'error' }>({ isOpen: false, title: '', message: '', type: 'success' });

  // Refs for callbacks
  const reviewsActionsRef = useRef<{ refetchReviews: () => void; refetchStats: () => void; addReviewToCache: (r: Review) => void; removeReviewFromCache: (id: string) => void } | null>(null);

  const [deleteReview] = useMutation(DELETE_REVIEW_MUTATION);

  // Tab click handler - lazy load reviews only when clicked
  const handleTabClick = (tab: TabType) => {
    setActiveTab(tab);
    if (tab === 'reviews') {
      setHasOpenedReviews(true);
    }
  };

  // Review action handlers
  const handleAddReview = () => { setEditingReview(null); setIsReviewModalOpen(true); };
  const handleEditReview = (review: Review) => { setEditingReview(review); setIsReviewModalOpen(true); };
  const handleCloseReviewModal = () => { setIsReviewModalOpen(false); setEditingReview(null); };

  // Clear content when sidebar closes
  useEffect(() => {
    if (!isOpen && selectedLocation) {
      const timer = setTimeout(() => dispatch(clearSideNavContent()), 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen, selectedLocation, dispatch]);

  // Modal helpers
  const showSuccess = (title: string, message: string) => setFeedbackModal({ isOpen: true, title, message, type: 'success' });
  const showError = (title: string, message: string) => setFeedbackModal({ isOpen: true, title, message, type: 'error' });

  // Store reviews actions from ReviewsList
  const handleReviewsChange = (actions: { refetchReviews: () => void; refetchStats: () => void; addReviewToCache: (r: Review) => void; removeReviewFromCache: (id: string) => void }) => {
    reviewsActionsRef.current = actions;
  };

  // Callback when user clicks delete on a review (opens confirmation modal)
  const handleDeleteReviewClick = (review: Review) => {
    setDeleteModal({ isOpen: true, review });
  };

  // Delete review handler - confirms the actual deletion
  const handleDeleteReview = async () => {
    if (!deleteModal.review) return;
    try {
      const result = await deleteReview({ variables: { id: deleteModal.review.id } });
      if (result.data?.deleteReview?.success) {
        reviewsActionsRef.current?.removeReviewFromCache(deleteModal.review.id);
        reviewsActionsRef.current?.refetchStats();
        setDeleteModal({ isOpen: false, review: null });
        showSuccess('Review Deleted', 'Your review has been deleted successfully.');
      } else {
        showError('Delete Failed', result.data?.deleteReview?.message || 'Failed to delete review.');
      }
    } catch (error) {
      showError('Error', 'An error occurred while deleting the review.');
    }
  };

  const isStore = selectedLocation?.type === 'store';
  const hasStoreId = !!selectedLocation?.storeId;

  return (
    <>
      {/* Main SideNav Modal */}
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        maxWidth="md"
        mobileBottomSheet
        showCloseButton={true}
      >
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between p-4 border-b border-zinc-200 dark:border-zinc-700">
            <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
              {selectedLocation?.type === 'store' ? 'Store Details' : 'Location Details'}
            </h2>
          </div>

          <div className="flex-1 overflow-y-auto">
            {selectedLocation ? (
              <div className="flex flex-col min-h-full">
                <div className="aspect-video bg-zinc-200 dark:bg-zinc-800 overflow-hidden flex-shrink-0">
                  {selectedLocation.image ? (
                    <img src={selectedLocation.image} alt={selectedLocation.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-zinc-500 dark:text-zinc-400">
                      {selectedLocation.type === 'store' ? '🏪' : '📍'}
                      <span className="ml-2">No image available</span>
                    </div>
                  )}
                </div>

                <div className="p-4 border-b border-zinc-200 dark:border-zinc-700 sticky top-0 bg-white dark:bg-zinc-900 z-10">
                  <h3 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-4">{selectedLocation.name}</h3>
                  {isStore && hasStoreId && (
                    <div className="flex gap-1 bg-zinc-100 dark:bg-zinc-800 p-1 rounded-lg">
                      <button onClick={() => handleTabClick('about')} className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${activeTab === 'about' ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm' : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'}`}>About</button>
                      <button onClick={() => handleTabClick('reviews')} className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${activeTab === 'reviews' ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm' : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'}`}>Reviews</button>
                    </div>
                  )}
                </div>

                <div className="p-4 space-y-6">
                  {activeTab === 'about' && (
                    <>
                      {selectedLocation.description && <div><h4 className="font-semibold text-zinc-900 dark:text-zinc-100 mb-2">Description</h4><p className="text-zinc-600 dark:text-zinc-400">{selectedLocation.description}</p></div>}
                      {selectedLocation.address && <div><h4 className="font-semibold text-zinc-900 dark:text-zinc-100 mb-2">Address</h4><p className="text-zinc-600 dark:text-zinc-400">{selectedLocation.address}</p></div>}
                      <div className="space-y-3">
                        {selectedLocation.phone && <div className="flex items-center gap-3"><div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center text-sm">📞</div><div><p className="font-medium text-zinc-900 dark:text-zinc-100">Phone</p><p className="text-zinc-600 dark:text-zinc-400">{selectedLocation.phone}</p></div></div>}
                        {selectedLocation.email && <div className="flex items-center gap-3"><div className="w-8 h-8 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center text-sm">📧</div><div><p className="font-medium text-zinc-900 dark:text-zinc-100">Email</p><p className="text-zinc-600 dark:text-zinc-400">{selectedLocation.email}</p></div></div>}
                        {selectedLocation.hours && <div className="flex items-center gap-3"><div className="w-8 h-8 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center text-sm">🕐</div><div><p className="font-medium text-zinc-900 dark:text-zinc-100">Hours</p><p className="text-zinc-600 dark:text-zinc-400">{selectedLocation.hours}</p></div></div>}
                      </div>
                      {!isStore && <div className="pt-4 border-t border-zinc-200 dark:border-zinc-700"><p className="text-zinc-500 dark:text-zinc-400 text-sm">Reviews are only available for stores.</p></div>}
                    </>
                  )}

                  {hasOpenedReviews && selectedLocation.storeId && (
                    <ReviewsList
                      key={selectedLocation.storeId}
                      storeId={selectedLocation.storeId}
                      onAddReview={handleAddReview}
                      onEditReview={handleEditReview}
                      onDeleteReview={handleDeleteReviewClick}
                      onReviewsChange={handleReviewsChange}
                    />
                  )}
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
        </div>
      </Modal>

      {/* Review Modal */}
      {selectedLocation?.storeId && (
        <AddReviewModal
          isOpen={isReviewModalOpen}
          onClose={handleCloseReviewModal}
          storeId={selectedLocation.storeId}
          storeName={selectedLocation.name}
          existingReview={editingReview}
          onSuccess={(review?: Review) => {
            if (review && reviewsActionsRef.current) {
              if (editingReview) {
                reviewsActionsRef.current.refetchReviews();
                showSuccess('Review Updated', 'Your review has been updated successfully.');
              } else {
                reviewsActionsRef.current.addReviewToCache(review);
                showSuccess('Review Added', 'Your review has been added successfully.');
              }
              reviewsActionsRef.current.refetchStats();
            }
          }}
          onError={(msg: string) => showError('Error', msg)}
        />
      )}

      {/* Delete Confirmation Modal */}
      <Modal isOpen={deleteModal.isOpen} onClose={() => setDeleteModal({ isOpen: false, review: null })} title="Delete Review" maxWidth="sm">
        <div className="space-y-4">
          <p className="text-zinc-600 dark:text-zinc-400">Are you sure you want to delete this review?</p>
          <div className="flex gap-3 justify-end">
            <button onClick={() => setDeleteModal({ isOpen: false, review: null })} className="px-4 py-2 rounded-lg border border-zinc-300 dark:border-zinc-600 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">Cancel</button>
            <button onClick={handleDeleteReview} className="px-4 py-2 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors">Delete</button>
          </div>
        </div>
      </Modal>

      {/* Feedback Modal */}
      <Modal isOpen={feedbackModal.isOpen} onClose={() => setFeedbackModal(prev => ({ ...prev, isOpen: false }))} title={feedbackModal.title} maxWidth="sm">
        <div className="space-y-4">
          <p className="text-zinc-600 dark:text-zinc-400">{feedbackModal.message}</p>
          <div className="flex justify-end">
            <button onClick={() => setFeedbackModal(prev => ({ ...prev, isOpen: false }))} className={`px-4 py-2 rounded-lg text-white transition-colors ${feedbackModal.type === 'success' ? 'bg-green-500 hover:bg-green-600' : 'bg-red-500 hover:bg-red-600'}`}>OK</button>
          </div>
        </div>
      </Modal>
    </>
  );
}

export const SideNav = memo(SideNavInner);
