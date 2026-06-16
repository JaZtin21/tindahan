import { useRef, useEffect } from 'react';
import { useMap } from 'react-leaflet';
import type { LocationPinData } from '../../types/map';

interface LocationPinMarkerProps {
  location: LocationPinData;
}

export function LocationPinMarker({ location }: LocationPinMarkerProps) {
  const map = useMap();
  const markerRef = useRef<any>(null);
  const locationRef = useRef<string>('');
  
  useEffect(() => {
    if (!location || !location.lat || !location.lng) return;
    
    // Create a key to detect actual location changes
    const locationKey = `${location.lat}-${location.lng}-${location.name}`;
    
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
      
      // Create pin icon using emoji - MEDIUM with background
      const icon = L.divIcon({
        html: `
            <svg width="24" height="24" viewBox="0 0 24 24" fill="#EF4444" stroke="none" style="display: block;">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                <circle cx="12" cy="10" r="3" fill="white"/>
              </svg>
        
        `,
        className: 'location-pin-marker-icon',
        iconSize: [36, 36],
        iconAnchor: [18, 36],
        popupAnchor: [0, -36]
      });
      
      const marker = L.marker([location.lat, location.lng], { icon });
      
      
      
      marker.addTo(map);

      const element = markerRef.current.getElement();
      if (element) {
          element.style.zIndex = '100';
      }
      markerRef.current = marker;
    };
    
    init();
    
    return () => {
      if (markerRef.current) {
        map.removeLayer(markerRef.current);
        markerRef.current = null;
      }
    };
  }, [location, map]);

  return null;
}
