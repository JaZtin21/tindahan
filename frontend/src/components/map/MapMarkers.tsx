import { useState, useEffect, useMemo, memo } from 'react';
import { useMap } from 'react-map-gl/maplibre';
import type { MapMarkersProps } from '../../types/map';
import { clusterPosts } from '../../utils/maps/mapUtils';
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
  // 1. Grab MapLibre's native hook context
  const { current: map } = useMap();

  // Initialize zoom and fallback states gracefully
  const [zoom, setZoom] = useState(() => map ? map.getZoom() : 12);
  const [viewportBounds, setViewportBounds] = useState<any>(null);

  // 2. Track viewport transformations using native map instance listeners
  useEffect(() => {
    if (!map) return;

    const nativeMap = map.getMap();

    const handleMapMovement = () => {
      setZoom(nativeMap.getZoom());

      const bounds = nativeMap.getBounds();
      if (bounds) {
        setViewportBounds(bounds);
      }
    };

    // Initialize layout bounds calculation on mount
    handleMapMovement();

    // MapLibre's unified layout movement event updates both bounding values cleanly
    nativeMap.on('moveend', handleMapMovement);
    return () => {
      nativeMap.off('moveend', handleMapMovement);
    };
  }, [map]);

  // 3. Filter visible posts within viewport bounds array
  const visiblePosts = useMemo(() => {
    if (!viewportBounds) return [];

    return livePosts.filter(post => {
      if (!post.location || post.location.lat == null || post.location.lng == null) return false;
      if (deletedPostIds.has(post.id)) return false;

      // MapLibre uses coordinates formatted as standard object signatures or numerical parameters
      const { lng, lat } = post.location;

      // Strict check: ensures the pin rests completely within the viewport box boundary limits
      return (
        lng >= viewportBounds.getWest() &&
        lng <= viewportBounds.getEast() &&
        lat >= viewportBounds.getSouth() &&
        lat <= viewportBounds.getNorth()
      );
    });
  }, [livePosts, viewportBounds, deletedPostIds]);

  // Cluster visible data records
  const clusteredPosts = useMemo(() => {
    return clusterPosts(visiblePosts, 25);
  }, [visiblePosts]);

  const MIN_MARKER_ZOOM = useMemo(() => 13, []);

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
              onClick={onPostClick}
            />
          ))}
        </>
      )}
      {/* Live Post Markers - rendering dynamically on map view calculations */}
      {zoom >= MIN_MARKER_ZOOM && (
        <>
          {clusteredPosts.map((item) => (
            item.type === 'single' ? (
              <PostMapMarker
                key={item.post.id}
                post={item.post}
                onClick={onPostClick}
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
