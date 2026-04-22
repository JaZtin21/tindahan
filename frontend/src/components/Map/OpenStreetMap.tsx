import { useEffect, useRef, useState } from 'react';
import type { PostMarker, MapProps } from '../../types';
import {
  getStoreMarkerHtml,
  getCurrentLocationHtml,
  getCurrentLocationPopupHtml,
  getMapMarkerStyles,
} from './mapStyles';
import {
  getPostIcon,
} from './PostMarker';

// IndexedDB-based tile caching for Leaflet
class TileCache {
  private db: IDBDatabase | null = null;
  private dbName = 'map-tile-cache';
  private storeName = 'tiles';
  private maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days

  async init(): Promise<void> {
    return new Promise((resolve) => {
      const request = indexedDB.open(this.dbName, 1);
      
      request.onerror = () => resolve();
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName);
        }
      };
    });
  }

  private getKey(url: string): string {
    // Extract x, y, z from URL for consistent key
    const match = url.match(/(\d+)\/(\d+)\/(\d+)/);
    return match ? `${match[1]}-${match[2]}-${match[3]}` : url;
  }

  async get(url: string): Promise<Blob | null> {
    if (!this.db) return null;
    
    return new Promise((resolve) => {
      const transaction = this.db!.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const key = this.getKey(url);
      const request = store.get(key);
      
      request.onsuccess = () => {
        const result = request.result;
        if (!result) {
          resolve(null);
          return;
        }
        
        // Check if expired
        if (Date.now() - result.timestamp > this.maxAge) {
          this.delete(url);
          resolve(null);
          return;
        }
        
        resolve(result.blob);
      };
      
      request.onerror = () => resolve(null);
    });
  }

  async set(url: string, blob: Blob): Promise<void> {
    if (!this.db) return;
    
    return new Promise((resolve) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const key = this.getKey(url);
      
      const request = store.put({
        blob,
        timestamp: Date.now(),
        url
      }, key);
      
      request.onsuccess = () => resolve();
      request.onerror = () => resolve();
    });
  }

  async delete(url: string): Promise<void> {
    if (!this.db) return;
    
    return new Promise((resolve) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const key = this.getKey(url);
      const request = store.delete(key);
      
      request.onsuccess = () => resolve();
      request.onerror = () => resolve();
    });
  }
}

const tileCache = new TileCache();

