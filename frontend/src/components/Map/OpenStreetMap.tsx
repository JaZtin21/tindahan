import { useEffect, useRef, useState } from 'react';

interface PostMarker {
  lat: number;
  lng: number;
  title?: string;
  type?: 'store' | 'post';
  post?: {
    id: string;
    title: string;
    text: string;
    photos: string[];
    author: {
      id: string;
      name: string;
      email: string;
    };
    likes: number;
    commentCount: number;
    createdAt: string;
  };
}

interface MapProps {
  center: { lat: number; lng: number };
  zoom: number;
  onMapClick?: (lat: number, lng: number) => void;
  onMarkerClick?: (store: { lat: number; lng: number; name: string }) => void;
  onMapMoveEnd?: (center: { lat: number; lng: number }, zoom: number) => void;
  markers?: PostMarker[];
  currentLocation?: { lat: number; lng: number; name?: string } | null;
}

export function OpenStreetMap({ center, zoom, onMapClick, onMarkerClick, onMapMoveEnd, markers = [], currentLocation }: MapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const currentLocationMarkerRef = useRef<any>(null);
  const markersLayerRef = useRef<any>(null);
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
        attribution: 'OpenStreetMap contributors CARTO',
        subdomains: 'abcd',
        maxZoom: 20,
      }).addTo(map);

      // Apply custom styling
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
        .leaflet-control-attribution {
          display: none !important;
        }
      `;
      document.head.appendChild(styleSheet);

      // Create markers layer group
      markersLayerRef.current = L.layerGroup().addTo(map);
      
      // Render markers
      renderMarkers(markers, map, L, onMarkerClick);

      // Add click listener
      if (onMapClick) {
        map.on('click', (event: any) => {
          const lat = event.latlng.lat;
          const lng = event.latlng.lng;
          onMapClick(lat, lng);
        });
      }

      // Add moveend listener to track map center and zoom
      if (onMapMoveEnd) {
        map.on('moveend', () => {
          const mapCenter = map.getCenter();
          const mapZoom = map.getZoom();
          onMapMoveEnd(
            { lat: mapCenter.lat, lng: mapCenter.lng },
            mapZoom
          );
        });
      }

      setMapLoaded(true);
    };
    
    // Helper function to render markers
    function renderMarkers(markersData: PostMarker[], mapInstance: any, L: any, onMarkerClickHandler?: (store: { lat: number; lng: number; name: string }) => void) {
      if (!markersLayerRef.current) return;
      
      // Clear existing markers
      markersLayerRef.current.clearLayers();
      
      markersData.forEach(markerData => {
        const isPost = markerData.type === 'post';
        
        if (isPost && markerData.post) {
          // Create conversation bubble marker for posts
          const post = markerData.post;
          const authorInitial = post.author.name.charAt(0).toUpperCase();
          const shortTitle = post.title.length > 25 ? post.title.substring(0, 25) + '...' : post.title;
          const shortText = post.text.length > 40 ? post.text.substring(0, 40) + '...' : post.text;
          
          const bubbleIcon = L.divIcon({
            html: `
              <div style="
                position: relative;
                display: flex;
                flex-direction: column;
                align-items: flex-start;
                max-width: 200px;
              ">
                <!-- Conversation Bubble -->
                <div style="
                  background: white;
                  border-radius: 12px;
                  padding: 8px 12px;
                  box-shadow: 0 2px 8px rgba(0,0,0,0.15);
                  border: 1px solid #e0e0e0;
                  min-width: 140px;
                  position: relative;
                ">
                  <!-- Title -->
                  <div style="
                    font-weight: 600;
                    font-size: 12px;
                    color: #1a1a1a;
                    margin-bottom: 4px;
                    line-height: 1.3;
                  ">${shortTitle}</div>
                  <!-- Description -->
                  <div style="
                    font-size: 11px;
                    color: #666;
                    line-height: 1.3;
                    margin-bottom: 6px;
                  ">${shortText}</div>
                  <!-- Author row -->
                  <div style="
                    display: flex;
                    align-items: center;
                    gap: 6px;
                  ">
                    <!-- Profile avatar -->
                    <div style="
                      width: 20px;
                      height: 20px;
                      border-radius: 50%;
                      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                      display: flex;
                      align-items: center;
                      justify-content: center;
                      color: white;
                      font-size: 10px;
                      font-weight: 600;
                      flex-shrink: 0;
                    ">${authorInitial}</div>
                    <div style="
                      font-size: 10px;
                      color: #888;
                      flex: 1;
                      overflow: hidden;
                      text-overflow: ellipsis;
                      white-space: nowrap;
                    ">${post.author.name}</div>
                    <!-- Likes -->
                    <div style="
                      font-size: 10px;
                      color: #e91e63;
                      display: flex;
                      align-items: center;
                      gap: 2px;
                    ">❤️ ${post.likes}</div>
                  </div>
                </div>
                <!-- Triangle pointer -->
                <div style="
                  width: 0;
                  height: 0;
                  border-left: 8px solid transparent;
                  border-right: 8px solid transparent;
                  border-top: 8px solid white;
                  margin-left: 20px;
                  filter: drop-shadow(0 2px 2px rgba(0,0,0,0.1));
                "></div>
              </div>
            `,
            iconSize: [200, 100],
            iconAnchor: [20, 0],
            popupAnchor: [0, 10],
            className: 'post-bubble-marker'
          });
          
          const marker = L.marker([markerData.lat, markerData.lng], { icon: bubbleIcon })
            .bindPopup(`
              <div style="min-width: 200px;">
                <div style="font-weight: 600; font-size: 14px; color: #1a1a1a; margin-bottom: 8px;">
                  ${post.title}
                </div>
                <div style="font-size: 13px; color: #444; line-height: 1.4; margin-bottom: 10px;">
                  ${post.text}
                </div>
                <div style="display: flex; align-items: center; gap: 8px; padding-top: 8px; border-top: 1px solid #eee;">
                  <div style="
                    width: 28px;
                    height: 28px;
                    border-radius: 50%;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: white;
                    font-size: 12px;
                    font-weight: 600;
                  ">${authorInitial}</div>
                  <div style="flex: 1;">
                    <div style="font-size: 12px; font-weight: 500; color: #1a1a1a;">${post.author.name}</div>
                    <div style="font-size: 11px; color: #888;">${post.author.email}</div>
                  </div>
                </div>
                <div style="display: flex; gap: 12px; margin-top: 10px; font-size: 12px; color: #666;">
                  <span>❤️ ${post.likes} likes</span>
                  <span>💬 ${post.commentCount} comments</span>
                </div>
              </div>
            `);
          
          markersLayerRef.current.addLayer(marker);
        } else {
          // Store marker (original style)
          const customIcon = L.divIcon({
            html: `
              <div style="
                background: #4285f4;
                width: 36px;
                height: 36px;
                border-radius: 8px;
                border: 2px solid white;
                box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 18px;
              ">
                🏪
              </div>
            `,
            iconSize: [36, 36],
            iconAnchor: [18, 36],
            popupAnchor: [0, -36],
            className: 'custom-store-marker'
          });

          const marker = L.marker([markerData.lat, markerData.lng], { icon: customIcon })
            .bindPopup(`
              <div style="font-weight: 600; color: #202124; margin-bottom: 4px;">
                ${markerData.title || 'Store Location'}
              </div>
              <div style="color: #5f6368; font-size: 12px;">
                📍 ${markerData.lat.toFixed(4)}, ${markerData.lng.toFixed(4)}
              </div>
            `)
            .on('click', () => {
              if (onMarkerClickHandler && markerData.title) {
                onMarkerClickHandler({
                  lat: markerData.lat,
                  lng: markerData.lng,
                  name: markerData.title
                });
              }
            });
          
          markersLayerRef.current.addLayer(marker);
        }
      });
    }

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

  // Handle center and zoom changes - only update when actually different
  useEffect(() => {
    if (mapInstanceRef.current && mapLoaded) {
      const map = mapInstanceRef.current;
      const currentCenter = map.getCenter();
      const currentZoom = map.getZoom();
      
      // Only fly if center changed by more than 0.0001 degrees or zoom changed
      const latDiff = Math.abs(currentCenter.lat - center.lat);
      const lngDiff = Math.abs(currentCenter.lng - center.lng);
      const zoomDiff = Math.abs(currentZoom - zoom);
      
      if (latDiff > 0.0001 || lngDiff > 0.0001 || zoomDiff > 0.5) {
        map.flyTo([center.lat, center.lng], zoom, {
          duration: 1.5,
          easeLinearity: 0.5
        });
      }
    }
  }, [center, zoom, mapLoaded]);

  // Handle markers update when markers prop changes
  useEffect(() => {
    if (!mapInstanceRef.current || !mapLoaded || !markersLayerRef.current) return;
    
    const L = (window as any).L;
    
    // Helper function to render markers (defined inside effect scope)
    function updateMarkers(markersData: PostMarker[]) {
      if (!markersLayerRef.current) return;
      
      // Clear existing markers
      markersLayerRef.current.clearLayers();
      
      markersData.forEach(markerData => {
        const isPost = markerData.type === 'post';
        
        if (isPost && markerData.post) {
          // Create conversation bubble marker for posts
          const post = markerData.post;
          const authorInitial = post.author.name.charAt(0).toUpperCase();
          const shortTitle = post.title.length > 25 ? post.title.substring(0, 25) + '...' : post.title;
          const shortText = post.text.length > 40 ? post.text.substring(0, 40) + '...' : post.text;
          
          const bubbleIcon = L.divIcon({
            html: `
              <div style="
                position: relative;
                display: flex;
                flex-direction: column;
                align-items: flex-start;
                max-width: 200px;
              ">
                <!-- Conversation Bubble -->
                <div style="
                  background: white;
                  border-radius: 12px;
                  padding: 8px 12px;
                  box-shadow: 0 2px 8px rgba(0,0,0,0.15);
                  border: 1px solid #e0e0e0;
                  min-width: 140px;
                  position: relative;
                ">
                  <!-- Title -->
                  <div style="
                    font-weight: 600;
                    font-size: 12px;
                    color: #1a1a1a;
                    margin-bottom: 4px;
                    line-height: 1.3;
                  ">${shortTitle}</div>
                  <!-- Description -->
                  <div style="
                    font-size: 11px;
                    color: #666;
                    line-height: 1.3;
                    margin-bottom: 6px;
                  ">${shortText}</div>
                  <!-- Author row -->
                  <div style="
                    display: flex;
                    align-items: center;
                    gap: 6px;
                  ">
                    <!-- Profile avatar -->
                    <div style="
                      width: 20px;
                      height: 20px;
                      border-radius: 50%;
                      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                      display: flex;
                      align-items: center;
                      justify-content: center;
                      color: white;
                      font-size: 10px;
                      font-weight: 600;
                      flex-shrink: 0;
                    ">${authorInitial}</div>
                    <div style="
                      font-size: 10px;
                      color: #888;
                      flex: 1;
                      overflow: hidden;
                      text-overflow: ellipsis;
                      white-space: nowrap;
                    ">${post.author.name}</div>
                    <!-- Likes -->
                    <div style="
                      font-size: 10px;
                      color: #e91e63;
                      display: flex;
                      align-items: center;
                      gap: 2px;
                    ">❤️ ${post.likes}</div>
                  </div>
                </div>
                <!-- Triangle pointer -->
                <div style="
                  width: 0;
                  height: 0;
                  border-left: 8px solid transparent;
                  border-right: 8px solid transparent;
                  border-top: 8px solid white;
                  margin-left: 20px;
                  filter: drop-shadow(0 2px 2px rgba(0,0,0,0.1));
                "></div>
              </div>
            `,
            iconSize: [200, 100],
            iconAnchor: [20, 0],
            popupAnchor: [0, 10],
            className: 'post-bubble-marker'
          });
          
          const marker = L.marker([markerData.lat, markerData.lng], { icon: bubbleIcon })
            .bindPopup(`
              <div style="min-width: 200px;">
                <div style="font-weight: 600; font-size: 14px; color: #1a1a1a; margin-bottom: 8px;">
                  ${post.title}
                </div>
                <div style="font-size: 13px; color: #444; line-height: 1.4; margin-bottom: 10px;">
                  ${post.text}
                </div>
                <div style="display: flex; align-items: center; gap: 8px; padding-top: 8px; border-top: 1px solid #eee;">
                  <div style="
                    width: 28px;
                    height: 28px;
                    border-radius: 50%;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: white;
                    font-size: 12px;
                    font-weight: 600;
                  ">${authorInitial}</div>
                  <div style="flex: 1;">
                    <div style="font-size: 12px; font-weight: 500; color: #1a1a1a;">${post.author.name}</div>
                    <div style="font-size: 11px; color: #888;">${post.author.email}</div>
                  </div>
                </div>
                <div style="display: flex; gap: 12px; margin-top: 10px; font-size: 12px; color: #666;">
                  <span>❤️ ${post.likes} likes</span>
                  <span>💬 ${post.commentCount} comments</span>
                </div>
              </div>
            `);
          
          markersLayerRef.current.addLayer(marker);
        } else {
          // Store marker (original style)
          const customIcon = L.divIcon({
            html: `
              <div style="
                background: #4285f4;
                width: 36px;
                height: 36px;
                border-radius: 8px;
                border: 2px solid white;
                box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 18px;
              ">
                🏪
              </div>
            `,
            iconSize: [36, 36],
            iconAnchor: [18, 36],
            popupAnchor: [0, -36],
            className: 'custom-store-marker'
          });

          const marker = L.marker([markerData.lat, markerData.lng], { icon: customIcon })
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
          
          markersLayerRef.current.addLayer(marker);
        }
      });
    }
    
    // Update markers
    updateMarkers(markers);
  }, [markers, mapLoaded, onMarkerClick]);

  // Handle current location marker updates
  useEffect(() => {
    if (!mapInstanceRef.current || !mapLoaded) return;

    const map = mapInstanceRef.current;
    const L = (window as any).L;

    // Remove existing current location marker
    if (currentLocationMarkerRef.current) {
      map.removeLayer(currentLocationMarkerRef.current);
      currentLocationMarkerRef.current = null;
    }

    // Add current location marker if available
    if (currentLocation) {
      const currentLocationIcon = L.divIcon({
        html: `
          <div style="
            background: #ea4335;
            width: 40px;
            height: 40px;
            border-radius: 50%;
            border: 3px solid white;
            box-shadow: 0 2px 12px rgba(234, 67, 53, 0.4);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 20px;
            animation: pulse 2s infinite;
          ">
            🎯
          </div>
          <style>
            @keyframes pulse {
              0% { transform: scale(1); opacity: 1; }
              50% { transform: scale(1.1); opacity: 0.8; }
              100% { transform: scale(1); opacity: 1; }
            }
          </style>
        `,
        iconSize: [40, 40],
        iconAnchor: [20, 40],
        popupAnchor: [0, -40],
        className: 'current-location-marker'
      });

      const marker = L.marker([currentLocation.lat, currentLocation.lng], { icon: currentLocationIcon })
        .addTo(map)
        .bindPopup(`
          <div style="font-weight: 600; color: #202124; margin-bottom: 4px;">
            🎯 Your Current Location
          </div>
          <div style="color: #5f6368; font-size: 12px; margin-bottom: 4px;">
            ${currentLocation.name || 'Current Location'}
          </div>
          <div style="color: #5f6368; font-size: 12px;">
            📍 ${currentLocation.lat.toFixed(4)}, ${currentLocation.lng.toFixed(4)}
          </div>
        `);

      currentLocationMarkerRef.current = marker;
    }
  }, [currentLocation, mapLoaded]);

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
