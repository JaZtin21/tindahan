import { useState, useEffect, useRef, useCallback } from 'react';

interface MapCenter {
  lat: number;
  lng: number;
}

interface UseDebouncedMapCenterOptions {
  delay?: number;
  maxZoom?: number;
  onCenterChange?: (center: MapCenter, zoom: number) => void;
}

/**
 * Hook to debounce map center changes and trigger callbacks only when zoom is within range.
 * 
 * @param initialCenter - Initial map center coordinates
 * @param initialZoom - Initial zoom level
 * @param options - Configuration options
 * @returns Current center, zoom, and a setter function
 * 
 * @example
 * const { center, zoom, setCenter, setZoom } = useDebouncedMapCenter(
 *   { lat: 14.5995, lng: 120.9842 },
 *   14,
 *   {
 *     delay: 500,
 *     maxZoom: 30,
 *     onCenterChange: (center, zoom) => {
 *       if (zoom <= 30) {
 *         fetchPostsNearLocation(center.lat, center.lng);
 *       }
 *     }
 *   }
 * );
 */
export function useDebouncedMapCenter(
  initialCenter: MapCenter,
  initialZoom: number,
  options: UseDebouncedMapCenterOptions = {}
) {
  const { delay = 500, maxZoom = 30, onCenterChange } = options;

  const [center, setCenter] = useState<MapCenter>(initialCenter);
  const [zoom, setZoom] = useState<number>(initialZoom);
  const [debouncedCenter, setDebouncedCenter] = useState<MapCenter>(initialCenter);
  const [debouncedZoom, setDebouncedZoom] = useState<number>(initialZoom);

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingCenterRef = useRef<MapCenter>(initialCenter);
  const pendingZoomRef = useRef<number>(initialZoom);

  // Clear timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Debounce center changes
  useEffect(() => {
    pendingCenterRef.current = center;
    pendingZoomRef.current = zoom;

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      setDebouncedCenter(center);
      setDebouncedZoom(zoom);

      // Only trigger callback if zoom is within the allowed range
      if (zoom <= maxZoom && onCenterChange) {
        onCenterChange(center, zoom);
      }
    }, delay);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [center, zoom, delay, maxZoom, onCenterChange]);

  // Manual setter for center with immediate update option
  const updateCenter = useCallback((newCenter: MapCenter, immediate = false) => {
    setCenter(newCenter);
    if (immediate) {
      setDebouncedCenter(newCenter);
      pendingCenterRef.current = newCenter;
    }
  }, []);

  // Manual setter for zoom with immediate update option
  const updateZoom = useCallback((newZoom: number, immediate = false) => {
    setZoom(newZoom);
    if (immediate) {
      setDebouncedZoom(newZoom);
      pendingZoomRef.current = newZoom;
    }
  }, []);

  // Force trigger the callback manually
  const triggerFetch = useCallback(() => {
    if (onCenterChange && debouncedZoom <= maxZoom) {
      onCenterChange(debouncedCenter, debouncedZoom);
    }
  }, [debouncedCenter, debouncedZoom, maxZoom, onCenterChange]);

  return {
    // Current values (updated immediately)
    center,
    zoom,
    // Debounced values (updated after delay)
    debouncedCenter,
    debouncedZoom,
    // Setters
    setCenter: updateCenter,
    setZoom: updateZoom,
    // Manual trigger
    triggerFetch,
  };
}

export default useDebouncedMapCenter;
