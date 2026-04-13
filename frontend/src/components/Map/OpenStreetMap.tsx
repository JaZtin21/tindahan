import { useEffect, useRef, useState } from 'react';
import type { PostMarker, MapProps } from '../../types';
import {
  getStoreMarkerHtml,
  getStorePopupHtml,
  getCurrentLocationHtml,
  getCurrentLocationPopupHtml,
  getMapMarkerStyles,
} from './mapStyles';
import {
  getPostIcon,
  getPostPopupHtml,
} from './PostMarker';

export function OpenStreetMap({ center, zoom, onMapClick, onMarkerClick, onMapMoveEnd, markers = [], currentLocation }: MapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const currentLocationMarkerRef = useRef<any>(null);
  const markersLayerRef = useRef<any>(null);
  // Track existing markers by ID to enable diffing instead of clearLayers
  const existingMarkersRef = useRef<Map<string, any>>(new Map());
  // Track which post IDs have been animated to prevent double animation during zoom
  const animatedPostsRef = useRef<Set<string>>(new Set());
  const [mapLoaded, setMapLoaded] = useState(false);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    // Load Leaflet CSS
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(link);

    // Add custom map marker styles
    const styleEl = document.createElement('style');
    styleEl.textContent = getMapMarkerStyles();
    styleEl.id = 'map-marker-styles';
    document.head.appendChild(styleEl);

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

      // Note: Leaflet custom styles are now included in getMapMarkerStyles()

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

          const bubbleIcon = getPostIcon(L, post, markerData.isRotating);

          const marker = L.marker([markerData.lat, markerData.lng], { icon: bubbleIcon })
            .bindPopup(getPostPopupHtml(post));
          
          markersLayerRef.current.addLayer(marker);
        } else {
          // Store marker (original style)
          const customIcon = L.divIcon({
            html: getStoreMarkerHtml(),
            iconSize: [36, 36],
            iconAnchor: [18, 36],
            popupAnchor: [0, -36],
            className: 'custom-store-marker'
          });

          const marker = L.marker([markerData.lat, markerData.lng], { icon: customIcon })
            .bindPopup(getStorePopupHtml(markerData.title || 'Store Location', markerData.lat, markerData.lng))
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
      // Remove custom marker styles
      const styleEl = document.getElementById('map-marker-styles');
      if (styleEl && document.head.contains(styleEl)) {
        document.head.removeChild(styleEl);
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
    
    // Helper function to render markers with diffing (no clearLayers!)
    function updateMarkers(markersData: PostMarker[]) {
      if (!markersLayerRef.current) return;
      
      const newMarkerIds = new Set<string>();
      
      markersData.forEach(markerData => {
        // Generate unique ID for each marker
        const markerId = markerData.type === 'post' && markerData.post
          ? `post-${markerData.post.id}`
          : `store-${markerData.lat}-${markerData.lng}`;
        
        newMarkerIds.add(markerId);
        
        const existingMarker = existingMarkersRef.current.get(markerId);
        const isPost = markerData.type === 'post';
        
        if (isPost && markerData.post) {
          const post = markerData.post;
          
          if (existingMarker) {
            // Update existing post marker (check if needs animation refresh)
            const currentIcon = existingMarker.getElement();
            // Only animate if isRotating is true AND we haven't animated this post yet
            const shouldAnimate = markerData.isRotating && !animatedPostsRef.current.has(post.id);
            
            if (shouldAnimate && currentIcon) {
              // Re-apply animation class by recreating icon
              existingMarker.setIcon(getPostIcon(L, post, true));
              // Mark this post as animated so we don't animate again
              animatedPostsRef.current.add(post.id);
            }
            // Update position if moved
            const currentLatLng = existingMarker.getLatLng();
            if (currentLatLng.lat !== markerData.lat || currentLatLng.lng !== markerData.lng) {
              existingMarker.setLatLng([markerData.lat, markerData.lng]);
            }
          } else {
            // Create new post marker
            const shouldAnimate = markerData.isRotating && !animatedPostsRef.current.has(post.id);
            const bubbleIcon = getPostIcon(L, post, shouldAnimate);
            const marker = L.marker([markerData.lat, markerData.lng], { icon: bubbleIcon })
              .bindPopup(getPostPopupHtml(post));
            
            markersLayerRef.current.addLayer(marker);
            existingMarkersRef.current.set(markerId, marker);
            if (shouldAnimate) {
              animatedPostsRef.current.add(post.id);
            }
          }
        } else {
          // Store marker
          if (!existingMarker) {
            const customIcon = L.divIcon({
              html: getStoreMarkerHtml(),
              iconSize: [36, 36],
              iconAnchor: [18, 36],
              popupAnchor: [0, -36],
              className: 'custom-store-marker'
            });

            const marker = L.marker([markerData.lat, markerData.lng], { icon: customIcon })
              .bindPopup(getStorePopupHtml(markerData.title || 'Store Location', markerData.lat, markerData.lng))
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
            existingMarkersRef.current.set(markerId, marker);
          }
        }
      });
      
      // Remove markers that are no longer in the data
      existingMarkersRef.current.forEach((marker, id) => {
        if (!newMarkerIds.has(id)) {
          markersLayerRef.current.removeLayer(marker);
          existingMarkersRef.current.delete(id);
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
        html: getCurrentLocationHtml(),
        iconSize: [40, 40],
        iconAnchor: [20, 40],
        popupAnchor: [0, -40],
        className: 'current-location-marker'
      });

      const marker = L.marker([currentLocation.lat, currentLocation.lng], { icon: currentLocationIcon })
        .addTo(map)
        .bindPopup(getCurrentLocationPopupHtml(currentLocation.lat, currentLocation.lng, currentLocation.name));

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
