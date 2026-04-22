import { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { useQuery, useSubscription } from '@apollo/client/react';
import { OpenStreetMap, SearchBar, LocationSearchBar } from '../components/Map';
import { openSideNav } from '../store';
import { CreatePostModal } from '../components/posts/CreatePostModal';
import { PostPreviewModal } from '../components/posts/PostPreviewModal';
import type { Post } from '../types/map';
import { useCreatePost, usePostsNearLocation } from '../api/graphql/post/usePost';
import { SHOPS_BY_PRODUCT_QUERY } from '../api/graphql/shop/shop-queries';
import { LIVE_POSTS_SUBSCRIPTION } from '../api/graphql/subscriptions/live-posts';
import { useAuth } from '../api/graphql/apolloProviderWithAuth';
import { 
  useMapPosts, 
  useMapMarkers, 
  useMapCenter 
} from '../hooks/mappage';
import {
  createStoreHandlers,
  createLocationHandlers,
  createProductHandlers,
  createPostHandlers
} from '../utils/maps/handlers';

export function MapPage() {
  const dispatch = useDispatch();
  const { isAuthenticated } = useAuth();

  // Live posts subscription - only subscribe if authenticated
  const { data: livePostsData, error: livePostsError } = useSubscription(
    LIVE_POSTS_SUBSCRIPTION,
    { skip: !isAuthenticated }
  );

  useEffect(() => {
    if (livePostsData?.livePosts) {
      // Handle live posts data - posts from last 24 hours
    }
    if (livePostsError) {
      console.error('Live posts subscription error:', livePostsError);
    }
  }, [livePostsData, livePostsError]);

  // Store states
  const [filteredStores, setFilteredStores] = useState<{ lat: number; lng: number; title: string; id?: string }[]>([]);
  const [productSearchStores, setProductSearchStores] = useState<{ lat: number; lng: number; title: string; id?: string }[]>([]);
  const [selectedStore, setSelectedStore] = useState<{ lat: number; lng: number; title: string; id?: string } | null>(null);
  
  // Query to get shops by product name
  const [productNameForSearch, setProductNameForSearch] = useState<string | null>(null);
  
  // Location and modal states
  const [locationQuery, setLocationQuery] = useState('');
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number; name?: string } | null>(null);
  const [isCreatePostModalOpen, setIsCreatePostModalOpen] = useState(false);
  
  // Post preview modal state
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [isPostPreviewOpen, setIsPostPreviewOpen] = useState(false);
  
  // Paused clusters for rotation (when user hovers/clicks a post)
  const [pausedClusters, setPausedClusters] = useState<Set<string>>(new Set());
  const [isLocating, setIsLocating] = useState(false); // Loading state for My Location button

  // GraphQL hooks
  const { refetch: refetchShopsByProduct } = useQuery(SHOPS_BY_PRODUCT_QUERY, {
    variables: { productName: productNameForSearch },
    skip: !productNameForSearch
  });

  const [createPost, { loading: isCreatingPost }] = useCreatePost();

  // Lazy query for fetching posts - does NOT auto-fetch on mount
  const [fetchPosts, { data: postsData, loading: postsLoading }] = usePostsNearLocation();

  // Custom hooks for map functionality - no fetch on zoom, use live subscription
  const { 
    mapCenter, 
    mapZoom, 
    setMapCenter, 
    setMapZoom, 
    handleMapCenterChange,
    lastFetchCenterRef 
  } = useMapCenter({});

  // Use live posts from subscription (last 24h posts) instead of fetch query
  const livePosts = livePostsData?.livePosts;
  
  const { 
    clusterRotations, 
    groupedPostClusters 
  } = useMapPosts({ livePosts, pausedClusters });

  const { allMarkers } = useMapMarkers({
    filteredStores,
    productSearchStores,
    groupedPostClusters,
    clusterRotations,
    mapZoom,
    selectedStore
  });

  // Create handlers using factory functions
  const { handleStoreSelect } = createStoreHandlers({
    setMapCenter,
    setMapZoom,
    setSelectedStore,
    fetchPosts,
    postsLoading,
    lastFetchCenterRef,
    dispatch,
    openSideNav
  });

  const { handleLocationSelect, handleMyLocation } = createLocationHandlers({
    setMapCenter,
    setMapZoom,
    setLocationQuery,
    setCurrentLocation,
    fetchPosts,
    postsLoading,
    lastFetchCenterRef,
    setIsLocating
  });

  const { handleProductSelect, clearProductStores } = createProductHandlers({
    setProductNameForSearch,
    setProductSearchStores,
    setFilteredStores,
    refetchShopsByProduct
  });

  const { handleCreatePost } = createPostHandlers({ createPost });

  // handleSearch is required by SearchBar but actual search happens through suggestions
  const handleSearch = (query: string) => {
    console.log('Search submitted:', query);
  };

  // Handle post click from map marker
  const handlePostClick = (post: Post, clusterId?: string) => {
    setSelectedPost(post);
    setIsPostPreviewOpen(true);
    
    // Pause rotation for this cluster
    if (clusterId) {
      setPausedClusters(prev => new Set(prev).add(clusterId));
    }
  };

  // Handle post hover - pause/resume cluster rotation
  const handlePostHover = (clusterId: string | undefined, isHovering: boolean) => {
    if (!clusterId) return;
    
    setPausedClusters(prev => {
      const next = new Set(prev);
      if (isHovering) {
        next.add(clusterId);
      } else {
        next.delete(clusterId);
      }
      return next;
    });
  };

  // Handle post preview modal close
  const handleClosePostPreview = () => {
    setIsPostPreviewOpen(false);
    setSelectedPost(null);
    
    // Resume rotation for all clusters
    setPausedClusters(new Set());
  };

  return (
    <div className="bg-white dark:bg-zinc-900 relative min-h-screen">
      {/* Top Search Bar */}
      <div className="absolute top-[77px] z-40 px-4 py-4 left-[50%] transform -translate-x-1/2 max-w-[700px] w-full">
        {/* First Row: My Location and Manual Location Search */}
        <div className="flex items-center gap-3 mb-3">
          {/* My Location Button */}
          <button
            onClick={handleMyLocation}
            disabled={isLocating}
            className={`flex-shrink-0 p-3 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-600 rounded-lg transition-colors ${
              isLocating 
                ? 'opacity-70 cursor-not-allowed' 
                : 'hover:bg-zinc-50 dark:hover:bg-zinc-800'
            }`}
            title={isLocating ? 'Getting your location...' : 'Go to my location'}
          >
            {isLocating ? (
              <svg className="w-5 h-5 animate-spin text-blue-600" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              '🎯'
            )}
          </button>
          
          {/* Manual Location Search Bar */}
          <LocationSearchBar 
            onLocationSelect={handleLocationSelect}
            placeholder="Search for your current location"
            value={locationQuery}
            onChange={setLocationQuery}
          />
        </div>
        
        {/* Second Row: Current Search Bar */}
        <div>
          <SearchBar 
            onSearch={handleSearch}
            onStoreSelect={handleStoreSelect}
            onProductSelect={handleProductSelect}
            onClearProductStores={clearProductStores}
            placeholder="Search for stores or products near you"
          />
        </div>
      </div>

      {/* Add Post Button - Outside map container */}
      <button
        onClick={() => setIsCreatePostModalOpen(true)}
        className="fixed bottom-4 right-4 z-40 flex items-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-xl transition-colors"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        <span className="font-medium">Add Post</span>
      </button>

      {/* Post Preview Modal */}
      <PostPreviewModal
        post={selectedPost!}
        isOpen={isPostPreviewOpen}
        onClose={handleClosePostPreview}
      />

      {/* Main Content */}
      <div className="fixed top-[77px] left-0 right-0 bottom-0 z-[1]">
        {/* Full Screen Map */}
        <OpenStreetMap
          center={mapCenter}
          zoom={mapZoom}
          onMarkerClick={handleStoreSelect}
          onMapMoveEnd={handleMapCenterChange}
          onPostClick={handlePostClick}
          onPostHover={handlePostHover}
          markers={allMarkers}
          currentLocation={currentLocation}
        />
      </div>

      {/* Create Post Modal - Outside map container for proper z-index */}
      <CreatePostModal
        isOpen={isCreatePostModalOpen}
        onClose={() => setIsCreatePostModalOpen(false)}
        onSubmit={handleCreatePost}
        isSubmitting={isCreatingPost}
        currentLocation={currentLocation}
      />
    </div>
  );
}
