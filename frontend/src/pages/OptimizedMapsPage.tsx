import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { MapContainer, useMap } from 'react-leaflet';
import { LatLngBounds } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useSubscription, useMutation } from '@apollo/client/react';
import { CachedTileLayer } from '../components/Map';
import { LIVE_POSTS_SUBSCRIPTION } from '../api/graphql/subscriptions/live-posts';
import { DELETE_POST_MUTATION } from '../api/graphql/post/post-queries';
import { useCreatePost } from '../api/graphql/post/usePost';
import { useAuth } from '../api/graphql/apolloProviderWithAuth';
import type { Post } from '../types/post';
import { getPostBubbleHtml} from '../components/Map/PostMarker';
import { getMapMarkerStyles } from '../components/Map/mapStyles';
import { PostPreviewModal } from '../components/posts/PostPreviewModal';
import { CreatePostModal } from '../components/posts/CreatePostModal';
import { EditPostModal } from '../components/posts/EditPostModal';
import { Modal } from '../components/Modal';
import { createPostHandlers } from '../utils/maps/handlers';
import { MdMyLocation } from 'react-icons/md';

// Custom Post Marker Component using actual PostMarker styling with pop animations
function PostMapMarker({ post, onClick, isEdited }: { post: Post; onClick?: (post: Post) => void; isEdited?: boolean }) {
  const map = useMap();
  const markerRef = useRef<any>(null);
  const isRemovingRef = useRef(false);
  
  useEffect(() => {
    const init = async () => {
      const L = await import('leaflet');
      
      console.log('[PostMapMarker] Creating marker for post:', post.id);
      
      // Check if marker already exists
      if (markerRef.current) {
        console.log('[PostMapMarker] Marker already exists, removing first:', post.id);
        map.removeLayer(markerRef.current);
        markerRef.current = null;
      }
      
      // Create the conversation bubble icon using actual PostMarker styling with animation
      // Skip animation if this is an edited post (just updating content, not adding new)
      const className = isEdited ? 'post-bubble-marker' : 'post-bubble-marker animate-in';
      const icon = L.divIcon({
        html: getPostBubbleHtml(post),
        className: className,
        iconSize: [200, 44],
        iconAnchor: [25, 22],
        popupAnchor: [0, -44]
      });
      
      // Create marker with post location
      const marker = L.marker([post.location!.lat, post.location!.lng], { icon });
      
      // Add click handler
      if (onClick) {
        marker.on('click', () => onClick(post));
      }
      
      // Add to map
      marker.addTo(map);
      markerRef.current = marker;
      
      console.log('[PostMapMarker] Marker added to map for post:', post.id);
    };
    
    init();
    
    return () => {
      console.log('[PostMapMarker] Cleanup for post:', post.id);
      if (markerRef.current && !isRemovingRef.current) {
        isRemovingRef.current = true;
        
        // Add animate-out class for pop-down animation
        const element = markerRef.current.getElement();
        if (element) {
          element.classList.remove('animate-in');
          element.classList.add('animate-out');
          
          // Wait for animation to complete before removing
          setTimeout(() => {
            if (markerRef.current) {
              map.removeLayer(markerRef.current);
              markerRef.current = null;
              console.log('[PostMapMarker] Marker removed from map for post:', post.id);
            }
            isRemovingRef.current = false;
          }, 300); // Match CSS animation duration
        } else {
          // Fallback if element not found
          map.removeLayer(markerRef.current);
          markerRef.current = null;
          console.log('[PostMapMarker] Marker removed from map for post:', post.id);
          isRemovingRef.current = false;
        }
      }
    };
  }, [map, post, onClick, isEdited]);
  
  return null;
}

// Component to handle map zoom tracking
function MapZoomTracker({ onZoomChange }: { onZoomChange: (zoom: number) => void }) {
  const map = useMap();
  const lastZoomRef = useRef<number>(map.getZoom());
  
  useEffect(() => {
    lastZoomRef.current = map.getZoom();
    onZoomChange(map.getZoom());
    
    const handleZoom = () => {
      const currentZoom = map.getZoom();
      if (currentZoom !== lastZoomRef.current) {
        lastZoomRef.current = currentZoom;
        onZoomChange(currentZoom);
      }
    };
    map.on('zoomend', handleZoom);
    
    return () => {
      map.off('zoomend', handleZoom);
    };
  }, [map, onZoomChange]);
  
  return null;
}

// Component to track map viewport bounds
function MapViewportTracker({ onBoundsChange }: { onBoundsChange: (bounds: LatLngBounds) => void }) {
  const map = useMap();
  
  useEffect(() => {
    // Initial bounds
    onBoundsChange(map.getBounds());
    
    const handleMove = () => {
      onBoundsChange(map.getBounds());
    };
    
    map.on('moveend', handleMove);
    map.on('zoomend', handleMove);
    
    return () => {
      map.off('moveend', handleMove);
      map.off('zoomend', handleMove);
    };
  }, [map, onBoundsChange]);
  
  return null;
}

