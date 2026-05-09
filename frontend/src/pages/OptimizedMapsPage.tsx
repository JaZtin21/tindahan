import { useState, useRef, useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { MapContainer } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { useSubscription, useMutation, useQuery } from '@apollo/client/react';
import { CachedTileLayer, MapMarkers as MapMarkersComponent, getMapMarkerStyles } from '../components/Map';
import { LIVE_POSTS_SUBSCRIPTION } from '../api/graphql/subscriptions/live-posts';
import { DELETE_POST_MUTATION } from '../api/graphql/post/post-queries';
import { SHOPS_BY_PRODUCT_QUERY } from '../api/graphql/shop/shop-queries';
import { useCreatePost } from '../api/graphql/post/usePost';
import { useAuth } from '../api/graphql/apolloProviderWithAuth';
import type { Post } from '../types/post';
import { PostPreviewModal } from '../components/posts/PostPreviewModal';
import { CreatePostModal } from '../components/posts/CreatePostModal';
import { EditPostModal } from '../components/posts/EditPostModal';
import { Modal } from '../components/Modal';
import { createPostHandlers } from '../utils/maps/handlers';
import { openSideNav, openPostPreview, closePostPreview } from '../store';
import { MdMyLocation } from 'react-icons/md';
import { SearchBar } from '../components/Map/SearchBar';

export function OptimizedMapsPage() {
  const dispatch = useDispatch();
  const mapRef = useRef<any>(null);
  // ... rest of the code remains the same ...
  const { isAuthenticated } = useAuth();
  const { isOpen: isPostPreviewOpen } = useSelector((state: any) => state.postPreview);
  
  // Handle getting current location
  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      showError('Location Error', 'Geolocation is not supported by your browser.');
      return;
    }

    console.log('fewq')
    
    setIsGettingLocation(true);
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setUserLocation({ lat: latitude, lng: longitude });
        setShowLocationMarker(true); // Show the marker
        
        // Center map on user's location with animation
        if (mapRef.current) {
          mapRef.current.flyTo([latitude, longitude], 18, {
            duration: 1.5 // 1.5 seconds animation
          });
        }
        
        setIsGettingLocation(false);
      },
      (error) => {
        console.error('Error getting location:', error);
        setIsGettingLocation(false);
        
        let errorMessage = 'Unable to get your current location.';
        switch(error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Location access denied. Please enable location permissions.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Location information is unavailable.';
            break;
          case error.TIMEOUT:
            errorMessage = 'Location request timed out.';
            break;
        }
        
        showError('Location Error', errorMessage);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000 // 5 minutes
      }
    );
  };
  
  
  // Create Post Modal state
  const [isCreatePostModalOpen, setIsCreatePostModalOpen] = useState(false);
  
  // Edit Post Modal state
  const [postToEdit, setPostToEdit] = useState<Post | null>(null);
  const [isEditPostModalOpen, setIsEditPostModalOpen] = useState(false);
  
  // Delete confirmation modal state
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; post: Post | null }>({ isOpen: false, post: null });
  
  // Post preview modal state
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  
  // Success/Error feedback modal state
  const [feedbackModal, setFeedbackModal] = useState<{ 
    isOpen: boolean; 
    title: string; 
    message: string; 
    type: 'success' | 'error' 
  }>({ isOpen: false, title: '', message: '', type: 'success' });
  
  // Track deleted post IDs to filter from map
  const [deletedPostIds, setDeletedPostIds] = useState<Set<string>>(new Set());
  
  // Track recently edited post IDs to skip animation on update
  const [editedPostIds, setEditedPostIds] = useState<Set<string>>(new Set());
  
  // User location state
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [showLocationMarker, setShowLocationMarker] = useState(false);
  
  // Store/Product search states
  const [filteredStores, setFilteredStores] = useState<any[]>([]);
  const [productSearchStores, setProductSearchStores] = useState<any[]>([]);
  const [productNameForSearch, setProductNameForSearch] = useState<string | null>(null);
  const [selectedStore, setSelectedStore] = useState<any | null>(null);
  
  // Search marker visibility states
  const [showStoreMarker, setShowStoreMarker] = useState(false);
  const [showLocationPinMarker, setShowLocationPinMarker] = useState(false);
  const [showProductStoreMarkers, setShowProductStoreMarkers] = useState(false);
  
  // Search result marker data
  const [storeMarkerData, setStoreMarkerData] = useState<any | null>(null);
  const [locationPinData, setLocationPinData] = useState<any | null>(null);
  
  // User Location Marker Management
  const locationMarkerRef = useRef<any>(null);
  
  const showSuccess = (title: string, message: string) => {
    setFeedbackModal({ isOpen: true, title, message, type: 'success' });
  };
  
  const showError = (title: string, message: string) => {
    setFeedbackModal({ isOpen: true, title, message, type: 'error' });
  };
  
  // Handle user location marker
  useEffect(() => {
    if (!mapRef.current || !userLocation || !showLocationMarker) {
      // Remove marker if conditions aren't met
      if (locationMarkerRef.current && mapRef.current) {
        mapRef.current.removeLayer(locationMarkerRef.current);
        locationMarkerRef.current = null;
      }
      return;
    }
    
    const init = async () => {
      const L = await import('leaflet');
      const map = mapRef.current;
      
      if (!map) return;
      
      // Remove existing marker if any (prevent duplicates)
      if (locationMarkerRef.current) {
        map.removeLayer(locationMarkerRef.current);
        locationMarkerRef.current = null;
      }
      
      // Create custom pin icon for user location
      const icon = L.divIcon({
        html: `
          <div class="user-location-marker" style="width: 40px; height: 40px; position: relative; display: flex; align-items: center; justify-content: center;">
            <div class="user-location-pulse" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 40px; height: 40px; background: rgba(239, 68, 68, 0.3); border: 2px solid rgba(239, 68, 68, 0.5); border-radius: 50%; animation: pulse-ring 2s ease-out infinite;"></div>
            <div class="user-location-pin" style="position: relative; z-index: 2; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3)); animation: location-bounce 2s ease-in-out infinite;">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="#EF4444" stroke="none" style="display: block;">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                <circle cx="12" cy="10" r="3" fill="white"/>
              </svg>
            </div>
          </div>
        `,
        className: 'user-location-icon',
        iconSize: [40, 40],
        iconAnchor: [20, 20], // Center the 40x40 box
        popupAnchor: [0, -20]
      });
      
      const marker = L.marker([userLocation.lat, userLocation.lng], { icon });
      
      // Set marker options to prevent it from moving during zoom
      marker.options.zIndexOffset = 1000;
      marker.options.riseOnHover = false;
      marker.options.bubblingMouseEvents = false;
      marker.bindPopup('<div style="font-family: system-ui; font-size: 14px; font-weight: 600;">Your Location</div>');
      marker.addTo(map);
      locationMarkerRef.current = marker;
    };
    
    init();
    
    return () => {
      if (locationMarkerRef.current && mapRef.current) {
        mapRef.current.removeLayer(locationMarkerRef.current);
        locationMarkerRef.current = null;
      }
    };
  }, [userLocation, showLocationMarker]); // Remove map from dependencies
  
  // GraphQL mutations
  const [createPost, { loading: isCreatingPost }] = useCreatePost();
  const [deletePost] = useMutation(DELETE_POST_MUTATION);
  
  // Query to get shops by product name
  const { refetch: refetchShopsByProduct } = useQuery(SHOPS_BY_PRODUCT_QUERY, {
    variables: { productName: productNameForSearch },
    skip: !productNameForSearch
  });
  
  // Create post handler using factory function
  const { handleCreatePost } = createPostHandlers({ createPost, showSuccess, showError });
  
  // Handle store selection from search (from API - shop marker)
  const handleStoreSelect = (store: { lat: number; lng: number; name: string; id?: string; description?: string; location?: string; coverPhoto?: string; businessType?: string; phone?: string; hours?: string }) => {
    console.log('[Search] Selected store:', store);
    // Only hide product store markers, keep location pin
    setShowProductStoreMarkers(false);
    setProductSearchStores([]);
    
    // Center map on store
    if (mapRef.current) {
      mapRef.current.flyTo([store.lat, store.lng], 18, { duration: 1.5 });
    }
    
    // Set store marker data and show it
    setStoreMarkerData(store);
    setShowStoreMarker(true);
    setSelectedStore(store);
    
    // Open sidebar with store info
    dispatch(openSideNav({
      name: store.name,
      lat: store.lat,
      lng: store.lng,
      type: 'store',
      description: store.description,
      address: store.location || 'Address not available',
      image: store.coverPhoto,
      phone: store.phone,
      storeId: store.id
    }));
  };
  
  // Handle store click from marker (for both single store and product stores)
  const handleStoreMarkerClick = (store: any) => {
    console.log('[Marker] Store clicked:', store);
    
    // Open sidebar with store info
    dispatch(openSideNav({
      name: store.name || store.title,
      lat: store.lat,
      lng: store.lng,
      type: 'store',
      description: store.description,
      address: store.location || 'Address not available',
      image: store.coverPhoto,
      phone: store.phone,
      storeId: store.id
    }));
  };
  
  // Handle location selection from search (from geocoding - pin marker)
  const handleLocationSelect = (location: { lat: number; lng: number; name: string; details?: string }) => {
    console.log('[Search] Selected location:', location);
    // Location pin is independent - don't hide shop or product markers
    // Just add the location pin marker
    
    // Center map on location
    if (mapRef.current) {
      mapRef.current.flyTo([location.lat, location.lng], 18, { duration: 1.5 });
    }
    
    // Set location pin data and show it
    setLocationPinData(location);
    setShowLocationPinMarker(true);
  };
  
  // Handle product selection from search
  const handleProductSelect = async (productName: string) => {
    console.log('[Search] Selected product:', productName);
    setProductNameForSearch(productName);
    
    // Fetch stores that have this product
    const result = await refetchShopsByProduct({ productName }) as { data?: { shopsByProduct?: { data: any[] } } };
    const shops = result.data?.shopsByProduct?.data || [];
    
    // Convert shops to marker format
    const storeMarkers = shops.map((shop: any) => ({
      id: shop.id,
      lat: shop.coordinates?.lat || 0,
      lng: shop.coordinates?.lng || 0,
      title: shop.name,
      description: shop.description,
      phone: shop.contactDetails?.phone,
      hours: shop.businessHours ? `${shop.businessHours.openTime} - ${shop.businessHours.closeTime}` : undefined,
      coverPhoto: shop.coverPhoto,
      businessType: shop.businessType,
      location: shop.contactDetails?.address || shop.location,
    })).filter((s: any) => s.lat && s.lng);
    
    setProductSearchStores(storeMarkers);
    setFilteredStores(storeMarkers);
    
    // Only hide single store marker, keep location pin
    setShowStoreMarker(false);
    setStoreMarkerData(null);
    setShowProductStoreMarkers(true);
    
    // Zoom out to fit all stores using fitBounds
    if (mapRef.current && storeMarkers.length > 0) {
      const bounds = storeMarkers.map(s => [s.lat, s.lng]);
      mapRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 15, duration: 1.5 });
    }
    
    // Show success message with store count
    showSuccess('Product Search', `Found ${storeMarkers.length} stores with "${productName}"`);
  };
  
  // Clear product search stores
  const clearProductStores = () => {
    setProductSearchStores([]);
    setFilteredStores([]);
    setProductNameForSearch(null);
    setShowProductStoreMarkers(false);
  };
  
  // Clear all search markers
  const clearAllSearchMarkers = () => {
    setShowStoreMarker(false);
    setShowLocationPinMarker(false);
    setShowProductStoreMarkers(false);
    setStoreMarkerData(null);
    setLocationPinData(null);
    setProductSearchStores([]);
    setFilteredStores([]);
  };
  
  // Handle actual delete post execution
  const executeDeletePost = async () => {
    if (!deleteModal.post) return;
    
    try {
      const result = await deletePost({ variables: { id: deleteModal.post.id } }) as { data?: { deletePost?: { success: boolean; message?: string } } };
      if (result.data?.deletePost?.success) {
        setDeletedPostIds(prev => new Set(prev).add(deleteModal.post!.id));
        setDeleteModal({ isOpen: false, post: null });
        dispatch(closePostPreview());
        setSelectedPost(null);
        showSuccess('Post Deleted', 'Your post has been deleted successfully.');
      } else {
        showError('Delete Failed', result.data?.deletePost?.message || 'Failed to delete post. Please try again.');
      }
    } catch (error) {
      console.error('Error deleting post:', error);
      showError('Error', 'An error occurred while deleting the post. Please try again.');
    }
  };

  // Inject map marker styles
  useEffect(() => {
    const styleEl = document.createElement('style');
    styleEl.textContent = getMapMarkerStyles();
    styleEl.id = 'optimized-map-marker-styles';
    document.head.appendChild(styleEl);
    
    return () => {
      const existing = document.getElementById('optimized-map-marker-styles');
      if (existing && document.head.contains(existing)) {
        document.head.removeChild(existing);
      }
    };
  }, []);

  // Live posts subscription - only subscribe if authenticated
  const { data: livePostsData } = useSubscription<{ livePosts: Post[] }>(
    LIVE_POSTS_SUBSCRIPTION,
    { skip: !isAuthenticated }
  );

  // Store live posts in state
  const [livePosts, setLivePosts] = useState<Post[]>([]);
  
  // Handle WebSocket updates - merge new data instead of replacing
  useEffect(() => {
    const newPosts = livePostsData?.livePosts;
    if (!newPosts || !Array.isArray(newPosts)) return;
    
    console.log('[WebSocket] Received posts:', newPosts.length, newPosts.map(p => p.id));
    
    setLivePosts(prevPosts => {
      console.log('[WebSocket] Previous posts:', prevPosts.length, prevPosts.map(p => p.id));
      
      const prevMap = new Map(prevPosts.map(p => [p.id, p]));
      const newMap = new Map(newPosts.map(p => [p.id, p]));
      
      const merged: Post[] = [];
      const handledIds = new Set<string>();
      const newlyEditedIds = new Set<string>();
      
      // Process all new/updated posts
      for (const [id, newPost] of newMap) {
        const oldPost = prevMap.get(id);
        if (!oldPost) {
          console.log('[WebSocket] New post added:', id);
          merged.push(newPost);
        } else if (JSON.stringify(oldPost) !== JSON.stringify(newPost)) {
          console.log('[WebSocket] Post updated:', id);
          merged.push(newPost);
          newlyEditedIds.add(id); // Track as edited
        } else {
          merged.push(oldPost); // No change, keep old reference
        }
        handledIds.add(id);
      }
      
      // Remove posts that are no longer in the live posts list (deleted)
      for (const [id, oldPost] of prevMap) {
        if (!handledIds.has(id)) {
          console.log('[WebSocket] Post deleted/removed:', id);
          // Don't add to merged - effectively removing it
        }
      }
      
      // Update edited post IDs state (for animation control)
      if (newlyEditedIds.size > 0) {
        setEditedPostIds(prev => new Set([...prev, ...newlyEditedIds]));
        // Clear edited IDs after animation duration (350ms)
        setTimeout(() => {
          setEditedPostIds(prev => {
            const next = new Set(prev);
            newlyEditedIds.forEach(id => next.delete(id));
            return next;
          });
        }, 350);
      }
      
      console.log('[OptimizedMapsPage] Live posts total:', merged.length, merged.map(p => p.id));
      return merged;
    });
  }, [livePostsData]);

  // Handle post click
  const handlePostClick = useCallback((post: Post) => {
    console.log('[OptimizedMapsPage] Post clicked:', post.id);
    console.log('[OptimizedMapsPage] Setting selectedPost:', post);
    console.log('[OptimizedMapsPage] Setting isPostPreviewOpen to true');
    setSelectedPost(post);
    dispatch(openPostPreview(post.id));
  }, [dispatch]);

  // Handle post preview modal close
  const handleClosePostPreview = useCallback(() => {
    dispatch(closePostPreview());
    // Delay clearing selectedPost to allow close animation to complete
    setTimeout(() => setSelectedPost(null), 300);
  }, [dispatch]);

  // Handle edit post
  const handleEditPost = useCallback((post: Post) => {
    setPostToEdit(post);
    setIsEditPostModalOpen(true);
    dispatch(closePostPreview());
  }, [dispatch]);

  // Handle delete post - opens confirmation modal
  const handleDeletePost = useCallback((post: Post) => {
    setDeleteModal({ isOpen: true, post });
  }, []);

  return (
    <div className="w-full h-screen relative">
      {/* Map info */}


      {/* Search Bar - Fixed at top */}
      <div className="absolute top-22 left-0 right-0 z-49 px-4">
        <SearchBar
          onSearch={(query) => console.log('[Search] Query:', query)}
          onStoreSelect={(item: any) => {
            // Check if it's from geocoding (location) or API (store)
            if (item.source === 'geocoding' || (!item.id && !item.businessType)) {
              // It's a location from geocoding
              handleLocationSelect({
                lat: item.lat,
                lng: item.lng,
                name: item.name,
                details: item.location || item.description
              });
            } else {
              // It's a store from API
              handleStoreSelect(item);
            }
          }}
          onProductSelect={handleProductSelect}
          onClearProductStores={clearProductStores}
          placeholder="Search for stores or products near you..."
        />
      </div>

      {/* Map container - use ref to get map instance, avoid controlled props */}
      <MapContainer
        center={[14.5995, 120.9842]}
        zoom={12}
        className="w-full h-full"
        preferCanvas={true}
        zoomControl={false}
        ref={mapRef}
      >
        {/* Custom cached tile layer - CartoDB Voyager (clean styling, free) */}
        <CachedTileLayer
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          maxZoom={19}
        />
        {/* All markers - isolated in MapMarkers component to prevent page re-renders */}
        <MapMarkersComponent
          livePosts={livePosts}
          deletedPostIds={deletedPostIds}
          editedPostIds={editedPostIds}
          onPostClick={handlePostClick}
          showStoreMarker={showStoreMarker}
          storeMarkerData={storeMarkerData}
          onStoreMarkerClick={handleStoreMarkerClick}
          showLocationPinMarker={showLocationPinMarker}
          locationPinData={locationPinData}
          showProductStoreMarkers={showProductStoreMarkers}
          productSearchStores={productSearchStores}
          userLocation={userLocation}
          showUserLocationMarker={showLocationMarker}
        />
      </MapContainer>
      
      {/* Button Container - Fixed to bottom right, aligned to end */}
      <div className="fixed bottom-4 right-4 z-40 flex flex-col items-end gap-2">
        {/* Location Target Button */}
        <button
          onClick={handleGetCurrentLocation}
          disabled={isGettingLocation}
          className={`w-12 h-12 rounded-full shadow-xl transition-all flex items-center justify-center ${
            isGettingLocation 
              ? 'bg-blue-600 text-white animate-pulse' 
              : 'bg-white hover:bg-gray-100 text-gray-700'
          }`}
          title={isGettingLocation ? 'Getting location...' : 'Get my current location'}
        >
          {isGettingLocation ? (
            <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          ) : (
            <MdMyLocation className="w-6 h-6" />
          )}
        </button>
        
        {/* Add Post Button */}
        <button
          onClick={() => setIsCreatePostModalOpen(true)}
          className="flex items-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-xl transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span className="font-medium">Add Post</span>
        </button>
      </div>

      {/* Post Preview Modal - always render, Modal handles visibility */}
      <PostPreviewModal
        post={selectedPost}
        isOpen={isPostPreviewOpen}
        onClose={handleClosePostPreview}
        onEdit={handleEditPost}
        onDelete={handleDeletePost}
      />
      
      {/* Create Post Modal - always render, Modal handles visibility */}
      <CreatePostModal
        isOpen={isCreatePostModalOpen}
        onClose={() => setIsCreatePostModalOpen(false)}
        onSubmit={handleCreatePost}
        isSubmitting={isCreatingPost}
        currentLocation={null}
      />
      
      {/* Edit Post Modal - always render, Modal handles visibility */}
      <EditPostModal
        isOpen={isEditPostModalOpen}
        onClose={() => {
          setIsEditPostModalOpen(false);
          setPostToEdit(null);
        }}
        onSuccess={() => {
          showSuccess('Post Updated', 'Your post has been updated successfully.');
          setIsEditPostModalOpen(false);
          setPostToEdit(null);
        }}
        onError={(message: string) => showError('Update Failed', message)}
        post={postToEdit}
      />
      
      {/* Delete Post Confirmation Modal - always render, Modal handles visibility */}
      <Modal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, post: null })}
        title="Delete Post"
        message="Are you sure you want to delete this post? This action cannot be undone."
        type="error"
        showCancel
        onConfirm={executeDeletePost}
      />
      
      {/* Success/Error Feedback Modal */}
      {feedbackModal.isOpen && (
        <Modal
          isOpen={feedbackModal.isOpen}
          onClose={() => setFeedbackModal(prev => ({ ...prev, isOpen: false }))}
          title={feedbackModal.title}
          message={feedbackModal.message}
          type={feedbackModal.type}
        />
      )}
    </div>
  );
}
