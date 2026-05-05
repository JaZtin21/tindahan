import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { MapContainer, useMap } from 'react-leaflet';
import L, { type LatLngBounds } from 'leaflet'
import 'leaflet/dist/leaflet.css';
import { useSubscription, useMutation, useQuery } from '@apollo/client/react';
import { CachedTileLayer } from '../components/Map';
import { LIVE_POSTS_SUBSCRIPTION } from '../api/graphql/subscriptions/live-posts';
import { DELETE_POST_MUTATION } from '../api/graphql/post/post-queries';
import { SHOPS_BY_PRODUCT_QUERY } from '../api/graphql/shop/shop-queries';
import { useCreatePost } from '../api/graphql/post/usePost';
import { useAuth } from '../api/graphql/apolloProviderWithAuth';
import type { Post } from '../types/post';
import { getPostBubbleHtml, getPostGroupBubbleHtml } from '../components/Map/PostMarker';
import { getMapMarkerStyles } from '../components/Map/mapStyles';
import { PostPreviewModal } from '../components/posts/PostPreviewModal';
import { CreatePostModal } from '../components/posts/CreatePostModal';
import { EditPostModal } from '../components/posts/EditPostModal';
import { Modal } from '../components/Modal';
import { createPostHandlers } from '../utils/maps/handlers';
import { openSideNav } from '../store';
import { MdMyLocation } from 'react-icons/md';
import { SearchBar } from '../components/Map/SearchBar';

// Custom Post Marker Component using actual PostMarker styling with pop animations
function PostMapMarker({ post, onClick, isEdited }: { post: Post; onClick?: (post: Post) => void; isEdited?: boolean }) {
  const map = useMap();
  const markerRef = useRef<any>(null);
  const isRemovingRef = useRef(false);
  const postRef = useRef<string>('');
  const onClickRef = useRef(onClick);
  
  // Keep callback ref updated
  onClickRef.current = onClick;
  
  useEffect(() => {
    // Only recreate if post ID actually changed
    if (post.id === postRef.current && markerRef.current) {
      return;
    }
    postRef.current = post.id;
    
    const init = async () => {
      const L = await import('leaflet');
      
      // Check if marker already exists
      if (markerRef.current) {
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
      
      // Add click handler using ref
      marker.on('click', () => {
        onClickRef.current?.(post);
      });
      
      // Add to map
      marker.addTo(map);
      markerRef.current = marker;
    };
    
    init();
    
    return () => {
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
            }
            isRemovingRef.current = false;
          }, 300); // Match CSS animation duration
        } else {
          // Fallback if element not found
          map.removeLayer(markerRef.current);
          markerRef.current = null;
          isRemovingRef.current = false;
        }
      }
    };
    // Remove map from deps - it changes on every pan/zoom causing blinking
    // Only depend on post.id and isEdited
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [post.id, isEdited]);
  
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

// Search Result Marker Components
// Store Marker (Shop icon for API store results)
function StoreMarker({ store, onClick }: { store: any; onClick?: (store: any) => void }) {
  const map = useMap();
  const markerRef = useRef<any>(null);
  const storeRef = useRef<string>('');
  const onClickRef = useRef(onClick);
  
  // Keep callback ref updated
  onClickRef.current = onClick;
  
  useEffect(() => {
    if (!store || !store.lat || !store.lng) return;
    
    // Create a key to detect actual store changes
    const storeKey = `${store.id || store.storeId}-${store.lat}-${store.lng}`;
    
    // If same store, don't re-render
    if (storeKey === storeRef.current && markerRef.current) {
      return;
    }
    
    storeRef.current = storeKey;
    
    const init = async () => {
      const L = await import('leaflet');
      
      // Remove existing marker
      if (markerRef.current) {
        map.removeLayer(markerRef.current);
        markerRef.current = null;
      }
      
      // Create shop icon using emoji - SMALLER with background
      const icon = L.divIcon({
        html: `
          <div style="width: 32px; height: 32px; background: white; border-radius: 50%; border: 2px solid #3B82F6; display: flex; align-items: center; justify-content: center; font-size: 18px; cursor: pointer; box-shadow: 0 2px 6px rgba(0,0,0,0.3); transition: transform 0.2s;">
            🏪
          </div>
        `,
        className: 'store-marker-icon',
        iconSize: [32, 32],
        iconAnchor: [16, 16],
        popupAnchor: [0, -16]
      });
      
      const marker = L.marker([store.lat, store.lng], { icon });
      
      // Add click handler to open sidebar - NO POPUP
      marker.on('click', () => {
        onClickRef.current?.(store);
      });
      
      marker.addTo(map);
      markerRef.current = marker;
    };
    
    init();
    
    return () => {
      if (markerRef.current) {
        map.removeLayer(markerRef.current);
        markerRef.current = null;
      }
    };
    // Remove map from deps - it changes on every pan/zoom causing blinking
    // Use storeRef to only update when store actually changes
  }, [store]);
  
  return null;
}

