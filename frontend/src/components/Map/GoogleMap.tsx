import { useEffect, useRef, useState } from 'react';

interface MapProps {
  center: { lat: number; lng: number };
  zoom: number;
  onMapClick?: (lat: number, lng: number) => void;
  markers?: Array<{ lat: number; lng: number; title?: string }>;
}

export function GoogleMap({ center, zoom, onMapClick, markers = [] }: MapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  useEffect(() => {
    if (!mapRef.current || !import.meta.env.VITE_GOOGLE_MAPS_API_KEY) return;

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}&libraries=places`;
    script.async = true;
    script.defer = true;

    script.onload = () => {
      const map = new (window as any).google.maps.Map(mapRef.current, {
        center,
        zoom,
        mapTypeId: (window as any).google.maps.MapTypeId.ROADMAP,
        styles: [
          {
            featureType: 'poi',
            elementType: 'labels',
            stylers: [{ visibility: 'off' }]
          }
        ]
      });

      // Add markers
      markers.forEach(markerData => {
        new (window as any).google.maps.Marker({
          position: { lat: markerData.lat, lng: markerData.lng },
          map,
          title: markerData.title,
        });
      });

      // Add click listener
      if (onMapClick) {
        map.addListener('click', (event: any) => {
          const lat = event.latLng.lat();
          const lng = event.latLng.lng();
          onMapClick(lat, lng);
        });
      }

      setMapLoaded(true);
    };

    script.onerror = () => {
      setMapLoaded(false);
    };

    document.head.appendChild(script);

    return () => {
      // Cleanup
      if (document.head.contains(script)) {
        document.head.removeChild(script);
      }
    };
  }, [center, zoom, markers, onMapClick]);

  return (
    <div className="w-full h-96 rounded-2xl border border-zinc-200 dark:border-zinc-700 relative">
      {!mapLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-zinc-100 dark:bg-zinc-800">
          <div className="text-zinc-600 dark:text-zinc-400">Loading map...</div>
        </div>
      )}
      <div ref={mapRef} className="w-full h-full" />
    </div>
  );
}
