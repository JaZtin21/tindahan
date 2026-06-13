import React, { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import type { TileLayer as LeafletTileLayer } from 'leaflet';

interface CachedTileLayerProps {
  url: string;
  attribution?: string;
  maxZoom?: number;
}

function CachedTileLayerComponent({ url, attribution, maxZoom = 19 }: CachedTileLayerProps) {
  console.log('[CachedTileLayer] Component render');

  const tileLayerRef = useRef<LeafletTileLayer | null>(null);
  const map = useMap();

  useEffect(() => {
    const init = async () => {
      const L = await import('leaflet');

      // Create tile layer with high keepBuffer for caching
      const tileLayer = L.tileLayer(url, {
        attribution,
        maxZoom,
        crossOrigin: 'anonymous',
        keepBuffer: 50, // Keep 50 tiles in buffer for smooth panning
        updateWhenZooming: false,
        updateWhenIdle: true,
      });

      tileLayer.addTo(map);
      tileLayerRef.current = tileLayer;
      const container = tileLayer.getContainer();
      if (container) {
        container.style.filter = 'brightness(1.015) contrast(0.965) saturate(1.028)';

      }
    };

    init();

    return () => {
      if (tileLayerRef.current) {
        map.removeLayer(tileLayerRef.current);
        tileLayerRef.current = null;
      }
    };
  }, []); // Empty deps - only run once

  return null;
}

// Export memoized component - prevents re-renders when parent updates
export const CachedTileLayer = React.memo(CachedTileLayerComponent);

// Stub exports for compatibility
export const tileCache = {
  init: async () => { },
  getStats: async () => ({ size: 0, maxSize: 1000, usage: 0 }),
  clearAll: async () => { }
};
