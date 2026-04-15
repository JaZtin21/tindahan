import { useState, useCallback, useRef, useEffect } from 'react';
import { calculateRadiusFromZoom } from '../../utils/maps';
import type { UseMapCenterOptions, MapCenter } from '../../types/map';

export function useMapCenter({
  fetchPosts,
  postsLoading,
  initialCenter = { lat: 14.5995, lng: 120.9842 },
  initialZoom = 14
}: UseMapCenterOptions) {
  const [mapCenter, setMapCenter] = useState<MapCenter>(initialCenter);
  const [mapZoom, setMapZoom] = useState(initialZoom);
  
  const debounceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastFetchCenterRef = useRef<MapCenter | null>(null);
  const mapInitializedRef = useRef(false);

  // Handle map center changes with proper debounce
  const handleMapCenterChange = useCallback((center: MapCenter, zoom: number) => {
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

  // Helper to manually set center (for location selection, etc.)
  const setCenter = useCallback((center: MapCenter, zoom?: number) => {
    setMapCenter(center);
    if (zoom) setMapZoom(zoom);
    lastFetchCenterRef.current = center;
  }, []);

  return {
    mapCenter,
    mapZoom,
    setMapCenter,
    setMapZoom,
    handleMapCenterChange,
    setCenter,
    lastFetchCenterRef
  };
}
