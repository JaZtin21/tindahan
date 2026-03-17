import { useState, useEffect, useRef } from 'react';

interface LocationPickerProps {
  onLocationSelect: (coordinates: { lat: number; lng: number }, address: string) => void;
  initialLocation?: { lat: number; lng: number };
}

export function LocationPicker({ onLocationSelect, initialLocation = { lat: 14.5995, lng: 120.9842 } }: LocationPickerProps) {
  const [selectedLocation, setSelectedLocation] = useState(initialLocation);
  const [showModal, setShowModal] = useState(false);
  const [address, setAddress] = useState('');
  const [mapLoaded, setMapLoaded] = useState(false);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const L = (window as any).L;

  const handleMapClick = (lat: number, lng: number) => {
    setSelectedLocation({ lat, lng });
    
    // Add marker to map
    if (mapInstanceRef.current) {
      // Clear existing markers
      mapInstanceRef.current.eachLayer((layer: any) => {
        if (layer instanceof L.Marker) {
          mapInstanceRef.current.removeLayer(layer);
        }
      });
      
      // Add new marker
      const marker = L.marker([lat, lng]).addTo(mapInstanceRef.current);
      marker.bindPopup(`Selected: ${lat.toFixed(4)}, ${lng.toFixed(4)}`).openPopup();
    }
    
    // Reverse geocoding to get address
    fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`)
      .then(response => response.json())
      .then(data => {
        const formattedAddress = data.display_name || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
        setAddress(formattedAddress);
        console.log('Address resolved:', formattedAddress);
      })
      .catch(() => {
        setAddress(`${lat.toFixed(4)}, ${lng.toFixed(4)}`);
      });
  };

  const handleGetCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          const newLocation = { lat: latitude, lng: longitude };
          setSelectedLocation(newLocation);
          
          // Center map on new location with MAX zoom like MapPage
          if (mapInstanceRef.current) {
            mapInstanceRef.current.setView([latitude, longitude], 20); // MAX zoom
            handleMapClick(latitude, longitude);
          }
        },
        (error) => {
          console.error('Error getting location:', error);
          alert('Unable to get your location. Please select manually.');
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );
    } else {
      alert('Geolocation is not supported by your browser.');
    }
  };

  const handleConfirmLocation = () => {
    console.log('Confirming location:', selectedLocation, address);
    onLocationSelect(selectedLocation, address);
    setShowModal(false);
  };

  const initializeMap = () => {
    if (mapRef.current && !mapInstanceRef.current) {
      console.log('Initializing map with ref:', mapRef.current);
      console.log('Map container dimensions:', mapRef.current.offsetWidth, 'x', mapRef.current.offsetHeight);
      
      // Clear any existing content
      if (mapRef.current) {
        mapRef.current.innerHTML = '';
      }
      
      // Force container to have dimensions
      mapRef.current.style.width = '100%';
      mapRef.current.style.height = '100%';
      
      // Initialize map
      const map = L.map(mapRef.current).setView([selectedLocation.lat, selectedLocation.lng], 15);
      mapInstanceRef.current = map;

      // Add tile layer
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: ' OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(map);

      // Add initial marker
      const marker = L.marker([selectedLocation.lat, selectedLocation.lng]).addTo(map);
      marker.bindPopup('Initial location').openPopup();

      // Add click handler
      map.on('click', (event: any) => {
        const { lat, lng } = event.latlng;
        handleMapClick(lat, lng);
      });
      
      // Force map to redraw after a short delay
      setTimeout(() => {
        map.invalidateSize();
        console.log('Map initialized and redrawn');
      }, 200);
    }
  };

  useEffect(() => {
    if (!showModal || !mapRef.current || mapInstanceRef.current) return;

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
      const map = L.map(mapRef.current).setView([selectedLocation.lat, selectedLocation.lng], 15);
      mapInstanceRef.current = map;

      // Use CartoDB Voyager tile layer (more Google Maps-like)
      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '© OpenStreetMap contributors © CARTO',
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
      `;
      document.head.appendChild(styleSheet);

      // Add initial marker
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
            📍
          </div>
        `,
        iconSize: [36, 36],
        iconAnchor: [18, 36],
        popupAnchor: [0, -36],
        className: 'custom-store-marker'
      });

      const marker = L.marker([selectedLocation.lat, selectedLocation.lng], { icon: customIcon })
        .addTo(map)
        .bindPopup(`
          <div style="font-weight: 600; color: #202124; margin-bottom: 4px;">
            Selected Location
          </div>
          <div style="color: #5f6368; font-size: 12px;">
            📍 ${selectedLocation.lat.toFixed(4)}, ${selectedLocation.lng.toFixed(4)}
          </div>
        `);

      // Add click handler
      map.on('click', (event: any) => {
        const lat = event.latlng.lat;
        const lng = event.latlng.lng;
        handleMapClick(lat, lng);
      });

      setMapLoaded(true);
    };

    script.onerror = () => {
      setMapLoaded(false);
    };

    document.head.appendChild(script);
  }, [showModal, selectedLocation]);

  // Cleanup map when modal closes
  useEffect(() => {
    if (!showModal && mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }
  }, [showModal]);

  // Display button text based on whether address is set
  const getButtonText = () => {
    if (address) {
      return `📍 ${address.length > 50 ? address.substring(0, 50) + '...' : address}`;
    }
    return '📍 Select Location on Map';
  };

  if (!showModal) {
    return (
      <button
        type="button"
        onClick={() => setShowModal(true)}
        className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-900 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-left"
      >
        {getButtonText()}
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        <div className="p-6 border-b border-zinc-200 dark:border-zinc-700">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-semibold">Select Shop Location</h3>
            <button
              onClick={() => setShowModal(false)}
              className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <svg className="w-5 h-5 text-zinc-600 dark:text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="flex">
          {/* Map Container */}
          <div className="flex-1 h-96 relative">
            <div 
              ref={mapRef} 
              className="w-full h-full rounded-lg overflow-hidden"
              style={{ cursor: 'crosshair' }}
            />
            
            {/* Instructions Overlay */}
            <div className="absolute top-4 left-4 bg-white dark:bg-zinc-800 rounded-lg p-3 shadow-lg max-w-xs z-10">
              <h4 className="font-semibold mb-2">Instructions:</h4>
              <ul className="text-sm space-y-1">
                <li>• Click on map to select location</li>
                <li>• Or use "Use My Location" button</li>
                <li>• Selected: {selectedLocation.lat.toFixed(4)}, {selectedLocation.lng.toFixed(4)}</li>
              </ul>
            </div>
          </div>

          {/* Sidebar */}
          <div className="w-80 p-6 border-l border-zinc-200 dark:border-zinc-700">
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">Selected Location</h4>
                <div className="text-sm text-zinc-600 dark:text-zinc-400 space-y-1">
                  <div>Latitude: {selectedLocation.lat.toFixed(6)}</div>
                  <div>Longitude: {selectedLocation.lng.toFixed(6)}</div>
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Address</h4>
                <div className="text-sm text-zinc-600 dark:text-zinc-400">
                  {address || 'Click on map to get address'}
                </div>
              </div>

              <button
                onClick={handleGetCurrentLocation}
                className="w-full px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors"
              >
                📍 Use My Location
              </button>

              <div className="pt-4 border-t border-zinc-200 dark:border-zinc-700">
                <button
                  onClick={handleConfirmLocation}
                  disabled={!address}
                  className="w-full px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Confirm Location
                </button>
                <button
                  onClick={() => setShowModal(false)}
                  className="w-full px-4 py-2 mt-2 bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-lg hover:bg-zinc-300 dark:hover:bg-zinc-600 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
