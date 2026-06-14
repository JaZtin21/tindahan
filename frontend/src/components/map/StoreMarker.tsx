import { useRef, useEffect } from 'react';
import { useMap } from 'react-leaflet';
import type { StoreLocationData } from '../../types/map';

interface StoreMarkerProps {
  store: StoreLocationData;
  onClick?: (store: StoreLocationData) => void;
}

export function StoreMarker({ store, onClick }: StoreMarkerProps) {
  const map = useMap();
  const markerRef = useRef<any>(null);
  const storeRef = useRef<string>('');
  const onClickRef = useRef(onClick);

  // Keep callback ref updated
  onClickRef.current = onClick;

  useEffect(() => {
    if (!store || !store.lat || !store.lng) return;

    // Create a key to detect actual store changes
    const storeKey = `${store.id}-${store.lat}-${store.lng}`;

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
          <div style="position: relative; width: 32px; height: 32px; background: white; border-radius: 50%; border: 2px solid  #63c6a6; display: flex; align-items: center; justify-content: center; font-size: 18px; cursor: pointer; box-shadow: 0 2px 6px rgba(0,0,0,0.3); transition: transform 0.2s; will-change: transform;">
            🏪
          </div>
        `,
        className: 'store-marker-icon',
        iconSize: [32, 32],
        iconAnchor: [16, 16],
        popupAnchor: [0, -16]
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
  }, [store, map]);

  return null;
}
