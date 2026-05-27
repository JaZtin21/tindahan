import { Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { useRef } from 'react';

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
  const markerRef = useRef<L.Marker>(null);

  // Create custom icon with user profile picture
  const icon = L.divIcon({
    html: `
      <div class="post-search-marker" style="position: relative; width: 50px; height: 60px; display: flex; flex-direction: column; align-items: center; cursor: pointer;">
        <div class="profile-picture" style="
          width: 40px; 
          height: 40px; 
          border-radius: 50%; 
          background-image: url('${post.authorProfilePhoto || 'https://via.placeholder.com/40'}');
          background-size: cover;
          background-position: center;
          border: 3px solid #2563eb;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          z-index: 2;
        "></div>
        <div class="pin" style="
          position: absolute;
          bottom: 0;
          width: 20px;
          height: 20px;
          background: #2563eb;
          border-radius: 50% 50% 50% 0;
          transform: rotate(-45deg);
          border: 3px solid white;
          box-shadow: 0 2px 4px rgba(0,0,0,0.3);
          z-index: 1;
        "></div>
      </div>
    `,
    className: 'post-search-icon',
    iconSize: [50, 60],
    iconAnchor: [25, 60],
    popupAnchor: [0, -60]
  });

  return (
    <Marker
      ref={markerRef}
      position={[post.lat, post.lng]}
      icon={icon}
      eventHandlers={{
        click: () => {
          if (onClick) onClick(post);
        }
      }}
    >
      <Popup>
        <div style={{ fontFamily: 'system-ui', fontSize: '14px' }}>
          <div style={{ fontWeight: 600, marginBottom: '4px' }}>{post.title}</div>
          <div style={{ fontSize: '12px', color: '#666' }}>Posted by: {post.authorName}</div>
        </div>
      </Popup>
    </Marker>
  );
}
