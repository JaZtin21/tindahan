import React from 'react';
import { Marker } from 'react-map-gl/maplibre'; // 🚀 NATIVE GEO-POSITIONING
import type { LocationPinData } from '../../types/map';

interface LocationPinMarkerProps {
  location: LocationPinData;
}

export function LocationPinMarker({ location }: LocationPinMarkerProps) {
  if (!location || !location.lat || !location.lng) return null;

  return (
    <Marker
      latitude={location.lat}
      longitude={location.lng}

      // 🚀 ICON ANCHOR MATCH: Maps a 24x24 pixel dimension frame to sit right on its pointer tip
      offsetLeft={-12}
      offsetTop={-24}

      // Keep pins straight when map turns or tilts
      rotationAlignment="viewport"
      pitchAlignment="viewport"
    >
      <div
        style={{
          width: '24px',
          height: '24px',
          filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.35))',
          pointerEvents: 'none', // Prevents icon vector from blocking canvas events
          zIndex: 100
        }}
        className="location-pin-marker-icon"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="#EF4444" stroke="none" style={{ display: 'block' }}>
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
          <circle cx="12" cy="10" r="3" fill="white" />
        </svg>
      </div>
    </Marker>
  );
}
