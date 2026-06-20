import React, { useState, useRef, useEffect } from 'react';
import { Marker } from 'react-map-gl/maplibre'; // 🚀 NATIVE GEO-POSITIONING [INDEX]
import type { StoreLocationData } from '../../types/map';

interface StoreMarkerProps {
  store: StoreLocationData;
  onClick?: (store: StoreLocationData) => void;
}

export function StoreMarker({ store, onClick }: StoreMarkerProps) {
  const [isHovered, setIsHovered] = useState(false);
  const elementRef = useRef<HTMLDivElement>(null);

  // 🚀 Bypasses container boundaries to elevate the root MapLibre marker z-index on hover
  useEffect(() => {
    if (!elementRef.current) return;
    const wrapper = elementRef.current.parentElement;
    if (wrapper) {
      wrapper.style.zIndex = isHovered ? '20' : '10';
    }
  }, [isHovered]);

  if (!store || !store.lat || !store.lng) return null;

  // Mirrors your exact Leaflet html block style attributes inline
  const iconStyle = {
    position: 'relative',
    width: '32px',
    height: '32px',
    background: 'white',
    borderRadius: '50%',
    border: '2px solid #63c6a6',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '18px',
    cursor: 'pointer',
    boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
    transform: isHovered ? 'scale(1.1)' : 'scale(1)',
    transition: 'transform 0.2s ease-out',
    willChange: 'transform',
    WebkitBackfaceVisibility: 'hidden',
    backfaceVisibility: 'hidden'
  } as React.CSSProperties;

  return (
    <Marker
      latitude={store.lat}
      longitude={store.lng}
      // Matches iconAnchor: [16, 16] (center of 32x32 icon) [INDEX]
      offsetLeft={-16}
      offsetTop={-16}
      rotationAlignment="viewport"
      pitchAlignment="viewport"
    >
      <div
        ref={elementRef}
        style={iconStyle}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={(e) => {
          e.stopPropagation(); // Stops background canvas clicking misfires
          onClick?.(store);    // Forwards data structure safely up
        }}
      >
        🏪
      </div>
    </Marker>
  );
}
