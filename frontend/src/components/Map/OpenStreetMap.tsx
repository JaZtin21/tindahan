import { useEffect, useRef, useState } from 'react';

interface MapProps {
  center: { lat: number; lng: number };
  zoom: number;
  onMapClick?: (lat: number, lng: number) => void;
  onMarkerClick?: (store: { lat: number; lng: number; name: string }) => void;
  markers?: Array<{ lat: number; lng: number; title?: string }>;
}

export function OpenStreetMap({ center, zoom, onMapClick, onMarkerClick, markers = [] }: MapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    // Load Leaflet CSS
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(link);

    // Load Leaflet JS
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.async = true;

    script.onload = () => {
      const L = (window as any).L;
      
      // Check if container already has a map
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
      }
      
      // Clear any existing content
      if (mapRef.current) {
        mapRef.current.innerHTML = '';
      }
      
      // Initialize map
      const map = L.map(mapRef.current).setView([center.lat, center.lng], zoom);
      mapInstanceRef.current = map;

      // Use CartoDB Voyager tile layer (more Google Maps-like)
      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '© OpenStreetMap contributors © CARTO',
        subdomains: 'abcd',
        maxZoom: 20,
      }).addTo(map);

      // Apply custom styling - remove problematic marker filter
      const styleSheet = document.createElement('style');
      styleSheet.textContent = `
        .leaflet-container {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        .leaflet-popup-content-wrapper {
          border-radius: 8px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.15);
        }
        .leaflet-popup-content {
          font-size: 14px;
          margin: 12px;
        }
        .leaflet-control-zoom {
          border: none !important;
          box-shadow: 0 2px 8px rgba(0,0,0,0.15) !important;
        }
        .leaflet-control-zoom a {
          background: white !important;
          color: #333 !important;
          border-bottom: 1px solid #ccc !important;
        }
        .leaflet-control-zoom a:last-child {
          border-bottom: none !important;
        }
      `;
      document.head.appendChild(styleSheet);

      // Add custom markers with better styling
      markers.forEach(markerData => {
        const customIcon = L.divIcon({
          html: `
            <div style="
              background: #ea4335;
              width: 32px;
              height: 32px;
              border-radius: 50% 50% 50% 0;
              transform: rotate(-45deg);
              border: 2px solid white;
              box-shadow: 0 2px 8px rgba(0,0,0,0.3);
              display: flex;
              align-items: center;
              justify-content: center;
            ">
              <div style="
                background: white;
                width: 8px;
                height: 8px;
                border-radius: 50%;
                transform: rotate(45deg);
              "></div>
            </div>
          `,
          iconSize: [32, 32],
          iconAnchor: [16, 32],
          popupAnchor: [0, -32],
          className: 'custom-marker'
        });

        const marker = L.marker([markerData.lat, markerData.lng], { icon: customIcon })
          .addTo(map)
          .bindPopup(`
            <div style="font-weight: 600; color: #202124; margin-bottom: 4px;">
              ${markerData.title || 'Store Location'}
            </div>
            <div style="color: #5f6368; font-size: 12px;">
              📍 ${markerData.lat.toFixed(4)}, ${markerData.lng.toFixed(4)}
            </div>
          `)
          .on('click', () => {
            if (onMarkerClick && markerData.title) {
              onMarkerClick({
                lat: markerData.lat,
                lng: markerData.lng,
                name: markerData.title
              });
            }
          });
      });

      // Add click listener
      if (onMapClick) {
        map.on('click', (event: any) => {
          const lat = event.latlng.lat;
          const lng = event.latlng.lng;
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
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
      if (document.head.contains(link)) {
        document.head.removeChild(link);
      }
      if (document.head.contains(script)) {
        document.head.removeChild(script);
      }
    };
  }, []);

  // Handle center and zoom changes - ALWAYS UPDATE
  useEffect(() => {
    if (mapInstanceRef.current && mapLoaded) {
      const map = mapInstanceRef.current;
      
      console.log('Updating map to:', { center, zoom });
      
      // Always fly to the new location - no comparison bullshit
      map.flyTo([center.lat, center.lng], zoom, {
        duration: 1.5,
        easeLinearity: 0.5
      });
    }
  }, [center, zoom, mapLoaded]);

  return (
    <div className="w-full h-full relative">
      {!mapLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-zinc-100 dark:bg-zinc-800 z-10">
          <div className="text-zinc-600 dark:text-zinc-400">Loading map...</div>
        </div>
      )}
      <div ref={mapRef} className="w-full h-full" />
    </div>
  );
}
