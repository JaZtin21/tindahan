import { useState, useCallback, useRef } from 'react';
import type { UseMapCenterOptions, MapCenter } from '../../types/map';

export function useMapCenter({
  initialCenter = { lat: 14.5995, lng: 120.9842 },
  initialZoom = 14
}: UseMapCenterOptions) {
  const [mapCenter, setMapCenter] = useState<MapCenter>(initialCenter);
  const [mapZoom, setMapZoom] = useState(initialZoom);
  
  const lastFetchCenterRef = useRef<MapCenter | null>(null);
  const mapInitializedRef = useRef(false);

  // Handle map center changes - no fetch, just update center/zoom
  const handleMapCenterChange = useCallback((center: MapCenter, zoom: number) => {
    // Skip first call from map initialization
    if (!mapInitializedRef.current) {
      mapInitializedRef.current = true;
      return;
    }
    
    // Update map center/zoom immediately for smooth UI
    setMapCenter(center);
    setMapZoom(zoom);
    lastFetchCenterRef.current = { lat: center.lat, lng: center.lng };
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
