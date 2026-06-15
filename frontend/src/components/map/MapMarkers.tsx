import { useState, useEffect, useMemo, memo } from 'react';
import { useMap } from 'react-leaflet';
import type { LatLngBounds } from 'leaflet';
import type { MapMarkersProps } from '../../types/map';
import { clusterPosts, MIN_MARKER_ZOOM } from '../../utils/maps/mapUtils';
import { PostMapMarker } from './PostMapMarker';
import { PostGroupMarker } from './PostGroupMarker';
import { StoreMarker } from './StoreMarker';
import { LocationPinMarker } from './LocationPinMarker';
import { ProductStoreMarkers } from './ProductStoreMarkers';
import { UserLocationMarker } from './UserLocationMarker';
import { PostSearchMarker } from './PostSearchMarker';
import { ShopNearMeMarker } from './ShopNearMeMarker';

function MapMarkersComponent({
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
  showPostMarkers,
  postSearchResults,
  userLocation,
  showUserLocationMarker,
  showShopsNearMe,
  shopsNearMe,
  onShopNearMeClick
}: MapMarkersProps) {
  const map = useMap();
  const [zoom, setZoom] = useState(map.getZoom());
  const [viewportBounds, setViewportBounds] = useState<LatLngBounds | null>(null);

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

  // Filter visible posts within viewport (strict - no buffer)
  const visiblePosts = useMemo(() => {
    if (!viewportBounds) {
      return [];
    }
    
    const filtered = livePosts.filter(post => {
      if (!post.location || post.location.lat == null || post.location.lng == null) return false;
      if (deletedPostIds.has(post.id)) return false;
      return viewportBounds.contains([post.location.lat, post.location.lng]);
    });
    return filtered;
  }, [livePosts, viewportBounds, deletedPostIds]);

  // Cluster posts
  const clusteredPosts = useMemo(() => {
    return clusterPosts(visiblePosts, 25);
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
      
      {/* Shops Near Me Markers */}
      {showShopsNearMe && shopsNearMe.length > 0 && (
        <>
          {shopsNearMe.map((shop) => (
            <ShopNearMeMarker
              key={shop.id}
              store={shop}
              onClick={onShopNearMeClick}
            />
          ))}
        </>
      )}
      
      {/* Post Search Markers - show markers with user profile pictures */}
      {showPostMarkers && postSearchResults.length > 0 && ( 
        <>
          {postSearchResults.map((post) => (
            <PostSearchMarker
              key={post.id}
              post={post}
              onClick={() => {
                // Handle post search marker click - could open post preview
                console.log('Post search marker clicked:', post);
              }}
            />
          ))}
        </>
      )}
      
      {/* Live Post Markers - only visible when zoomed in */}
      {zoom >= MIN_MARKER_ZOOM && (
        <>
          {clusteredPosts.map((item) => (
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
      )}
    </>
  );
}

export const MapMarkers = memo(MapMarkersComponent);