// Location Pin Marker (Pin icon for geocoding results)
function LocationPinMarker({ location }: { location: any }) {
  const map = useMap();
  const markerRef = useRef<any>(null);
  const locationRef = useRef<string>('');
  
  useEffect(() => {
    if (!location || !location.lat || !location.lng) return;
    
    // Create a key to detect actual location changes
    const locationKey = `${location.lat}-${location.lng}`;
    
    // If same location, don't re-render
    if (locationKey === locationRef.current && markerRef.current) {
      return;
    }
    
    locationRef.current = locationKey;
    
    const init = async () => {
      const L = await import('leaflet');
      
      // Remove existing marker
      if (markerRef.current) {
        map.removeLayer(markerRef.current);
        markerRef.current = null;
      }
      
      // Create location pin icon
      const icon = L.divIcon({
        html: `
          <div class="location-pin-marker" style="width: 40px; height: 40px; position: relative; display: flex; align-items: center; justify-content: center;">
            <div class="location-pin" style="position: relative; z-index: 2; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="#3B82F6" stroke="white" stroke-width="1.5" style="display: block;">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                <circle cx="12" cy="10" r="3" fill="white"/>
              </svg>
            </div>
          </div>
        `,
        className: 'location-pin-icon',
        iconSize: [40, 40],
        iconAnchor: [20, 20],
        popupAnchor: [0, -20]
      });
      
      const marker = L.marker([location.lat, location.lng], { icon });
      marker.bindPopup(`<div style="font-family: system-ui; font-size: 14px; font-weight: 600;">${location.name}</div>`);
      marker.addTo(map);
      markerRef.current = marker;
    };
    
    init();
    
    return () => {
      if (markerRef.current) {
        map.removeLayer(markerRef.current);
        markerRef.current = null;
      }
    };
    // Remove map from deps - it changes on every pan/zoom causing blinking
  }, [location]);
  
  return null;
}

