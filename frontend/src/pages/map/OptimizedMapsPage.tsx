import { useState, useRef, useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { MapContainer } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { useSubscription, useMutation, useQuery } from '@apollo/client/react';
import { CachedTileLayer, MapMarkers as MapMarkersComponent, getMapMarkerStyles } from '../../components/map';
import { LIVE_POSTS_SUBSCRIPTION } from '../../api/graphql/subscriptions/live-posts';
import { DELETE_POST_MUTATION, SEARCH_POSTS_BY_TITLE_QUERY } from '../../api/graphql/post/post-queries';
import { SHOPS_BY_PRODUCT_QUERY, SHOPS_NEAR_ME_QUERY } from '../../api/graphql/shop/shop-queries';
import { useCreatePost } from '../../api/graphql/post/usePost';
import { useAuth } from '../../api/graphql/apolloProviderWithAuth';
import type { Post } from '../../types/post';
import { PostPreviewModal } from '../../components/posts/PostPreviewModal';
import { CreatePostModal } from '../../components/posts/CreatePostModal';
import { EditPostModal } from '../../components/posts/EditPostModal';
import { Modal } from '../../components/Modal';
import { createPostHandlers } from '../../utils/maps/handlers';
import { openSideNav, openPostPreview, closePostPreview, setPosts, updatePost, deletePost as deletePostAction } from '../../store';
import { MdMyLocation } from 'react-icons/md';
import { SearchBar } from '../../components/map/SearchBar';
import { hideMobileSearch } from '../../store/slices/mobileSearchSlice';
import type { RootState } from '../../store';
import { useNavigate } from 'react-router-dom';



const MAPTILE_KEY = import.meta.env.VITE_MAPTILE_KEY || '';
const MAP_TILE_URL = `https://api.maptiler.com/maps/voyager/{z}/{x}/{y}.png?key=${import.meta.env.VITE_MAPTILE_KEY || 'your_fallback_key'}`;


export function OptimizedMapsPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const mapRef = useRef<any>(null);
  // ... rest of the code remains the same ...
  const { isAuthenticated } = useAuth();
  const { isOpen: isPostPreviewOpen } = useSelector((state: any) => state.postPreview);
  const isMobileSearchVisible = useSelector((state: RootState) => (state.mobileSearch as any).isSearchVisible);
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile screen size
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Close mobile search bar when navigating away from maps page
  useEffect(() => {
    return () => {
      if (isMobile && isMobileSearchVisible) {
        dispatch(hideMobileSearch())
      }
    }
  }, [isMobile, isMobileSearchVisible, dispatch])

  // Handle getting current location
  const handleGetCurrentLocation = async () => {
    if (!navigator.geolocation) {
      showError('Location Error', 'Geolocation is not supported by your browser.');
      return;
    }

    // 1. Reset states and begin execution
    setIsGettingLocation(true);

    // 2. Query the underlying permission state beforehand (Safe Check)
    if (navigator.permissions && navigator.permissions.query) {
      try {
        const permissionStatus = await navigator.permissions.query({ name: 'geolocation' });

        if (permissionStatus.state === 'denied') {
          setIsGettingLocation(false);
          showError(
            'Location Permission Blocked',
            'Please check if location is turned on in your device settings and check your browser settings. Go to Chrome > Settings > Site Settings > Location and set to "Allow" for this app or Settings > Safari > Location and set to "Allow" for this app for IOS.'
          );
          return;
        }
      } catch (e) {
        console.warn('Permissions API query not fully supported, falling back to direct location check.', e);
      }
    }

    // 3. Request current positioning parameters
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setUserLocation({ lat: latitude, lng: longitude });
        setShowLocationMarker(true);

        if (mapRef.current) {
          mapRef.current.flyTo([latitude, longitude], 18, {
            duration: 1.5
          });
        }

        setIsGettingLocation(false);
      },
      (error) => {
        console.error('Error getting location:', error);
        setIsGettingLocation(false);

        let errorMessage = 'Unable to fetch location details.';

        switch (error.code) {
          case error.PERMISSION_DENIED:
            // Triggers if device GPS is switched off OR browser site-permissions are set to Blocked
            errorMessage = 'Please check if location is turned on in your device settings and check your browser settings. Go to Chrome > Settings > Site Settings > Location and set to "Allow" for this app or Settings > Safari > Location and set to "Allow" for this app for IOS.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Network location lookup failed. Please check your signal connectivity.';
            break;
          case error.TIMEOUT:
            errorMessage = 'The location request timed out. Please try tapping the button again.';
            break;
        }

        showError('Location Error', errorMessage);
      },
      {
        enableHighAccuracy: true,
        timeout: 8000,       // Reduced from 10s to 8s for snappier mobile responsiveness
        maximumAge: 0        // FORCE 0 to guarantee fresh, non-cached coordination values
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
  const closePostTimeoutRef = useRef<number | null>(null);

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

  // Shops near me state
  const [showShopsNearMe, setShowShopsNearMe] = useState(false);
  const [shopsNearMe, setShopsNearMe] = useState<any[]>([]);
  const [isLoadingShopsNearMe, setIsLoadingShopsNearMe] = useState(false);

  // Post search states
  const [postSearchResults, setPostSearchResults] = useState<any[]>([]);
  const [showPostMarkers, setShowPostMarkers] = useState(false);

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

  // Query to search posts by title
  const { refetch: refetchPostsByTitle } = useQuery(SEARCH_POSTS_BY_TITLE_QUERY, {
    variables: { query: '', page: 1, limit: 50 },
    skip: true
  });

  // Query to get shops near me (public API)
  const { refetch: refetchShopsNearMe } = useQuery(SHOPS_NEAR_ME_QUERY, {
    variables: { lat: 0, lng: 0 },
    skip: true
  });

  // Create post handler using factory function
  const { handleCreatePost } = createPostHandlers({ createPost, showSuccess, showError });

  // Handle store selection from search (from API - shop marker)
  const handleStoreSelect = (store: { lat: number; lng: number; name: string; id?: string; description?: string; location?: string; coverPhoto?: string; businessType?: string; phone?: string; hours?: string }) => {
    // Clear post markers when selecting a store
    clearPostMarkers();
    // Only hide product store markers, keep location pin
    setShowProductStoreMarkers(false);
    setProductSearchStores([]);

    // Center map on store
    if (mapRef.current) {
      mapRef.current.flyTo([store.lat, store.lng], 18, { duration: 1 });
    }

    // Set store marker data and show it
    setStoreMarkerData(store);
    setShowStoreMarker(true);
    setSelectedStore(store);

    // Open sidebar with store info
    setTimeout(() => {
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
    }, 1000);
  };

  // Handle store click from marker (for both single store and product stores)
  const handleStoreMarkerClick = useCallback((store: any) => {
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

  }, [dispatch]);

  // Handle shop near me toggle
  const handleToggleShopsNearMe = async () => {
    if (showShopsNearMe) {
      // Turn off - clear markers cleanly
      setShowShopsNearMe(false);
      setShopsNearMe([]);
      return;
    }

    // Turn on - verify platform support
    if (!navigator.geolocation) {
      showError('Location Error', 'Geolocation is not supported by your browser.');
      return;
    }

    setIsLoadingShopsNearMe(true);

    // 1. Proactively inspect local permissions status before requesting coordinates
    if (navigator.permissions && navigator.permissions.query) {
      try {
        const permissionStatus = await navigator.permissions.query({ name: 'geolocation' });
        if (permissionStatus.state === 'denied') {
          setIsLoadingShopsNearMe(false);
          showError(
            'Location Permission Blocked',
            'Please check if location is turned on in your device settings and check your browser settings. Go to Chrome > Settings > Site Settings > Location and set to "Allow" for this app or Settings > Safari > Location and set to "Allow" for this app for IOS.'
          );
          return;
        }
      } catch (e) {
        console.warn('Permissions query skipped.', e);
      }
    }

    // 2. Query location securely with an absolute 0 maximumAge to prevent caching
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;

        // Update core tracking layers
        setUserLocation({ lat: latitude, lng: longitude });
        setShowLocationMarker(true);

        if (mapRef.current) {
          mapRef.current.flyTo([latitude, longitude], 18, {
            duration: 1.5
          });
        }

        // 3. Process backend lookup queries asynchronously
        try {
          const result = await refetchShopsNearMe({ lat: latitude, lng: longitude }) as { data?: { shopsNearMe?: { success: boolean; data: any[] } } };

          if (result.data?.shopsNearMe?.success) {
            const shops = result.data.shopsNearMe.data.map((shop: any) => ({
              id: shop.id,
              lat: shop.coordinates?.lat || 0,
              lng: shop.coordinates?.lng || 0,
              name: shop.name,
              description: shop.description,
              phone: shop.contactDetails?.phone,
              hours: shop.businessHours ? `${shop.businessHours.openTime} - ${shop.businessHours.closeTime}` : undefined,
              coverPhoto: shop.coverPhoto,
              businessType: shop.businessType,
              location: shop.contactDetails?.address || shop.location,
            })).filter((s: any) => s.lat && s.lng);

            setShopsNearMe(shops);
            setShowShopsNearMe(true);
            showSuccess('Shops Near Me', `Found ${shops.length} shops within 200m of your location`);
          } else {
            showError('Search Failed', 'Failed to find shops near you.');
          }
        } catch (error) {
          console.error('Error fetching shops near me:', error);
          showError('Error', 'An error occurred while fetching shops near you.');
        } finally {
          setIsLoadingShopsNearMe(false);
        }
      },
      (error) => {
        console.error('Error getting location:', error);
        setIsLoadingShopsNearMe(false);

        let errorMessage = 'Unable to get your current location.';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Please check if location is turned on in your device settings and check your browser settings. Go to Chrome > Settings > Site Settings > Location and set to "Allow" for this app or Settings > Safari > Location and set to "Allow" for this app for IOS.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Network location lookup failed. Please check your signal connectivity.';
            break;
          case error.TIMEOUT:
            errorMessage = 'The location request timed out. Please try tapping the button again.';
            break;
        }

        showError('Location Error', errorMessage);
      },
      {
        enableHighAccuracy: true,
        timeout: 8000, // Reduced from 10s to 8s for faster failure handling
        maximumAge: 0   // Force zero to guarantee current location accuracy
      }
    );
  };


  // Handle shop near me marker click
  const handleShopNearMeClick = useCallback((store: any) => {
    handleStoreMarkerClick(store);
  }, [handleStoreMarkerClick]);

  // Handle location selection from search (from geocoding - pin marker)
  const handleLocationSelect = (location: { lat: number; lng: number; name: string; details?: string }) => {
    // Clear post markers when selecting a location
    clearPostMarkers();
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
    setProductNameForSearch(productName);

    // Clear post markers when selecting a product
    clearPostMarkers();

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

  // Handle post selection from search
  const handlePostSelect = async (postTitle: string) => {

    // Fetch posts by title
    const result = await refetchPostsByTitle({ query: postTitle, page: 1, limit: 50 }) as { data?: { searchPostsByTitle?: { data: any[] } } };
    const posts = result.data?.searchPostsByTitle?.data || [];

    // Convert posts to marker format
    const postMarkers = posts.map((post: any) => ({
      id: post.id,
      title: post.title,
      authorName: post.authorName,
      authorProfilePhoto: post.authorProfilePhoto,
      photos: post.photos,
      lat: post.location?.lat || 0,
      lng: post.location?.lng || 0,
    })).filter((p: any) => p.lat && p.lng);

    setPostSearchResults(postMarkers);
    setShowPostMarkers(true);

    // Clear other markers
    setShowStoreMarker(false);
    setStoreMarkerData(null);
    setShowProductStoreMarkers(false);
    setProductSearchStores([]);

    // Zoom out to fit all posts using fitBounds
    if (mapRef.current && postMarkers.length > 0) {
      const bounds = postMarkers.map(p => [p.lat, p.lng]);
      mapRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 15, duration: 1.5 });
    }

    // Show success message with post count
    showSuccess('Post Search', `Found ${postMarkers.length} posts matching "${postTitle}"`);
  };

  // Clear post search markers
  const clearPostMarkers = () => {
    setPostSearchResults([]);
    setShowPostMarkers(false);
  };

  // Clear all search markers
  const clearAllSearchMarkers = () => {

    setShowStoreMarker(false);
    setShowLocationPinMarker(false);
    setShowProductStoreMarkers(false);
    setShowPostMarkers(false);
    setStoreMarkerData(null);
    setLocationPinData(null);
    setProductSearchStores([]);
    setFilteredStores([]);
    setPostSearchResults([]);
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

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const isCreateOpenInUrl = params.get('create') === 'true';

    // If the 'create' flag is missing from the URL but our local state is open, close it
    if (!isCreateOpenInUrl && isCreatePostModalOpen) {
      setIsCreatePostModalOpen(false);
    }
  }, [window.location.search, isCreatePostModalOpen]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const postIdFromUrl = params.get('post');

    // If the post ID is gone from the URL, but our UI state says it's open, close it
    if (!postIdFromUrl && isPostPreviewOpen) {
      console.log('[OptimizedMapsPage] Back button detected, closing post preview');
      dispatch(closePostPreview());
      setSelectedPost(null);
    }
  }, [window.location.search, isPostPreviewOpen, dispatch]);

  // Live posts subscription - only subscribe if authenticated
  const { data: livePostsData } = useSubscription<{ livePosts: Post[] }>(
    LIVE_POSTS_SUBSCRIPTION,
    { skip: !isAuthenticated }
  );


  // Store live posts in state
  const [livePosts, setLivePosts] = useState<Post[]>([]);

  // Play posts mode state
  const [isPlayingPosts, setIsPlayingPosts] = useState(false);
  const [playQueue, setPlayQueue] = useState<Post[]>([]);
  const [currentPlayIndex, setCurrentPlayIndex] = useState(0);
  const [isNavigating, setIsNavigating] = useState(false);

  // Ref for PostPreviewModal to trigger close animation
  const postPreviewModalRef = useRef<{ animateClose: () => void }>(null);

  // Handle WebSocket updates - merge new data instead of replacing
  useEffect(() => {
    const newPosts = livePostsData?.livePosts;
    if (!newPosts || !Array.isArray(newPosts)) return;


    setLivePosts(prevPosts => {

      const prevMap = new Map(prevPosts.map(p => [p.id, p]));
      const newMap = new Map(newPosts.map(p => [p.id, p]));

      const merged: Post[] = [];
      const handledIds = new Set<string>();
      const newlyEditedIds = new Set<string>();
      const newPostIds: string[] = [];
      const updatedPostIds: string[] = [];
      const deletedPostIds: string[] = [];
      const postsToSyncWithRedux: Post[] = [];

      for (const [id, newPost] of newMap) {
        const oldPost = prevMap.get(id);
        if (!oldPost) {
          merged.push(newPost);
          newPostIds.push(id);

          // Collect it for bulk insertion
          postsToSyncWithRedux.push(newPost);
        } else if (JSON.stringify(oldPost) !== JSON.stringify(newPost)) {
          merged.push(newPost);
          updatedPostIds.push(id);
          newlyEditedIds.add(id);

          // Collect it for bulk update
          postsToSyncWithRedux.push(newPost);
        } else {
          merged.push(oldPost);
        }
        handledIds.add(id);
      }

      // 2. DISPATCH ONCE AT THE END OF THE LOOP
      // Your slice's 'setPosts' reducer will cleanly iterate through these, 
      // safely building out state.posts.byId and populating your empty store!
      if (postsToSyncWithRedux.length > 0) {
        dispatch(setPosts(postsToSyncWithRedux));
      }

      // Remove posts that are no longer in the live posts list (deleted)
      for (const [id, oldPost] of prevMap) {
        if (!handledIds.has(id)) {
          deletedPostIds.push(id);
          // Dispatch Redux action for deleted post
          dispatch(deletePostAction(id));
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

      return merged;
    });
  }, [livePostsData, dispatch]);

  // Handle post click
  const handlePostClick = useCallback((post: Post) => {
    const params = new URLSearchParams(window.location.search);
    params.set('post', post.id);
    // Use your router's navigate/push function here. Examples:
    // React Router: navigate(`?${params.toString()}`);
    // Next.js:       router.push(`?${params.toString()}`, { scroll: false });
    navigate(`?${params.toString()}`);
    setSelectedPost(post);
    dispatch(openPostPreview(post.id));

  }, [navigate, dispatch]);

  // Handle post preview modal close
  const handleClosePostPreview = ({ isNavigating, stopPlaying }: { isNavigating?: boolean; stopPlaying?: boolean } = {}) => {
    // Stop playing posts if modal is closed and stopPlaying is true (default)
    if (stopPlaying !== false && isPlayingPosts) {
      stopPlayingPosts();
    }

    if (isNavigating) {
      dispatch(closePostPreview());
      setSelectedPost(null);
      window.history.replaceState({}, '');
    } else {
      dispatch(closePostPreview());
      navigate(-1);
      setSelectedPost(null);
    }

  }



  // Handle edit post
  const handleEditPost = (post: Post) => {
    setPostToEdit(post);
    setIsEditPostModalOpen(true);
  };

  // Handle delete post - opens confirmation modal
  const handleDeletePost = useCallback((post: Post) => {
    setDeleteModal({ isOpen: true, post });
  }, []);

  const handleCloseCreatePostModal = () => {
    setIsCreatePostModalOpen(false);
    navigate(-1);
  };

  const handleOpenCreatePostModal = () => {
    setIsCreatePostModalOpen(true);
    const params = new URLSearchParams(window.location.search);
    params.set('create', 'true');

    navigate(`${window.location.pathname}?${params.toString()}`);

  };

  // Play posts functions
  const startPlayingPosts = () => {
    if (livePosts.length === 0) return;

    // Shuffle posts to create random queue
    const shuffled = [...livePosts].sort(() => Math.random() - 0.5);
    setPlayQueue(shuffled);
    setCurrentPlayIndex(0);
    setIsPlayingPosts(true);

    // Play the first post
    playPostAtIndex(0, shuffled);
  };

  const stopPlayingPosts = () => {
    setIsPlayingPosts(false);
    setPlayQueue([]);
    setCurrentPlayIndex(0);
  };

  const playPostAtIndex = (index: number, queue: Post[]) => {
    if (index >= queue.length) {
      stopPlayingPosts();
      return;
    }

    const post = queue[index];
    if (!post || !post.location) return;

    // Zoom to post location
    if (mapRef.current) {
      mapRef.current.flyTo([post.location.lat, post.location.lng], 18, {
        duration: 1.5
      });
    }

    // Use handlePostClick after zoom animation completes
    setTimeout(() => {
      handlePostClick(post);
    }, 2000);
  };

  const playNextPost = () => {
    if (!isPlayingPosts || playQueue.length === 0) return;

    // Set navigating state to keep controls visible
    setIsNavigating(true);

    // Close existing post preview using animateClose for proper animation
    if (postPreviewModalRef.current) {
      postPreviewModalRef.current.animateClose();
    }

    // Calculate next index
    const nextIndex = currentPlayIndex + 1;
    const targetIndex = nextIndex >= playQueue.length ? 0 : nextIndex;

    // Wait for modal close animation (300ms), then navigate to next post
    setTimeout(() => {
      dispatch(closePostPreview());
      setSelectedPost(null);
      setCurrentPlayIndex(targetIndex);
      playPostAtIndex(targetIndex, playQueue);
      setIsNavigating(false);
    }, 300);
  };

  const playPreviousPost = () => {
    if (!isPlayingPosts || playQueue.length === 0) return;

    // Set navigating state to keep controls visible
    setIsNavigating(true);

    // Close existing post preview using animateClose for proper animation
    if (postPreviewModalRef.current) {
      postPreviewModalRef.current.animateClose();
    }

    // Calculate previous index
    const prevIndex = currentPlayIndex - 1;
    const targetIndex = prevIndex < 0 ? playQueue.length - 1 : prevIndex;

    // Wait for modal close animation (300ms), then navigate to previous post
    setTimeout(() => {
      dispatch(closePostPreview());
      setSelectedPost(null);
      setCurrentPlayIndex(targetIndex);
      playPostAtIndex(targetIndex, playQueue);
      setIsNavigating(false);
    }, 300);
  };

  return (
    <div className="w-full h-screen relative">
      {/* Map info */}


      {/* Search Bar - Fixed at top, hidden on mobile by default */}
      {(!isMobile || isMobileSearchVisible) && (
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
            onPostSelect={handlePostSelect}
            onClearProductStores={clearProductStores}
            onClearAllMarkers={clearAllSearchMarkers}
            showClearMarkersButton={showStoreMarker || showLocationPinMarker || showProductStoreMarkers || showPostMarkers}
            placeholder="Search for stores or products near you..."
            onClear={isMobile ? () => dispatch(hideMobileSearch()) : undefined}
          />
        </div>
      )}

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
          url={MAP_TILE_URL}
          attribution='&copy; <a href="https://maptiler.com" target="_blank">MapTiler</a>'
          maxZoom={22}
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
          showPostMarkers={showPostMarkers}
          postSearchResults={postSearchResults}
          userLocation={userLocation}
          showUserLocationMarker={showLocationMarker}
          showShopsNearMe={showShopsNearMe}
          shopsNearMe={shopsNearMe}
          onShopNearMeClick={handleShopNearMeClick}
        />
      </MapContainer>

      {/* Button Container - Fixed to bottom right, aligned to end */}
      <div className="fixed bottom-4 right-4 z-40 flex flex-col items-end gap-2">
        {/* Location Target Button */}
        <button
          onClick={handleGetCurrentLocation}
          disabled={isGettingLocation}
          className={`w-10 h-10 md:w-12 md:h-12 rounded-full shadow-md transition-all flex items-center justify-center ${isGettingLocation
            ? 'bg-primary/80 backdrop-blur-[5px] [-webkit-backdrop-filter:blur(5px)] text-white animate-pulse'
            : 'bg-white/80 backdrop-blur-[5px] [-webkit-backdrop-filter:blur(5px)] hover:bg-gray-100 text-gray-700'
            }`}
          title={isGettingLocation ? 'Getting location...' : 'Get my current location'}
        >
          {isGettingLocation ? (
            <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          ) : (
            <MdMyLocation className="w-6 h-6 text-primary-700" />
          )}
        </button>

        {/* Shop Near Me Toggle Button */}
        <button
          onClick={handleToggleShopsNearMe}
          disabled={isLoadingShopsNearMe}
          className={`flex items-center gap-2 px-3 py-2 md:px-4 text-sm md:text-base  md:py-3 rounded-full shadow-md transition-colors ${showShopsNearMe
            ? 'bg-secondary/80 backdrop-blur-[5px] [-webkit-backdrop-filter:blur(5px)] hover:bg-secondary-50 text-white'
            : 'bg-secondary/80 backdrop-blur-[5px] [-webkit-backdrop-filter:blur(5px)] hover:bg-secondary-50 text-white'
            }`}
          title={showShopsNearMe ? 'Hide shops near me' : 'Show shops near me'}
        >
          {isLoadingShopsNearMe ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="white" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          )}
          <span className="font-medium">{showShopsNearMe ? 'Hide Shops' : 'Shop Near Me'}</span>
        </button>

        {/* Add Post Button - Only show if authenticated */}
        {isAuthenticated && (
          <button
            onClick={handleOpenCreatePostModal}
            className="flex items-center gap-2 px-3 py-2 md:px-4 text-sm md:text-base md:py-3 bg-primary/80 backdrop-blur-[5px] [-webkit-backdrop-filter:blur(5px)] hover:bg-primary-700 text-white rounded-full shadow-md transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span className="font-medium">Add Post</span>
          </button>
        )}

        {/* Play Posts Button - Only show if authenticated and has live posts */}
        {isAuthenticated && livePosts.length > 0 && (
          <button
            onClick={() => isPlayingPosts ? stopPlayingPosts() : startPlayingPosts()}
            className={`flex items-center gap-2 px-3 py-2 md:px-4 text-sm md:text-base md:py-3 rounded-full shadow-md transition-colors ${isPlayingPosts
              ? 'bg-red-500/80 backdrop-blur-[5px] [-webkit-backdrop-filter:blur(5px)] hover:bg-red-600 text-white'
              : 'bg-purple-600/80 backdrop-blur-[5px] [-webkit-backdrop-filter:blur(5px)] hover:bg-purple-700 text-white'
              }`}
            title={isPlayingPosts ? 'Stop playing posts' : 'Play random posts'}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {isPlayingPosts ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              )}
              {isPlayingPosts && (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10h6v4H9z" />
              )}
            </svg>
            <span className="font-medium">{isPlayingPosts ? 'Stop' : 'Play Posts'}</span>
          </button>
        )}
      </div>

      {/* Post Preview Modal - always render, Modal handles visibility */}
      <PostPreviewModal
        post={selectedPost}
        isOpen={isPostPreviewOpen}
        onClose={handleClosePostPreview}
        onEdit={handleEditPost}
        onDelete={handleDeletePost}
        modalRef={postPreviewModalRef}
      />

      {/* Play Mode Navigation Overlay - Only show when playing and post preview is open or navigating */}
      {isPlayingPosts && (isPostPreviewOpen || isNavigating) && (
        <div className="fixed right-4 top-1/2 -translate-y-1/2 z-[100] flex flex-col gap-2">
          <button
            onClick={playPreviousPost}
            className="w-12 h-12 bg-white/90 backdrop-blur-sm rounded-full shadow-lg flex items-center justify-center hover:bg-gray-100 transition-colors"
            title="Previous post"
          >
            <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="bg-white/90 backdrop-blur-sm rounded-full shadow-lg px-3 py-2 text-center">
            <span className="text-sm font-medium text-gray-700">
              {currentPlayIndex + 1} / {playQueue.length}
            </span>
          </div>
          <button
            onClick={playNextPost}
            className="w-12 h-12 bg-white/90 backdrop-blur-sm rounded-full shadow-lg flex items-center justify-center hover:bg-gray-100 transition-colors"
            title="Next post"
          >
            <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      )}

      {/* Create Post Modal - always render, Modal handles visibility */}
      <CreatePostModal
        isOpen={isCreatePostModalOpen}
        onClose={handleCloseCreatePostModal}
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
