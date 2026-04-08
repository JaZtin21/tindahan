import { useState, useEffect, useCallback, useRef } from 'react';
import { useDispatch } from 'react-redux';
import { OpenStreetMap, SearchBar, LocationSearchBar } from '../components/Map';
import { openSideNav } from '../store';
import { CreatePostModal } from '../components/posts/CreatePostModal';
import { useCreatePost, usePostsNearLocation } from '../api/graphql/post/usePost';
import { calculateRadiusFromZoom } from '../utils/maps';

// Helper to convert File to base64
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
  });
};

export function MapPage() {
  const dispatch = useDispatch();
  const [searchQuery, setSearchQuery] = useState('');
  
  // State for map center and zoom (updated immediately for smooth UI)
  const [mapCenter, setMapCenter] = useState({ lat: 14.5995, lng: 120.9842 });
  const [mapZoom, setMapZoom] = useState(14);
  
  // Refs for debounce logic
  const debounceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastFetchCenterRef = useRef<{ lat: number; lng: number } | null>(null);
  const mapInitializedRef = useRef(false);
  
  // Cache for posts - stores fetched posts so they persist when zooming
  const [cachedPosts, setCachedPosts] = useState<any[]>([]);

  const [filteredStores, setFilteredStores] = useState([
    { lat: 14.5995, lng: 120.9842, title: 'Mang Kiko\'s Sari-Sari Store' },
    { lat: 14.6091, lng: 120.9799, title: 'Aling Nena\'s Grocery' },
    { lat: 14.5897, lng: 120.9834, title: 'Tindahan ni Tony' },
  ]);
  const [locationQuery, setLocationQuery] = useState('');
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number; name?: string } | null>(null);
  const [isCreatePostModalOpen, setIsCreatePostModalOpen] = useState(false);

  const [createPost, { loading: isCreatingPost }] = useCreatePost();

  // Lazy query for fetching posts - does NOT auto-fetch on mount
  const [fetchPosts, { data: postsData, loading: postsLoading }] = usePostsNearLocation();

  // Handle map center changes with proper debounce
  const handleMapCenterChange = useCallback((center: { lat: number; lng: number }, zoom: number) => {
    // Skip first call from map initialization
    if (!mapInitializedRef.current) {
      console.log('[MapPage] Skipping initial map move event');
      mapInitializedRef.current = true;
      return;
    }
    
    // Update map center/zoom immediately for smooth UI
    setMapCenter(center);
    setMapZoom(zoom);
    
    // Clear existing debounce timeout
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    
    // Set new debounce timeout - only fetch after user stops moving
    debounceTimeoutRef.current = setTimeout(() => {
      // Only fetch if zoom > 16
      if (zoom <= 16) {
        console.log('[MapPage] SKIPPED - zoom <= 16');
        return;
      }
      
      // Don't fetch if already loading
      if (postsLoading) {
        console.log('[MapPage] SKIPPED - already loading');
        return;
      }
      
      // Check if center actually moved significantly (prevent refetch on pure zoom)
      const lastCenter = lastFetchCenterRef.current;
      if (lastCenter) {
        const latDiff = Math.abs(lastCenter.lat - center.lat);
        const lngDiff = Math.abs(lastCenter.lng - center.lng);
        const centerMoved = latDiff > 0.001 || lngDiff > 0.001; // ~100 meters
        
        if (!centerMoved) {
          console.log('[MapPage] SKIPPED - center did not move enough');
          return;
        }
      }
      
      console.log('[MapPage] FETCHING - zoom:', zoom, ', center moved');
      lastFetchCenterRef.current = { lat: center.lat, lng: center.lng };
      fetchPosts({
        variables: {
          lat: center.lat,
          lng: center.lng,
          radius: calculateRadiusFromZoom(zoom),
          page: 1,
          limit: 50
        }
      });
    }, 800);
  }, [fetchPosts, postsLoading]);
  
  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);

  // Update cached posts when new data arrives - ACCUMULATE instead of replace
  useEffect(() => {
    const data = postsData as { postsNearLocation?: { data: any[] } } | undefined;
    const newPosts = data?.postsNearLocation?.data;
    if (newPosts && newPosts.length > 0) {
      setCachedPosts(prevPosts => {
        // Create a map of existing posts by ID for quick lookup
        const existingPostsMap = new Map(prevPosts.map(p => [p.id, p]));
        
        // Add new posts, overwriting if same ID
        newPosts.forEach((newPost: any) => {
          existingPostsMap.set(newPost.id, newPost);
        });
        
        // Convert map back to array
        return Array.from(existingPostsMap.values());
      });
    }
  }, [postsData]);
  
  // Combine store and post markers for the map
  const [allMarkers, setAllMarkers] = useState<any[]>([]);

  useEffect(() => {
    // Convert stores to marker format
    const storeMarkers = filteredStores.map(store => ({
      lat: store.lat,
      lng: store.lng,
      title: store.title,
      type: 'store' as const,
    }));
    
    // Add post markers from cache (only if zoom > 16)
    let postMarkers: any[] = [];
    if (mapZoom > 16 && cachedPosts.length > 0) {
      postMarkers = cachedPosts.map((post: any) => ({
        lat: post.location?.lat || 0,
        lng: post.location?.lng || 0,
        title: post.title?.substring(0, 30) + (post.title?.length > 30 ? '...' : '') || 'Post',
        type: 'post' as const,
        post: post
      })).filter((m: any) => m.lat && m.lng);
    }
    
    // Combine stores and posts
    setAllMarkers([...storeMarkers, ...postMarkers]);
  }, [filteredStores, cachedPosts, mapZoom]);

  const handleLocationSelect = (location: { lat: number; lng: number; name: string }) => {
    const newCenter = { lat: location.lat, lng: location.lng };
    setMapCenter(newCenter);
    setMapZoom(17);
    setLocationQuery(location.name);
    setCurrentLocation({ lat: location.lat, lng: location.lng, name: location.name });
    lastFetchCenterRef.current = { lat: location.lat, lng: location.lng };
    
    // Fetch posts immediately for new location
    if (!postsLoading) {
      fetchPosts({
        variables: {
          lat: location.lat,
          lng: location.lng,
          radius: calculateRadiusFromZoom(17),
          page: 1,
          limit: 50
        }
      });
    }
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    console.log('Searching for:', query);
  };

  const handleMapClick = (lat: number, lng: number) => {
    console.log('Map clicked at:', { lat, lng });
  };

  // Reverse geocoding function to get address from coordinates
  const reverseGeocode = async (lat: number, lng: number) => {
    try {
      console.log('🔍 Reverse geocoding for:', { lat, lng });

      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`
      );

      const data = await response.json();

      if (data && data.display_name) {
        return data.display_name;
      } else {
        return `Unknown Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
      }
    } catch (error: any) {
      console.error('❌ Reverse geocoding ERROR:', error);
      return `My Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
    }
  };

  const handleMyLocation = async () => {
    console.log('Getting your location...');

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          resolve,
          reject,
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
          }
        );
      });

      const userLocation = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      };

      console.log('ACTUAL User location:', userLocation);
      console.log('GPS Accuracy:', position.coords.accuracy, 'meters');

      if (position.coords.accuracy > 1000) {
        console.warn('Location accuracy is poor (', position.coords.accuracy, 'meters)');
        alert(`Location accuracy is poor (${position.coords.accuracy.toFixed(0)}m). This is normal on PC. For better accuracy, try on your phone.`);
      }

      setMapCenter(userLocation);
      setMapZoom(20);

      const address = await reverseGeocode(userLocation.lat, userLocation.lng);
      setLocationQuery(address);
      setCurrentLocation({ ...userLocation, name: address });
      lastFetchCenterRef.current = { lat: userLocation.lat, lng: userLocation.lng };
      
      // Fetch posts immediately for user location
      if (!postsLoading) {
        fetchPosts({
          variables: {
            lat: userLocation.lat,
            lng: userLocation.lng,
            radius: calculateRadiusFromZoom(20),
            page: 1,
            limit: 50
          }
        });
      }

      console.log('Map centered and MAX zoomed on your location!');
      console.log('Address found:', address);
    } catch (error) {
      console.error('Error getting location:', error);
      console.log('Location error details:', (error as Error).message);
      alert(`Failed to get your location: ${(error as Error).message}. Please enable location services and try again.`);
    }
  };

  const handleStoreSelect = (store: { lat: number; lng: number; name: string }) => {
    console.log('Flying to store:', store);
    const newCenter = { lat: store.lat, lng: store.lng };
    setMapCenter(newCenter);
    setMapZoom(20);
    lastFetchCenterRef.current = { lat: store.lat, lng: store.lng };
    
    // Fetch posts immediately for store location
    if (!postsLoading) {
      fetchPosts({
        variables: {
          lat: store.lat,
          lng: store.lng,
          radius: calculateRadiusFromZoom(20),
          page: 1,
          limit: 50
        }
      });
    }

    dispatch(openSideNav({
      name: store.name,
      lat: store.lat,
      lng: store.lng,
      type: 'store',
      description: 'Local sari-sari store offering daily essentials and snacks.',
      address: 'Address not available',
      phone: '+63 XXX XXX XXXX',
      hours: '6:00 AM - 9:00 PM'
    }));
  };

  // Handle post creation with photo upload
  const handleCreatePost = async (post: { title: string; text: string; photos: File[]; types: string[]; location: { lat: number; lng: number; name: string } }) => {
    try {
      // Convert photos to base64
      const photoPromises = post.photos.map(file => fileToBase64(file));
      const base64Photos = await Promise.all(photoPromises);

      const result = await createPost({
        variables: {
          input: {
            title: post.title,
            text: post.text,
            photos: base64Photos,
            types: post.types,
            location: post.location
          }
        }
      });

      if (result.data?.createPost?.success) {
        alert('Post created successfully!');
      } else {
        alert('Failed to create post: ' + result.data?.createPost?.message);
      }
    } catch (error) {
      console.error('Error creating post:', error);
      alert('Failed to create post. Please try again.');
    }
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
          onMapClick={handleMapClick}
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
