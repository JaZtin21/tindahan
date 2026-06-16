import { useRef, useEffect } from 'react';
import { useMap } from 'react-leaflet';
import type { ProductStore } from '../../types/map';

interface ProductStoreMarkersProps {
  stores: ProductStore[];
  onStoreClick?: (store: ProductStore) => void;
}

export function ProductStoreMarkers({ stores, onStoreClick }: ProductStoreMarkersProps) {
  const map = useMap();
  const markersRef = useRef<any[]>([]);
  const storesRef = useRef<string>('');
  const onClickRef = useRef(onStoreClick);

  // Keep callback ref updated
  onClickRef.current = onStoreClick;

  useEffect(() => {
    if (!stores || stores.length === 0) {
      // Clear existing markers if no stores
      markersRef.current.forEach(marker => {
        if (marker) map.removeLayer(marker);
      });
      markersRef.current = [];
      return;
    }

    // Create a key to detect actual stores changes
    const storesKey = stores.map(s => `${s.id}-${s.lat}-${s.lng}`).sort().join('|');

    // If same stores, don't re-render
    if (storesKey === storesRef.current) {
      return;
    }

    storesRef.current = storesKey;

    const init = async () => {
      const L = await import('leaflet');

      // Remove existing markers
      markersRef.current.forEach(marker => {
        if (marker) map.removeLayer(marker);
      });
      markersRef.current = [];

      // Create markers for each store
      const newMarkers = stores.map(store => {
        // Create shop icon using emoji - same style as shop marker
        const icon = L.divIcon({
          html: `
            <div style="position: relative; width: 28px; height: 28px; background: white; border-radius: 50%; border: 2px solid #63c6a6; display: flex; align-items: center; justify-content: center; font-size: 16px; cursor: pointer; box-shadow: 0 2px 6px rgba(0,0,0,0.3); transition: transform 0.2s; will-change: transform;">
              🏪
            </div>
          `,
          className: 'product-store-marker-icon',
          iconSize: [28, 28],
          iconAnchor: [14, 14],
          popupAnchor: [0, -14]
        });

        const marker = L.marker([store.lat, store.lng], {
          icon,
          zIndexOffset: 1000,
          riseOnHover: false,
          bubblingMouseEvents: false
        });

        // Add click handler using ref
        marker.on('click', () => {
          onClickRef.current?.(store);
        });

        // Add hover effects
        marker.on('mouseover', () => {
          const element = marker.getElement();
          if (element) {
            const innerDiv = element.querySelector('div');
            if (innerDiv) {
              (innerDiv as HTMLElement).style.transform = 'scale(1.1)';
            }
          }
        });

        marker.on('mouseout', () => {
          const element = marker.getElement();
          if (element) {
            const innerDiv = element.querySelector('div');
            if (innerDiv) {
              (innerDiv as HTMLElement).style.transform = 'scale(1)';
            }
          }
        });

        // Add popup with store info
        const storeName = store.name || (store as any).title || 'Store';
        const popupContent = `
          <div style="font-family: system-ui; font-size: 14px; min-width: 110px; max-wdith: 130px; width: 100%">
            <div style="font-weight: 600; margin-bottom: 4px; color: #000000;">${storeName}</div>
            ${store.address ? `<div style="color: #333333; font-size: 12px;">${store.address}</div>` : ''}
          </div>
        `;
        marker.bindPopup(popupContent);

        marker.addTo(map);
        const element = marker.getElement();
        if (element) {
            element.style.zIndex = '100';
        }
        return marker;
      });

      markersRef.current = newMarkers;
    };

    init();
  }, [stores, map]);

  // Separate effect to handle component unmount cleanup
  useEffect(() => {
    return () => {
      markersRef.current.forEach(marker => {
        if (marker) {
          map.removeLayer(marker);
        }
      });
      markersRef.current = [];
      storesRef.current = '';
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
