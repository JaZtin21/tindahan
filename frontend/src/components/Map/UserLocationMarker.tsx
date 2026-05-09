import { useRef, useEffect } from 'react';
import { useMap } from 'react-leaflet';

interface UserLocationMarkerProps {
  location: { lat: number; lng: number };
}

export function UserLocationMarker({ location }: UserLocationMarkerProps) {
  const map = useMap();
  const markerRef = useRef<any>(null);
  const locationRef = useRef<string>('');
  
  useEffect(() => {
    if (!location || !location.lat || !location.lng) return;
    
    // Create a key to detect actual location changes
    const locationKey = `${location.lat}-${location.lng}`;
    
    // If same location, don't re-render
    if (locationKey === locationRef.current && markerRef.current) {
      return;
    }
    
    locationRef.current = locationKey;
    
    const init = async () => {
      const L = await import('leaflet');
      
      // Remove existing marker if any (prevent duplicates)
      if (markerRef.current) {
        map.removeLayer(markerRef.current);
        markerRef.current = null;
      }
      
      // Create custom pin icon for user location
      const icon = L.divIcon({
        html: `
          <div class="user-location-marker" style="width: 40px; height: 40px; position: relative; display: flex; align-items: center; justify-content: center;">
            <div class="user-location-pulse" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 40px; height: 40px; background: rgba(239, 68, 68, 0.3); border: 2px solid rgba(239, 68, 68, 0.5); border-radius: 50%; animation: pulse-ring 2s ease-out infinite;"></div>
            <div class="user-location-pin" style="position: relative; z-index: 2; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3)); animation: location-bounce 2s ease-in-out infinite;">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="#EF4444" stroke="none" style="display: block;">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                <circle cx="12" cy="10" r="3" fill="white"/>
              </svg>
            </div>
          </div>
        `,
        className: 'user-location-icon',
        iconSize: [40, 40],
        iconAnchor: [20, 20], // Center the 40x40 box
        popupAnchor: [0, -20]
      });
      
      const marker = L.marker([location.lat, location.lng], { icon });
      
      // Set marker options to prevent it from moving during zoom
      marker.options.zIndexOffset = 1000;
      marker.options.riseOnHover = false;
      marker.options.bubblingMouseEvents = false;
      marker.bindPopup('<div style="font-family: system-ui; font-size: 14px; font-weight: 600;">Your Location</div>');
      marker.addTo(map);
      markerRef.current = marker;
    };
    
    init();
    
    return () => {
      if (markerRef.current && map) {
        map.removeLayer(markerRef.current);
        markerRef.current = null;
      }
    };
  }, [location, map]);

  return null;
}
