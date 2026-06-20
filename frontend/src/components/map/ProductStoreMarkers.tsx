import React, { useState, useRef, useEffect } from 'react';
import { Marker } from 'react-map-gl/maplibre'; // 🚀 NATIVE GEO-POSITIONING
import type { ProductStore } from '../../types/map';

interface ProductStoreMarkersProps {
  stores: ProductStore[];
  onStoreClick?: (store: ProductStore) => void;
}

// Sub-component to encapsulate isolated hover scaling transitions cleanly
function ProductStoreMarkerItem({
  store,
  onStoreClick
}: {
  store: ProductStore;
  onStoreClick?: (store: ProductStore) => void;
}) {
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

  // Mirrors your exact Leaflet html style specifications hardcoded inline
  const iconStyle = {
    position: 'relative',
    width: '28px',
    height: '28px',
    background: 'white',
    borderRadius: '50%',
    border: '2px solid #63c6a6',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '16px',
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
      // Matches iconAnchor: [14, 14] precisely
      offsetLeft={-14}
      offsetTop={-14}
      rotationAlignment="viewport"
      pitchAlignment="viewport"
    >
      <div
        ref={elementRef}
        style={iconStyle}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={(e) => {
          e.stopPropagation();
          onStoreClick?.(store); // Forwards your store data object up
        }}
      >
        🏪
      </div>
    </Marker>
  );
}

export function ProductStoreMarkers({ stores, onStoreClick }: ProductStoreMarkersProps) {
  if (!stores || stores.length === 0) return null;

  return (
    <>
      {/* 🚀 DECLARATIVE MARKERS RENDER MATRIX LOOP */}
      {stores.map((store) => (
        <ProductStoreMarkerItem
          key={store.id || `${store.lat}-${store.lng}`}
          store={store}
          onStoreClick={onStoreClick}
        />
      ))}
    </>
  );
}
