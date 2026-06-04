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
          <div style="width: 36px; height: 36px; background: white; border-radius: 50% 50% 50% 0; border: 2px solid #EF4444; display: flex; align-items: center; justify-content: center; font-size: 20px; cursor: pointer; box-shadow: 0 2px 6px rgba(0,0,0,0.3); transform: rotate(-45deg); transition: transform 0.2s;">
            <span style="transform: rotate(45deg);">📍</span>
          </div>
        `,
        className: 'location-pin-marker-icon',
        iconSize: [36, 36],
        iconAnchor: [18, 36],
        popupAnchor: [0, -36]
      });
      
      const marker = L.marker([location.lat, location.lng], { icon });
      
      // Add hover effects
      marker.on('mouseover', () => {
        const element = marker.getElement();
        if (element) {
          element.style.transform = 'scale(1.1) rotate(-45deg)';
        }
      });
      
      marker.on('mouseout', () => {
        const element = marker.getElement();
        if (element) {
          element.style.transform = 'scale(1) rotate(-45deg)';
        }
      });
      
      // Add popup with location info
      if (location.name || location.address) {
        const popupContent = `
          <div style="font-family: system-ui; font-size: 14px; padding: 8px;">
            <div style="font-weight: 600; margin-bottom: 4px;">${location.name}</div>
            ${location.address ? `<div style="color: #666; font-size: 12px;">${location.address}</div>` : ''}
          </div>
        `;
        marker.bindPopup(popupContent);
      }
      
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
  }, [location, map]);

  return null;
}