export function OpenStreetMap({ center, zoom, onMapClick, onMarkerClick, onMapMoveEnd, onPostClick, onPostHover, markers = [], currentLocation }: MapProps & { onPostHover?: (clusterId: string | undefined, isHovering: boolean) => void }) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const currentLocationMarkerRef = useRef<any>(null);
  const markersLayerRef = useRef<any>(null);
  // Track existing markers by ID
  const existingMarkersRef = useRef<Map<string, any>>(new Map());
  // Track what (postId, rotationIndex) was last shown in each marker
  // Key: markerId, Value: "postId-rotationIndex"
  const lastContentRef = useRef<Map<string, string>>(new Map());
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

    script.onload = async () => {
      const L = (window as any).L;
      
      // Initialize tile cache
      await tileCache.init();
      
      // Check if container already has a map
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
      }
      
      // Clear any existing content
      if (mapRef.current) {
        mapRef.current.innerHTML = '';
      }
      
      // Initialize map with animations enabled for smooth zooming
      const map = L.map(mapRef.current, {
        fadeAnimation: true,
        zoomAnimation: true,
        markerZoomAnimation: true,
        preferCanvas: false,
        zoomControl: false, // Remove zoom + - buttons
      }).setView([center.lat, center.lng], zoom);
      mapInstanceRef.current = map;

      // Create custom tile layer with IndexedDB caching and edge buffer
      const CachedTileLayer = L.TileLayer.extend({
        _tileCache: tileCache,
        _edgeBufferTiles: 2, // Number of tiles to preload outside viewport
        
        // Override to expand tile bounds for preloading
        _getTiledPixelBounds: function(center: any) {
          // Get pixel bounds from parent
          const pixelBounds = L.GridLayer.prototype._getTiledPixelBounds.call(this, center);
          
          // Get tile size from options (256 is default)
          const tileSize = this.options.tileSize || 256;
          const buffer = this._edgeBufferTiles * tileSize;
          
          // Expand bounds by edge buffer tiles on each side
          pixelBounds.min.x -= buffer;
          pixelBounds.min.y -= buffer;
          pixelBounds.max.x += buffer;
          pixelBounds.max.y += buffer;
          
          return pixelBounds;
        },
        
        _loadTile: function(tile: HTMLImageElement, tilePoint: any) {
          (tile as any)._layer = this;
          tile.onload = () => this._tileOnLoad(tile, tilePoint);
          tile.onerror = () => this._tileOnError(tile, tilePoint);
          
          const url = this.getTileUrl(tilePoint);
          
          // Try to get from cache first
          this._tileCache.get(url).then((cachedBlob: Blob | null) => {
            if (cachedBlob) {
              // Use cached blob
              const objectUrl = URL.createObjectURL(cachedBlob);
              tile.src = objectUrl;
              
              // Revoke object URL after image loads to prevent memory leaks
              tile.onload = () => {
                URL.revokeObjectURL(objectUrl);
                this._tileOnLoad(tile, tilePoint);
              };
            } else {
              // Fetch and cache
              this._fetchAndCacheTile(url, tile, tilePoint);
            }
          }).catch(() => {
            // Fallback to direct load on error
            tile.src = url;
          });
        },
        
        _fetchAndCacheTile: function(url: string, tile: HTMLImageElement, tilePoint: any) {
          fetch(url, {
            mode: 'cors',
            credentials: 'omit'
          })
          .then(response => {
            if (!response.ok) throw new Error('Failed to fetch tile');
            return response.blob();
          })
          .then(blob => {
            // Cache the blob
            this._tileCache.set(url, blob);
            
            // Use the blob for the tile
            const objectUrl = URL.createObjectURL(blob);
            tile.src = objectUrl;
            
            tile.onload = () => {
              URL.revokeObjectURL(objectUrl);
              this._tileOnLoad(tile, tilePoint);
            };
          })
          .catch(() => {
            tile.src = url;
          });
        }
        // Note: Let Leaflet handle _removeTile normally for proper zoom behavior
      });

      // Create tile layer instance with CartoDB Voyager tiles and edge buffer for preloading
      const tileLayer = new CachedTileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '', // Remove attribution text
        subdomains: 'abcd',
        maxZoom: 20,
        crossOrigin: 'anonymous',
        keepBuffer: 50, // Keep many tiles in buffer for smooth zoom/pan
        updateWhenZooming: false,
        updateWhenIdle: true,
      }).addTo(map);
      
      // Store reference for potential future use
      (map as any)._cachedTileLayer = tileLayer;

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

      // Add zoomend listener to track zoom changes (non-blocking)
      if (onMapMoveEnd) {
        let moveTimeout: any = null;
        
        // Track zoom changes
        map.on('zoomend', () => {
          console.log('bo')
          const mapCenter = map.getCenter();
          const mapZoom = map.getZoom();
          onMapMoveEnd(
            { lat: mapCenter.lat, lng: mapCenter.lng },
            mapZoom
          );
        });
        
        // Track position changes with debouncing (non-blocking)
        map.on('move', () => {
          if (moveTimeout) clearTimeout(moveTimeout);
          
          moveTimeout = setTimeout(() => {

            console.log('hey')
            const mapCenter = map.getCenter();
            const mapZoom = map.getZoom();
            onMapMoveEnd(
              { lat: mapCenter.lat, lng: mapCenter.lng },
              mapZoom
            );
          }, 500); // 500ms debounce
        });
      }

      setMapLoaded(true);
    };
    
    // Helper function to render markers
    function renderMarkers(markersData: PostMarker[], _map: any, L: any, onMarkerClickHandler?: (store: { lat: number; lng: number; name: string; id?: string; location?: string; coverPhoto?: string; businessType?: string }) => void) {
      if (!markersLayerRef.current) return;
      
      // Clear existing markers
      markersLayerRef.current.clearLayers();
      
      markersData.forEach(markerData => {
        const isPost = markerData.type === 'post';
        
        if (isPost && markerData.post) {
          // Create conversation bubble marker for posts
          const post = markerData.post;

          const bubbleIcon = getPostIcon(L, post, false);

          const marker = L.marker([markerData.lat, markerData.lng], { icon: bubbleIcon })
            .on('click', () => {
              if (onPostClick) {
                onPostClick(post, markerData.clusterId);
              }
            })
            .on('mouseover', () => {
              if (onPostHover) {
                onPostHover(markerData.clusterId, true);
              }
            })
            .on('mouseout', () => {
              if (onPostHover) {
                onPostHover(markerData.clusterId, false);
              }
            });
          
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
            .on('click', () => {
              if (onMarkerClickHandler && markerData.title) {
                onMarkerClickHandler({
                  lat: markerData.lat,
                  lng: markerData.lng,
                  name: markerData.title,
                  id: markerData.id,
                  location: (markerData as any).location,
                  coverPhoto: (markerData as any).coverPhoto,
                  businessType: (markerData as any).businessType,
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

  // Handle center and zoom changes
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
    
    // Helper function to render markers with diffing
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
          // Create content key: "postId-rotationIndex" to detect rotation
          const contentKey = `${post.id}-${markerData.rotationIndex ?? 0}`;
          const lastContent = lastContentRef.current.get(markerId);
          // Animate if: new marker OR content changed (rotation)
          const shouldAnimate = !existingMarker || contentKey !== lastContent;
          
          if (existingMarker && contentKey !== lastContent) {
            // Content changed - recreate icon with animation
            existingMarker.setIcon(getPostIcon(L, post, true));
            lastContentRef.current.set(markerId, contentKey);
          } else if (!existingMarker) {
            // Create new post marker
            const bubbleIcon = getPostIcon(L, post, shouldAnimate);
            const marker = L.marker([markerData.lat, markerData.lng], { icon: bubbleIcon })
              .on('click', () => {
                if (onPostClick) {
                  onPostClick(post, markerData.clusterId);
                }
              })
              .on('mouseover', () => {
                if (onPostHover) {
                  onPostHover(markerData.clusterId, true);
                }
              })
              .on('mouseout', () => {
                if (onPostHover) {
                  onPostHover(markerData.clusterId, false);
                }
              });
            
            markersLayerRef.current.addLayer(marker);
            existingMarkersRef.current.set(markerId, marker);
            lastContentRef.current.set(markerId, contentKey);
          }
          // Update position if moved (no animation)
          if (existingMarker) {
            const currentLatLng = existingMarker.getLatLng();
            if (currentLatLng.lat !== markerData.lat || currentLatLng.lng !== markerData.lng) {
              existingMarker.setLatLng([markerData.lat, markerData.lng]);
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
              .on('click', () => {
                if (onMarkerClick && markerData.title) {
                  onMarkerClick({
                    lat: markerData.lat,
                    lng: markerData.lng,
                    name: markerData.title,
                    id: markerData.id,
                    location: (markerData as any).location,
                    coverPhoto: (markerData as any).coverPhoto,
                    businessType: (markerData as any).businessType,
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
          lastContentRef.current.delete(id);
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