// Product Store Markers (Multiple shop markers for product search results)
function ProductStoreMarkers({ stores, onStoreClick }: { stores: any[]; onStoreClick?: (store: any) => void }) {
  const map = useMap();
  const markersRef = useRef<any[]>([]);
  const storesRef = useRef<string>('');
  const onStoreClickRef = useRef(onStoreClick);
  
  // Keep callback ref updated
  onStoreClickRef.current = onStoreClick;
  
  useEffect(() => {
    if (!stores || stores.length === 0) return;
    
    // Create stable comparison key from store IDs and positions
    const storesKey = stores.map(s => `${s.id || s.title}-${s.lat}-${s.lng}`).join('|');
    
    // Check if stores actually changed
    if (storesKey === storesRef.current && markersRef.current.length > 0) {
      return; // No change, don't re-render
    }
    
    storesRef.current = storesKey;
    
    const init = async () => {
      const L = await import('leaflet');
      
      // Clear existing markers
      markersRef.current.forEach(marker => {
        map.removeLayer(marker);
      });
      markersRef.current = [];
      
      // Create markers for each store using shop emoji
      stores.forEach((store) => {
        if (!store.lat || !store.lng) return;
        
        // Create shop icon using emoji - SMALLER with background (same style as store marker)
        const icon = L.divIcon({
          html: `
            <div style="width: 32px; height: 32px; background: white; border-radius: 50%; border: 2px solid #3B82F6; display: flex; align-items: center; justify-content: center; font-size: 18px; cursor: pointer; box-shadow: 0 2px 6px rgba(0,0,0,0.3); transition: transform 0.2s;">
              🏪
            </div>
          `,
          className: 'product-store-marker-icon',
          iconSize: [32, 32],
          iconAnchor: [16, 16],
          popupAnchor: [0, -16]
        });
        
        const marker = L.marker([store.lat, store.lng], { icon });
        
        // Add click handler to open sidebar - use ref to avoid re-creation
        marker.on('click', () => {
          if (onStoreClickRef.current) {
            onStoreClickRef.current(store);
          }
        });
        
        marker.addTo(map);
        markersRef.current.push(marker);
      });
    };
    
    init();
    
    // Only cleanup on unmount, not on every render
    return () => {
      markersRef.current.forEach(marker => {
        map.removeLayer(marker);
      });
      markersRef.current = [];
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stores]); // Only depend on stores, not map or onStoreClick
  
  return null;
}

// User Location Marker Component
function UserLocationMarker({ location }: { location: { lat: number; lng: number } }) {
  const map = useMap();
  const markerRef = useRef<any>(null);
  const locationRef = useRef<string>('');
  
  useEffect(() => {
    if (!location) return;
    
    // Create a key to detect actual location changes
    const locationKey = `${location.lat}-${location.lng}`;
    
    // If same location, don't re-render
    if (locationKey === locationRef.current && markerRef.current) {
      return;
    }
    
    locationRef.current = locationKey;
    
    const init = async () => {
      const L = await import('leaflet');
      
      // Remove existing marker if any (prevent duplicates)
      if (markerRef.current) {
        map.removeLayer(markerRef.current);
        markerRef.current = null;
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
        iconAnchor: [20, 20],
        popupAnchor: [0, -20]
      });
      
      const marker = L.marker([location.lat, location.lng], { icon });
      marker.bindPopup('<div style="font-family: system-ui; font-size: 14px; font-weight: 600;">Your Location</div>');
      marker.addTo(map);
      markerRef.current = marker;
    };
    
    init();
    
    return () => {
      if (markerRef.current) {
        map.removeLayer(markerRef.current);
        markerRef.current = null;
      }
    };
    // Remove map from deps - it changes on every pan/zoom causing blinking
  }, [location]);
  
  return null;
}

// Type definitions for marker data
type StoreLocationData = {
  lat: number;
  lng: number;
  name: string;
  image?: string;
  type?: string;
  address?: string;
  id?: string;
  businessType?: string;
};

type LocationPinData = {
  lat: number;
  lng: number;
  name: string;
  address?: string;
};

type ProductStore = {
  id: string;
  lat: number;
  lng: number;
  name: string;
  address?: string;
  image?: string;
};

// MapMarkers - Internal component that handles all markers and zoom/viewport state
// This lives inside MapContainer so only it re-renders on zoom/pan, not the entire page
interface MapMarkersProps {
  livePosts: Post[];
  deletedPostIds: Set<string>;
  editedPostIds: Set<string>;
  onPostClick: (post: Post) => void;
  showStoreMarker: boolean;
  storeMarkerData: StoreLocationData | null;
  onStoreMarkerClick: (store: StoreLocationData) => void;
  showLocationPinMarker: boolean;
  locationPinData: LocationPinData | null;
  showProductStoreMarkers: boolean;
  productSearchStores: ProductStore[];
  userLocation: { lat: number; lng: number } | null;
  showUserLocationMarker: boolean;
}