// Utility to check if a point is within bounds
function isWithinViewport(lat: number, lng: number, bounds: LatLngBounds | null): boolean {
  if (!bounds) return true; // Show all if no bounds yet
  return bounds.contains([lat, lng]);
}

// Minimum zoom level to show post markers (city level zoom)
const MIN_MARKER_ZOOM = 17;

export function OptimizedMapsPage() {
  const [zoom, setZoom] = useState(13);
  const [viewportBounds, setViewportBounds] = useState<LatLngBounds | null>(null);
  const mapRef = useRef<any>(null);
  const { isAuthenticated } = useAuth();
  
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
  const [isPostPreviewOpen, setIsPostPreviewOpen] = useState(false);
  
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
  
  // Create post handler using factory function
  const { handleCreatePost } = createPostHandlers({ createPost, showSuccess, showError });
  
  // Handle actual delete post execution
  const executeDeletePost = async () => {
    if (!deleteModal.post) return;
    
    try {
      const result = await deletePost({ variables: { id: deleteModal.post.id } }) as { data?: { deletePost?: { success: boolean; message?: string } } };
      if (result.data?.deletePost?.success) {
        setDeletedPostIds(prev => new Set(prev).add(deleteModal.post!.id));
        setDeleteModal({ isOpen: false, post: null });
        setIsPostPreviewOpen(false);
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

  // Filter posts that are within current viewport and not deleted
  const visiblePosts = useMemo(() => {
    // Filter out deleted posts first
    const activePosts = livePosts.filter(post => !deletedPostIds.has(post.id));
    
    if (!viewportBounds) return activePosts; // Show all active posts if no bounds
    
    return activePosts.filter(post => {
      // Skip posts without valid coordinates
      if (!post.location || post.location.lat == null || post.location.lng == null) {
        return false;
      }
      return isWithinViewport(post.location.lat, post.location.lng, viewportBounds);
    });
  }, [livePosts, viewportBounds, deletedPostIds]);

  // Handle post click
  const handlePostClick = useCallback((post: Post) => {
    console.log('[OptimizedMapsPage] Post clicked:', post.id);
    console.log('[OptimizedMapsPage] Setting selectedPost:', post);
    console.log('[OptimizedMapsPage] Setting isPostPreviewOpen to true');
    setSelectedPost(post);
    setIsPostPreviewOpen(true);
  }, []);

  // Handle post preview modal close
  const handleClosePostPreview = useCallback(() => {
    setIsPostPreviewOpen(false);
    setSelectedPost(null);
  }, []);

  // Handle edit post
  const handleEditPost = useCallback((post: Post) => {
    setPostToEdit(post);
    setIsEditPostModalOpen(true);
    setIsPostPreviewOpen(false);
  }, []);

  // Handle delete post - opens confirmation modal
  const handleDeletePost = useCallback((post: Post) => {
    setDeleteModal({ isOpen: true, post });
  }, []);

  return (
    <div className="w-full h-screen relative">
      {/* Map info */}


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
        {/* Zoom tracker */}
        <MapZoomTracker onZoomChange={setZoom} />
        {/* Viewport tracker - tracks map bounds for filtering markers */}
        <MapViewportTracker onBoundsChange={setViewportBounds} />
        
        
        {/* Live Post Markers - only visible when zoomed in to city level (zoom >= 23) */}
        {zoom >= MIN_MARKER_ZOOM && visiblePosts.map((post) => (
          <PostMapMarker
            key={post.id}
            post={post}
            onClick={handlePostClick}
            isEdited={editedPostIds.has(post.id)}
          />
        ))}
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

      {/* Post Preview Modal */}
      {selectedPost && (
        <PostPreviewModal
          post={selectedPost}
          isOpen={isPostPreviewOpen}
          onClose={handleClosePostPreview}
          onEdit={handleEditPost}
          onDelete={handleDeletePost}
        />
      )}
      
      {/* Create Post Modal */}
      <CreatePostModal
        isOpen={isCreatePostModalOpen}
        onClose={() => setIsCreatePostModalOpen(false)}
        onSubmit={handleCreatePost}
        isSubmitting={isCreatingPost}
        currentLocation={null}
      />
      
      {/* Edit Post Modal */}
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
      
      {/* Delete Post Confirmation Modal */}
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
      <Modal
        isOpen={feedbackModal.isOpen}
        onClose={() => setFeedbackModal(prev => ({ ...prev, isOpen: false }))}
        title={feedbackModal.title}
        message={feedbackModal.message}
        type={feedbackModal.type}
      />
    </div>
  );
}
