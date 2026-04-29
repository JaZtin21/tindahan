import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { MapContainer, useMap } from 'react-leaflet';
import { LatLngBounds } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useSubscription } from '@apollo/client/react';
import { CachedTileLayer } from '../components/Map';
import { LIVE_POSTS_SUBSCRIPTION } from '../api/graphql/subscriptions/live-posts';
import { useAuth } from '../api/graphql/apolloProviderWithAuth';
import type { Post } from '../types/post';
import { getPostBubbleHtml, getPostPopupHtml } from '../components/Map/PostMarker';
import { getMapMarkerStyles } from '../components/Map/mapStyles';

// Custom Post Marker Component using actual PostMarker styling
function PostMapMarker({ post, onClick }: { post: Post; onClick?: (post: Post) => void }) {
  const map = useMap();
  const markerRef = useRef<any>(null);
  
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
      
      // Create the conversation bubble icon using actual PostMarker styling
      const icon = L.divIcon({
        html: getPostBubbleHtml(post),
        className: 'post-bubble-marker',
        iconSize: [200, 44],
        iconAnchor: [25, 22],
        popupAnchor: [0, -44]
      });
      
      // Create marker with post location
      const marker = L.marker([post.location!.lat, post.location!.lng], { icon });
      
      // Bind popup with post details
      marker.bindPopup(getPostPopupHtml(post));
      
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
      if (markerRef.current) {
        map.removeLayer(markerRef.current);
        markerRef.current = null;
        console.log('[PostMapMarker] Marker removed from map for post:', post.id);
      }
    };
  }, [map, post, onClick]);
  
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

export function OptimizedMapsPage() {
  const [zoom, setZoom] = useState(13);
  const [viewportBounds, setViewportBounds] = useState<LatLngBounds | null>(null);
  const mapRef = useRef<any>(null);
  const { isAuthenticated } = useAuth();

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
      
      // Process all new/updated posts
      for (const [id, newPost] of newMap) {
        const oldPost = prevMap.get(id);
        if (!oldPost) {
          console.log('[WebSocket] New post added:', id);
          merged.push(newPost);
        } else if (JSON.stringify(oldPost) !== JSON.stringify(newPost)) {
          console.log('[WebSocket] Post updated:', id);
          merged.push(newPost);
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
      
      console.log('[OptimizedMapsPage] Live posts total:', merged.length, merged.map(p => p.id));
      return merged;
    });
  }, [livePostsData]);

  // Filter posts that are within current viewport (skip posts without valid coordinates)
  const visiblePosts = useMemo(() => {
    if (!viewportBounds) return livePosts; // Show all if no bounds
    
    return livePosts.filter(post => {
      // Skip posts without valid coordinates
      if (!post.location || post.location.lat == null || post.location.lng == null) {
        return false;
      }
      return isWithinViewport(post.location.lat, post.location.lng, viewportBounds);
    });
  }, [livePosts, viewportBounds]);

  // Handle post click
  const handlePostClick = useCallback((post: Post) => {
    console.log('[OptimizedMapsPage] Post clicked:', post.id);
  }, []);

  return (
    <div className="w-full h-screen relative">
      {/* Map info */}
      <div className="absolute bottom-4 left-4 z-[1000] bg-white rounded-lg shadow-lg p-3 max-w-xs">
        <h3 className="font-semibold text-sm mb-1">Optimized Map</h3>
        <p className="text-xs text-gray-600">
          Zoom: {zoom}
        </p>
        <p className="text-xs text-gray-600">
          Live Posts: {visiblePosts.length}
        </p>
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
        {/* Custom cached tile layer */}
        <CachedTileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          maxZoom={19}
        />
        {/* Zoom tracker */}
        <MapZoomTracker onZoomChange={setZoom} />
        {/* Viewport tracker - tracks map bounds for filtering markers */}
        <MapViewportTracker onBoundsChange={setViewportBounds} />
        
        {/* Live Post Markers - only visible ones within viewport */}
        {visiblePosts.map((post) => (
          <PostMapMarker
            key={post.id}
            post={post}
            onClick={handlePostClick}
          />
        ))}
      </MapContainer>
    </div>
  );
}