function MapMarkers({
  livePosts,
  deletedPostIds,
  editedPostIds,
  onPostClick,
  showStoreMarker,
  storeMarkerData,
  onStoreMarkerClick,
  showLocationPinMarker,
  locationPinData,
  showProductStoreMarkers,
  productSearchStores,
  userLocation,
  showUserLocationMarker
}: MapMarkersProps) {
  const map = useMap();
  const [zoom, setZoom] = useState(map.getZoom());
  const [viewportBounds, setViewportBounds] = useState<LatLngBounds | null>(map.getBounds());

  // Track zoom changes
  useEffect(() => {
    const handleZoom = () => setZoom(map.getZoom());
    map.on('zoomend', handleZoom);
    return () => { map.off('zoomend', handleZoom); };
  }, [map]);

  // Track viewport bounds changes
  useEffect(() => {
    const handleMove = () => {
      const bounds = map.getBounds();
      if (bounds?.isValid()) setViewportBounds(bounds);
    };
    map.on('moveend', handleMove);
    return () => { map.off('moveend', handleMove); };
  }, [map]);

  // Filter visible posts within viewport
  const visiblePosts = useMemo(() => {
    if (!viewportBounds) return [];
    
    const isWithinViewport = (lat: number, lng: number, bounds: LatLngBounds) => {
      const northEast = bounds.getNorthEast();
      const southWest = bounds.getSouthWest();
      const latBuffer = (northEast.lat - southWest.lat) * 0.2;
      const lngBuffer = (northEast.lng - southWest.lng) * 0.2;
      return (
        lat >= southWest.lat - latBuffer &&
        lat <= northEast.lat + latBuffer &&
        lng >= southWest.lng - lngBuffer &&
        lng <= northEast.lng + lngBuffer
      );
    };

    return livePosts.filter(post => {
      if (!post.location || post.location.lat == null || post.location.lng == null) return false;
      if (deletedPostIds.has(post.id)) return false;
      return isWithinViewport(post.location.lat, post.location.lng, viewportBounds);
    });
  }, [livePosts, viewportBounds, deletedPostIds]);

  // Cluster posts
  const clusteredPosts = useMemo(() => {
    return clusterPosts(visiblePosts, GROUP_DISTANCE_THRESHOLD);
  }, [visiblePosts]);

  return (
    <>
      {/* User Location Marker */}
      {showUserLocationMarker && userLocation && <UserLocationMarker location={userLocation} />}
      
      {/* Store Marker */}
      {showStoreMarker && storeMarkerData && <StoreMarker store={storeMarkerData} onClick={onStoreMarkerClick} />}
      
      {/* Location Pin Marker */}
      {showLocationPinMarker && locationPinData && <LocationPinMarker location={locationPinData} />}
      
      {/* Product Store Markers */}
      {showProductStoreMarkers && productSearchStores.length > 0 && (
        <ProductStoreMarkers stores={productSearchStores} onStoreClick={onStoreMarkerClick} />
      )}
      
      {/* Live Post Markers - only visible when zoomed in */}
      {zoom >= MIN_MARKER_ZOOM && clusteredPosts.map((item) => (
        item.type === 'single' ? (
          <PostMapMarker
            key={item.post.id}
            post={item.post}
            onClick={onPostClick}
            isEdited={editedPostIds.has(item.post.id)}
          />
        ) : (
          <PostGroupMarker
            key={`group-${item.group.posts.map(p => p.id).sort().join('-')}`}
            group={item.group}
            onClick={onPostClick}
          />
        )
      ))}
    </>
  );
}

// Minimum zoom level to show post markers (city level zoom)
const MIN_MARKER_ZOOM = 16;

// Distance threshold for grouping posts (in meters)
const GROUP_DISTANCE_THRESHOLD = 50;

// Haversine distance calculation between two lat/lng points in meters
function getDistanceInMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371e3; // Earth radius in meters
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lng2 - lng1) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) *
    Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

// Group posts that are within threshold distance of each other
type PostGroup = { posts: Post[]; centerLat: number; centerLng: number };
type PostOrGroup = { type: 'single'; post: Post } | { type: 'group'; group: PostGroup };

function clusterPosts(posts: Post[], thresholdMeters: number): PostOrGroup[] {
  if (posts.length === 0) return [];

  const used = new Set<string>();
  const result: PostOrGroup[] = [];

  for (const post of posts) {
    if (used.has(post.id)) continue;
    if (!post.location || post.location.lat == null || post.location.lng == null) continue;

    const group: Post[] = [post];
    used.add(post.id);

    for (const other of posts) {
      if (used.has(other.id)) continue;
      if (!other.location || other.location.lat == null || other.location.lng == null) continue;
      if (post.id === other.id) continue;

      const distance = getDistanceInMeters(
        post.location.lat, post.location.lng,
        other.location.lat, other.location.lng
      );

      if (distance <= thresholdMeters) {
        group.push(other);
        used.add(other.id);
      }
    }

    if (group.length === 1) {
      result.push({ type: 'single', post });
    } else {
      // Calculate center point
      const centerLat = group.reduce((sum, p) => sum + (p.location?.lat || 0), 0) / group.length;
      const centerLng = group.reduce((sum, p) => sum + (p.location?.lng || 0), 0) / group.length;
      result.push({ type: 'group', group: { posts: group, centerLat, centerLng } });
    }
  }

  return result;
}

