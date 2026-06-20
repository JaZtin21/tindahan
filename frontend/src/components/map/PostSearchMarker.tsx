import React, { useState, useRef, useEffect } from 'react';
import { Marker } from 'react-map-gl/maplibre'; // 🚀 RESTORED MAPLIBRE POSITIONING WRAPPER

interface PostSearchMarkerProps {
  post: {
    id: string;
    title: string;
    authorName: string;
    authorProfilePhoto?: string;
    lat: number;
    lng: number;
  };
  onClick?: (post: any) => void;
}

export function PostSearchMarker({ post, onClick }: PostSearchMarkerProps) {
  const [isHovered, setIsHovered] = useState(false);
  const markerRef = useRef<HTMLDivElement>(null);

  // 🚀 MANUALLY ELEVATE ROOT WRAPPER ON HOVER:
  // Replicates Leaflet's stacking mechanisms to pull the active pin above all other map assets
  useEffect(() => {
    if (!markerRef.current) return;
    const wrapper = markerRef.current.parentElement;
    if (wrapper) {
      wrapper.style.zIndex = isHovered ? '20' : '10';
    }
  }, [isHovered]);

  // Combined your original element container styles and your custom hover transformations
  const markerStyle = {
    transform: isHovered ? 'scale(1.1)' : 'scale(1)',
    transition: 'transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
    willChange: 'transform',
    WebkitBackfaceVisibility: 'hidden',
    backfaceVisibility: 'hidden',
    position: 'relative',
    width: '50px',
    height: '60px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    cursor: 'pointer'
  } as React.CSSProperties;

  return (
    <Marker
      // 🚀 PHYSICAL GEO-POSITIONING BOUND: MapLibre reads coordinates directly here
      latitude={post.lat}
      longitude={post.lng}

      // 🚀 ICON ANCHOR TRANSLATION MATCH: [25, 60] maps perfectly to these negative offsets
      offsetLeft={-25}
      offsetTop={-60}

      // Keep pins straight when map turns or pitches
      rotationAlignment="viewport"
      pitchAlignment="viewport"
    >
      <div
        ref={markerRef}
        style={markerStyle}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={(e) => {
          e.stopPropagation(); // Stops map background clicks from interrupting pin triggers
          if (onClick) onClick(post); // 🚀 FORWARDS POST DATA STRUCTURE SAFELY BACK TO PARENT
        }}
        className="post-search-marker"
      >
        {/* 1. Profile Picture Circle Frame */}
        <div
          className="profile-picture"
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            backgroundImage: `url('${post.authorProfilePhoto || 'https://via.placeholder.com/40'}')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            border: '3px solid #63c6a6',
            boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
            zIndex: 2,
          }}
        />
        {/* 2. Positioning down pin tear layout triangle */}
        <div
          className="pin"
          style={{
            position: 'absolute',
            bottom: 0,
            width: '20px',
            height: '20px',
            background: '#63c6a6',
            borderRadius: '50% 50% 50% 0',
            transform: 'rotate(-45deg)',
            border: '3px solid white',
            boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
            zIndex: 1,
          }}
        />
      </div>
    </Marker>
  );
}
