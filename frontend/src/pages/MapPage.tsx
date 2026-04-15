import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { useQuery } from '@apollo/client/react';
import { OpenStreetMap, SearchBar, LocationSearchBar } from '../components/Map';
import { openSideNav } from '../store';
import { CreatePostModal } from '../components/posts/CreatePostModal';
import { useCreatePost, usePostsNearLocation } from '../api/graphql/post/usePost';
import { SHOPS_BY_PRODUCT_QUERY } from '../api/graphql/shop/shop-queries';
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

  // GraphQL hooks
  const { refetch: refetchShopsByProduct } = useQuery(SHOPS_BY_PRODUCT_QUERY, {
    variables: { productName: productNameForSearch },
    skip: !productNameForSearch
  });

  const [createPost, { loading: isCreatingPost }] = useCreatePost();

  // Lazy query for fetching posts - does NOT auto-fetch on mount
  const [fetchPosts, { data: postsData, loading: postsLoading }] = usePostsNearLocation();

  // Custom hooks for map functionality
  const { 
    mapCenter, 
    mapZoom, 
    setMapCenter, 
    setMapZoom, 
    handleMapCenterChange,
    lastFetchCenterRef 
  } = useMapCenter({ fetchPosts, postsLoading });

  const { 
    clusterRotations, 
    groupedPostClusters 
  } = useMapPosts({ postsData });

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
    lastFetchCenterRef
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

  return (
    <div className="bg-white dark:bg-zinc-900 relative min-h-screen">
      {/* Top Search Bar */}
      <div className="absolute top-[77px] z-40 px-4 py-4 left-[50%] transform -translate-x-1/2 max-w-[700px] w-full">
        {/* First Row: My Location and Manual Location Search */}
        <div className="flex items-center gap-3 mb-3">
          {/* My Location Button */}
          <button
            onClick={handleMyLocation}
            className="flex-shrink-0 p-3 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-600 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
            title="Go to my location"
          >
            🎯
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

      {/* Main Content */}
      <div className="fixed top-[77px] left-0 right-0 bottom-0 z-[1]">
        {/* Full Screen Map */}
        <OpenStreetMap
          center={mapCenter}
          zoom={mapZoom}
          onMarkerClick={handleStoreSelect}
          onMapMoveEnd={handleMapCenterChange}
          markers={allMarkers}
          currentLocation={currentLocation}
        />

        {/* Map Controls Info */}
        <div className="absolute bottom-4 left-4 z-30">
          <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-xl border border-zinc-200 dark:border-zinc-700 px-3 py-2 text-xs text-zinc-600 dark:text-zinc-400">
            🗺️ OpenStreetMap • Click to add store
          </div>
        </div>
      </div>

      {/* Create Post Modal */}
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
