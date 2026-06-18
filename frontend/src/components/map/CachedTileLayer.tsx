import React, { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';

interface CachedTileLayerProps {
  url: string;
  attribution?: string;
  maxZoom?: number;
}

function CachedTileLayerComponent({ url, attribution, maxZoom = 22 }: CachedTileLayerProps) {
  console.log('[CachedTileLayer] Component mount/render control initialization');

  const map = useMap();
  const layerRef = useRef<L.TileLayer | null>(null);

  useEffect(() => {
    // 1. Create the tile layer imperatively exactly ONCE
    const tileLayer = L.tileLayer(url, {
      attribution,
      maxZoom,
      crossOrigin: 'anonymous', // Allows your PWA Service Worker to cleanly save cross-domain assets
    });

    // 2. Attach directly to the low-level map instance, bypassing React reconciliation entirely
    tileLayer.addTo(map);
    layerRef.current = tileLayer;

    // 3. Apply your custom styling filters smoothly
    const container = tileLayer.getContainer();
    if (container) {
      container.style.filter = 'brightness(1.015) contrast(0.965) saturate(1.028)';
    }

    // 4. Strict cleanup: Safely destroy the layer only if the map layout fully unmounts
    return () => {
      if (layerRef.current && map) {
        map.removeLayer(layerRef.current);
        layerRef.current = null;
      }
    };
  }, []); // 🚨 CRITICAL: Strictly empty dependency array locks this execution from ever running again on parent zoom updates

  return null;
}

// Export memoized component to completely freeze props checking
export const CachedTileLayer = React.memo(CachedTileLayerComponent);

// Stub exports for backward compatibility with your project structure
export const tileCache = {
  init: async () => { },
  getStats: async () => ({ size: 0, maxSize: 1000, usage: 0 }),
  clearAll: async () => { }
};