// Calculate offset position for grouped markers to prevent overlap
function getOffsetPosition(index: number, total: number, baseLat: number, baseLng: number): [number, number] {
  if (total <= 1) return [baseLat, baseLng];
  
  // Arrange in a small circle around the base position
  // 10 meters offset at equator ~ 0.00009 degrees
  const offsetMeters = 15;
  const angle = (2 * Math.PI * index) / total;
  const latOffset = (offsetMeters * Math.cos(angle)) / 111320;
  const lngOffset = (offsetMeters * Math.sin(angle)) / (111320 * Math.cos(baseLat * Math.PI / 180));
  
  return [baseLat + latOffset, baseLng + lngOffset];
}

// Post Group Marker - cycles through posts in the group with animation
function PostGroupMarker({ group, onClick }: { group: PostGroup; onClick?: (post: Post) => void }) {
  const map = useMap();
  const markerRef = useRef<any>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const isPausedRef = useRef(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const currentPostRef = useRef<Post>(group.posts[0]);
  const groupIdRef = useRef<string>('');
  
  // Generate stable group ID from post IDs
  const groupId = group.posts.map(p => p.id).sort().join('-');

  // Update current post ref
  currentPostRef.current = group.posts[currentIndex];

  // Setup marker only when group ID changes (new set of posts)
  useEffect(() => {
    // Only recreate marker if this is a truly different group
    if (groupIdRef.current === groupId && markerRef.current) {
      return;
    }
    groupIdRef.current = groupId;
    
    // Remove old marker if exists
    if (markerRef.current) {
      map.removeLayer(markerRef.current);
    }
    
    const firstPost = group.posts[0];
    const [lat, lng] = getOffsetPosition(0, group.posts.length, firstPost.location!.lat, firstPost.location!.lng);

    const icon = L.divIcon({
      html: getPostGroupBubbleHtml(firstPost, group.posts.length),
      className: 'post-bubble-marker group-marker-animate',
      iconSize: [40, 44],
      iconAnchor: [20, 44],
      popupAnchor: [0, -44]
    });

    const marker = L.marker([lat, lng], { icon });
    marker.on('click', () => {
      if (onClick) onClick(currentPostRef.current);
    });
    marker.on('mouseover', () => {
      isPausedRef.current = true;
      const el = marker.getElement();
      if (el) el.classList.add('paused');
    });
    marker.on('mouseout', () => {
      isPausedRef.current = false;
      const el = marker.getElement();
      if (el) el.classList.remove('paused');
    });
    marker.addTo(map);
    markerRef.current = marker;

    return () => {
      if (markerRef.current) {
        map.removeLayer(markerRef.current);
        markerRef.current = null;
      }
    };
  }, [map, groupId, onClick]);

  // Update icon when currentIndex changes (only update icon, don't recreate marker)
  useEffect(() => {
    if (!markerRef.current) return;
    
    const currentPost = group.posts[currentIndex];
    const [lat, lng] = getOffsetPosition(currentIndex, group.posts.length, currentPost.location!.lat, currentPost.location!.lng);
    
    // Update position and icon only
    markerRef.current.setLatLng([lat, lng]);
    markerRef.current.setIcon(L.divIcon({
      html: getPostGroupBubbleHtml(currentPost, group.posts.length),
      className: 'post-bubble-marker group-marker-animate',
      iconSize: [40, 44],
      iconAnchor: [20, 44],
      popupAnchor: [0, -44]
    }));
  }, [currentIndex]);

  // Cycle interval - only runs when group length changes (posts added/removed from group)
  useEffect(() => {
    // Clear any existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    
    intervalRef.current = setInterval(() => {
      if (!isPausedRef.current) {
        setCurrentIndex(prev => (prev + 1) % group.posts.length);
      }
    }, 1500);
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [group.posts.length]);

  return null;
}

export function OptimizedMapsPage() {
  const dispatch = useDispatch();
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
    // Delay clearing selectedPost to allow close animation to complete
    setTimeout(() => setSelectedPost(null), 300);
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
        <MapMarkers
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
