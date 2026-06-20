import React from 'react';
import { Marker } from 'react-map-gl/maplibre'; // 🚀 NATIVE GEO-POSITIONING [INDEX]

// 🚀 NATIVE ANIMATIONS CONTAINER: Restores your custom pulse ring and bounce loops seamlessly [INDEX]
const userLocationStyles = `
  @keyframes pulse-ring {
    0% { transform: translate(-50%, -50%) scale(0.5); opacity: 1; }
    100% { transform: translate(-50%, -50%) scale(1.2); opacity: 0; }
  }

  @keyframes location-bounce {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-4px); }
  }
`;

interface UserLocationMarkerProps {
  location: { lat: number; lng: number };
}

export function UserLocationMarker({ location }: UserLocationMarkerProps) {
  if (!location || !location.lat || !location.lng) return null;

  return (
    <>
      {/* Injecting animation variables directly safely into document canvas layout */}
      <style dangerouslySetInnerHTML={{ __html: userLocationStyles }} />

      <Marker
        latitude={location.lat}
        longitude={location.lng}
        // Matches iconAnchor: [20, 20] (center of 40x40 container box) [INDEX]
        offsetLeft={-20}
        offsetTop={-20}
        rotationAlignment="viewport"
        pitchAlignment="viewport"
      >
        <div
          style={{
            width: '40px',
            pointerEvents: 'none',
            height: '40px',
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100
          }}
          className="user-location-marker"
        >
          {/* 1. Concentric Wave Pulse Circle */}
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              width: '40px',
              height: '40px',
              background: 'rgba(239, 68, 68, 0.3)',
              border: '2px solid rgba(239, 68, 68, 0.5)',
              borderRadius: '50%',
              animation: 'pulse-ring 2s ease-out infinite'
            }}
          />
          {/* 2. Vector Pin Drop Target */}
          <div
            style={{
              position: 'relative',
              zIndex: 2,
              filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))',
              animation: 'location-bounce 2s ease-in-out infinite'
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="#EF4444" stroke="none" style={{ display: 'block' }}>
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" fill="white" />
            </svg>
          </div>
        </div>
      </Marker>
    </>
  );
}
