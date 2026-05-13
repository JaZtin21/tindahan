import { useEffect, useRef, useState } from 'react';
import { useDispatch } from 'react-redux';
import { useQuery, useMutation } from '@apollo/client/react';
import { clearSideNavContent } from '../../store';
import { ReviewsList } from '../reviews/ReviewsList';
import { AddReviewModal } from '../reviews/AddReviewModal';
import { Modal as CommonModal } from '../common/Modal';
import { Modal } from '../Modal';
import { DELETE_REVIEW_MUTATION } from '../../api/graphql/review/review-queries';
import { CREATE_INQUIRY_MUTATION, USER_INQUIRY_FOR_SHOP_QUERY } from '../../api/graphql/inquiry/inquiry-queries';
import { useAuth } from '../../api/graphql/apolloProviderWithAuth';
import { InquiryConversationModal } from '../inquiry/InquiryConversationModal';
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
  const isMobile = useIsMobile(768);
  const { userInfo } = useAuth();
  
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
  
  // Computed from deleteModal for convenience
  const reviewToDelete = deleteModal.review;
  
  // Desktop ref
  const sideNavRef = useRef<HTMLDivElement>(null);
  
  // Refs for callbacks
  const reviewsActionsRef = useRef<{ refetchReviews: () => void; refetchStats: () => void; addReviewToCache: (r: Review) => void; removeReviewFromCache: (id: string) => void } | null>(null);

  const [deleteReview] = useMutation(DELETE_REVIEW_MUTATION);
  const [createInquiry] = useMutation<{
    createInquiry: {
      success: boolean;
      message: string;
      data?: {
        id: string;
        item: string;
        message: string;
        status: string;
        createdAt: string;
      };
    };
  }>(CREATE_INQUIRY_MUTATION);

  // Tab click handler - lazy load reviews only when clicked
  const handleTabClick = (tab: TabType) => {
    setActiveTab(tab);
    if (tab === 'reviews') {
      setHasOpenedReviews(true); // Mark reviews as opened - this triggers ReviewsList render
    }
  };

  // Review action handlers
  const handleAddReview = () => { setEditingReview(null); setIsReviewModalOpen(true); };
  const handleEditReview = (review: Review) => { setEditingReview(review); setIsReviewModalOpen(true); };
  const handleCloseReviewModal = () => { setIsReviewModalOpen(false); setEditingReview(null); };

  // Inquiry state and handlers
  const [inquiryItem, setInquiryItem] = useState('');
  const [inquiryMessage, setInquiryMessage] = useState('');
  const [isSubmittingInquiry, setIsSubmittingInquiry] = useState(false);
  const [isConversationModalOpen, setIsConversationModalOpen] = useState(false);

  // Check if user has existing inquiry for this shop
  const { data: userInquiryData, refetch: refetchUserInquiry } = useQuery<{
    userInquiryForShop: {
      success: boolean;
      message: string;
      data?: {
        id: string;
        user?: {
          id: string;
          name: string;
          profilePhoto?: string;
        };
        shop?: {
          id: string;
          name: string;
        };
        item: string;
        message: string;
        status: string;
        replies: Array<{
          id: string;
          author?: {
            id: string;
            name: string;
            profilePhoto?: string;
          };
          message: string;
          createdAt: string;
        }>;
        createdAt: string;
        updatedAt?: string;
      };
    };
  }>(USER_INQUIRY_FOR_SHOP_QUERY, {
    variables: { 
      userID: userInfo?.id || '',
      shopID: selectedLocation?.storeId || '' 
    },
    skip: !selectedLocation?.storeId || !userInfo?.id,
    fetchPolicy: 'cache-and-network'
  });

  const existingInquiry = userInquiryData?.userInquiryForShop?.data;

  const handleSubmitInquiry = async () => {
    if (!selectedLocation?.storeId || !inquiryItem.trim() || !inquiryMessage.trim()) return;
    
    setIsSubmittingInquiry(true);
    try {
      const result = await createInquiry({
        variables: {
          input: {
            shopId: selectedLocation.storeId,
            item: inquiryItem.trim(),
            message: inquiryMessage.trim()
          }
        }
      });
      
      if (result.data?.createInquiry?.success) {
        showSuccess('Inquiry Sent', 'Your inquiry has been sent to the shop owner.');
        setInquiryItem('');
        setInquiryMessage('');
        // Refetch user inquiry to update UI
        refetchUserInquiry();
      } else {
        showError('Error', result.data?.createInquiry?.message || 'Failed to send inquiry.');
      }
    } catch (error) {
      showError('Error', 'An error occurred while sending your inquiry.');
    } finally {
      setIsSubmittingInquiry(false);
    }
  };

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

  // Delete review handler - confirms actual deletion
  const handleDeleteReview = async () => {
    if (!reviewToDelete) return;
    try {
      const result = await deleteReview({ variables: { id: reviewToDelete.id } });
      if ((result.data as any)?.deleteReview?.success) {
        reviewsActionsRef.current?.removeReviewFromCache(reviewToDelete.id);
        reviewsActionsRef.current?.refetchStats();
        setDeleteModal({ isOpen: false, review: null });
        showSuccess('Review Deleted', 'Your review has been deleted successfully.');
      } else {
        showError('Delete Failed', (result.data as any)?.deleteReview?.message || 'Failed to delete review.');
      }
    } catch (error) {
      showError('Error', 'An error occurred while deleting review.');
    }
  };

  const isStore = selectedLocation?.type === 'store';
  const hasStoreId = !!selectedLocation?.storeId;

  return (
    <>
      {/* Desktop SideNav */}
      {!isMobile && (
        <div ref={sideNavRef} className="fixed top-0 left-0 h-full w-80 max-w-sm bg-white dark:bg-zinc-900 shadow-2xl z-50" style={{ transform: isOpen ? 'translateX(0)' : 'translateX(-100%)', transition: 'transform 0.3s ease-in-out' }}>
          <SideNavContent 
            selectedLocation={selectedLocation}
            activeTab={activeTab}
            onTabClick={handleTabClick}
            onClose={onClose}
            isStore={isStore}
            hasStoreId={hasStoreId}
            showReviews={activeTab === 'reviews' && hasOpenedReviews}
            onAddReview={handleAddReview}
            onEditReview={handleEditReview}
            onDeleteReview={handleDeleteReviewClick}
            onReviewsChange={handleReviewsChange}
            isMobile={false}
            inquiryItem={inquiryItem}
            setInquiryItem={setInquiryItem}
            inquiryMessage={inquiryMessage}
            setInquiryMessage={setInquiryMessage}
            isSubmittingInquiry={isSubmittingInquiry}
            handleSubmitInquiry={handleSubmitInquiry}
            existingInquiry={existingInquiry}
            setIsConversationModalOpen={setIsConversationModalOpen}
          />
        </div>
      )}

      {/* Mobile Modal */}
      {isMobile && (
        <CommonModal
          isOpen={isOpen}
          onClose={onClose}
          maxWidth="lg"
          mobileBottomSheet
          showCloseButton={true}
          title={selectedLocation?.type === 'store' ? 'Store Details' : 'Location Details'}
        >
          <SideNavContent 
            selectedLocation={selectedLocation}
            activeTab={activeTab}
            onTabClick={handleTabClick}
            onClose={onClose}
            isStore={isStore}
            hasStoreId={hasStoreId}
            showReviews={activeTab === 'reviews' && hasOpenedReviews}
            onAddReview={handleAddReview}
            onEditReview={handleEditReview}
            onDeleteReview={handleDeleteReviewClick}
            onReviewsChange={handleReviewsChange}
            isMobile={true}
            inquiryItem={inquiryItem}
            setInquiryItem={setInquiryItem}
            inquiryMessage={inquiryMessage}
            setInquiryMessage={setInquiryMessage}
            isSubmittingInquiry={isSubmittingInquiry}
            handleSubmitInquiry={handleSubmitInquiry}
            existingInquiry={existingInquiry}
            setIsConversationModalOpen={setIsConversationModalOpen}
          />
        </CommonModal>
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

      {/* Delete Modal */}
      <Modal isOpen={deleteModal.isOpen} onClose={() => setDeleteModal({ isOpen: false, review: null })} title="Delete Review" message="Are you sure you want to delete this review?" type="error" showCancel onConfirm={handleDeleteReview} />

      {/* Feedback Modal */}
      <Modal isOpen={feedbackModal.isOpen} onClose={() => setFeedbackModal(prev => ({ ...prev, isOpen: false }))} title={feedbackModal.title} message={feedbackModal.message} type={feedbackModal.type} />

      {/* Inquiry Conversation Modal */}
      {existingInquiry && (
        <InquiryConversationModal
          isOpen={isConversationModalOpen}
          onClose={() => setIsConversationModalOpen(false)}
          inquiry={existingInquiry}
          currentUserId={userInfo?.id}
        />
      )}
    </>
  );
}

interface SideNavContentProps {
  selectedLocation?: SideNavProps['selectedLocation'];
  activeTab: TabType;
  onTabClick: (tab: TabType) => void;
  onClose: () => void;
  isStore: boolean;
  hasStoreId: boolean;
  showReviews: boolean;
  onAddReview: () => void;
  onEditReview: (review: Review) => void;
  onDeleteReview: (review: Review) => void;
  onReviewsChange: (actions: { refetchReviews: () => void; refetchStats: () => void; addReviewToCache: (r: Review) => void; removeReviewFromCache: (id: string) => void }) => void;
  isMobile?: boolean;
  // Inquiry props
  inquiryItem: string;
  setInquiryItem: (value: string) => void;
  inquiryMessage: string;
  setInquiryMessage: (value: string) => void;
  isSubmittingInquiry: boolean;
  handleSubmitInquiry: () => void;
  existingInquiry?: any;
  setIsConversationModalOpen: (value: boolean) => void;
}

function SideNavContent({ 
  selectedLocation, 
  activeTab, 
  onTabClick, 
  onClose, 
  isStore, 
  hasStoreId, 
  showReviews, 
  onAddReview, 
  onEditReview, 
  onDeleteReview, 
  onReviewsChange, 
  isMobile = false,
  inquiryItem,
  setInquiryItem,
  inquiryMessage,
  setInquiryMessage,
  isSubmittingInquiry,
  handleSubmitInquiry,
  existingInquiry,
  setIsConversationModalOpen
}: SideNavContentProps) {
  return (
    <>
      {!isMobile && (
        <div className="flex items-center justify-between p-4 border-b border-zinc-200 dark:border-zinc-700">
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
            {selectedLocation?.type === 'store' ? 'Store Details' : 'Location Details'}
          </h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
            <svg className="w-5 h-5 text-zinc-600 dark:text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto h-[calc(100vh-64px)] md:h-[calc(100vh-64px)]">
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
                  <button onClick={() => onTabClick('about')} className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${activeTab === 'about' ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm' : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'}`}>About</button>
                  <button onClick={() => onTabClick('reviews')} className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${activeTab === 'reviews' ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm' : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'}`}>Reviews</button>
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
                  
                  {/* Inquiry Section - Only show for stores */}
                  {isStore && selectedLocation.storeId && (
                    <div className="pt-4 border-t border-zinc-200 dark:border-zinc-700">
                      <h4 className="font-semibold text-zinc-900 dark:text-zinc-100 mb-3 flex items-center gap-2">
                        <span className="w-6 h-6 bg-orange-100 dark:bg-orange-900 rounded-full flex items-center justify-center text-sm">💬</span>
                        {existingInquiry ? 'Your Conversation' : 'Send Inquiry'}
                      </h4>
                      
                      {existingInquiry ? (
                        <button
                          onClick={() => setIsConversationModalOpen(true)}
                          className="w-full py-2 px-4 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors"
                        >
                          See Messages
                        </button>
                      ) : (
                        <div className="space-y-3">
                          <div>
                            <label className="block text-sm text-zinc-600 dark:text-zinc-400 mb-1">Item/Product</label>
                            <input
                              type="text"
                              value={inquiryItem}
                              onChange={(e) => setInquiryItem(e.target.value)}
                              placeholder="What item are you asking about?"
                              className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm text-zinc-600 dark:text-zinc-400 mb-1">Message</label>
                            <textarea
                              value={inquiryMessage}
                              onChange={(e) => setInquiryMessage(e.target.value)}
                              placeholder="Your inquiry message..."
                              rows={3}
                              className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                            />
                          </div>
                          <button
                            onClick={handleSubmitInquiry}
                            disabled={!inquiryItem.trim() || !inquiryMessage.trim() || isSubmittingInquiry}
                            className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-400 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
                          >
                            {isSubmittingInquiry ? 'Sending...' : 'Send Inquiry'}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {!isStore && <div className="pt-4 border-t border-zinc-200 dark:border-zinc-700"><p className="text-zinc-500 dark:text-zinc-400 text-sm">Reviews are only available for stores.</p></div>}
                </>
              )}

              {/* LAZY LOADING: Only render ReviewsList when showReviews is true (user clicked Reviews tab) */}
              {showReviews && selectedLocation.storeId && (
                <ReviewsList
                  key={selectedLocation.storeId}
                  storeId={selectedLocation.storeId}
                  onAddReview={onAddReview}
                  onEditReview={onEditReview}
                  onDeleteReview={onDeleteReview}
                  onReviewsChange={onReviewsChange}
                />
              )}

              {/* Action Buttons - Commented out for now
              <div className="space-y-3 pt-4 mt-auto">
                <button className="w-full py-3 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors font-medium">Get Directions</button>
                <button className="w-full py-3 border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors font-medium">Share Location</button>
              </div>
              */}
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
}
