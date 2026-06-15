import { useState, useEffect, useRef, useCallback } from 'react';
import type { LocationPickerProps } from '../../types/owner';

export function LocationPicker({ onLocationSelect, initialLocation = { lat: 14.5995, lng: 120.9842 }, initialAddress = '' }: LocationPickerProps) {
  const [selectedLocation, setSelectedLocation] = useState(initialLocation);
  const [showModal, setShowModal] = useState(false);
  const [address, setAddress] = useState(initialAddress);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const L = (window as any).L;

   // 1. Core function: Instantly moves the marker on the map UI
  const handleMapClick = (lat: number, lng: number) => {
    setSelectedLocation({ lat, lng });
    
    // Set a clean text state instead of putting numbers into your address box
    setAddress('Retrieving address name...'); 

    if (mapInstanceRef.current) {
      const L = (window as any).L;

      // Clear existing markers
      mapInstanceRef.current.eachLayer((layer: any) => {
        if (layer instanceof L.Marker) {
          mapInstanceRef.current.removeLayer(layer);
        }
      });

      // Add new marker with custom icon
      const customIcon = L.divIcon({
        html: `
          <div style="
            background: #efb666;
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

      L.marker([lat, lng], { icon: customIcon })
        .addTo(mapInstanceRef.current)
        .bindPopup(`
          <div style="font-weight: 600; color: #202124; margin-bottom: 4px;">
            Selected Location
          </div>
          <div style="color: #5f6368; font-size: 12px;">
            📍 ${lat.toFixed(4)}, ${lng.toFixed(4)}
          </div>
        `);
    }

    // Fire the debounced address request
    debouncedReverseGeocode(lat, lng);
  };

  // 2. Debounced Fetch: Only assigns true string values or clean fallback labels
  const debouncedReverseGeocode = (lat: number, lng: number) => {
    // Wipe out the timer from any previous rapid clicks
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    // Wait 300ms for the user to finish clicking before calling the API
    debounceRef.current = setTimeout(() => {
      fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`)
        .then(response => response.json())
        .then(data => {
          // Guard: Ensure we extract the human-readable text name, never raw numbers
          const formattedAddress = data.display_name || 'Unknown Location Name';
          setAddress(formattedAddress);
          console.log('Address resolved cleanly:', formattedAddress);
        })
        .catch((error) => {
          console.error('Geocoding failure:', error);
          // Fallback to a literal text message instead of coordinate strings
          setAddress('Address name not found'); 
        });
    }, 500);
  };


  const handleGetCurrentLocation = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent event from reaching form behind

    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }

    setIsLocating(true);

    // 1. Check permissions first so mobile doesn't auto-fail silently
    if (navigator.permissions && navigator.permissions.query) {
      try {
        const permissionStatus = await navigator.permissions.query({ name: 'geolocation' });
        if (permissionStatus.state === 'denied') {
          setIsLocating(false);
          alert('Location access is blocked. Please open your browser settings or phone app permission settings and change Location to "Allow".');
          return;
        }
      } catch (err) {
        console.warn('Permissions query not supported, falling back.', err);
      }
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const newLocation = { lat: latitude, lng: longitude };
        setSelectedLocation(newLocation);

        // Center map on new location
        if (mapInstanceRef.current) {
          mapInstanceRef.current.setView([latitude, longitude], 18); // Stable high zoom
          handleMapClick(latitude, longitude);
        }

        setIsLocating(false);
      },
      (error) => {
        console.error('Error getting location:', error);
        setIsLocating(false);

        // 2. Give precise instructions depending on what went wrong
        let errorMsg = 'Unable to get your location. Please select manually.';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMsg = 'Location access is turned off. Please ensure your phone\'s GPS/Location toggle is turned ON and this site has permission to access it.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMsg = 'Network location lookup failed. Please check your signal connectivity.';
            break;
          case error.TIMEOUT:
            errorMsg = 'The location request timed out. Please try tapping the button again.';
            break;
        }
        alert(errorMsg);
      },
      {
        enableHighAccuracy: true,
        timeout: 8000, // Reduced from 10s to 8s for better mobile UX
        maximumAge: 0  // Guarantees it pulls the absolute latest location
      }
    );
  };


  const handleConfirmLocation = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent event from reaching form behind
    console.log('Confirming location:', selectedLocation, address);
    onLocationSelect(selectedLocation, address);
    setShowModal(false);
  };

  const handleSearch = useCallback(async (query: string) => {
    setSearchQuery(query);

    // Clear previous debounce timer
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (query.length < 3) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);

    // Debounce the API call
    debounceRef.current = setTimeout(async () => {
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5`
        );
        const data = await response.json();
        setSearchResults(data);
      } catch (error) {
        console.error('Search error:', error);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 500);
  }, []);

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  const handleSearchResultClick = (result: any) => {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);
    const newLocation = { lat, lng };
    setSelectedLocation(newLocation);
    setAddress(result.display_name);
    setSearchResults([]);
    setSearchQuery('');

    // Center map on selected location
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([lat, lng], 16);
      handleMapClick(lat, lng);
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
        .leaflet-control-attribution {
          display: none !important;
        }
      `;
      document.head.appendChild(styleSheet);

      // Add initial marker
      const customIcon = L.divIcon({
        html: `
          <div style="
            background: #efb666;
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

      L.marker([selectedLocation.lat, selectedLocation.lng], { icon: customIcon })
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
    };

    script.onerror = () => {
      console.error('Failed to load Leaflet');
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
        className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-900 focus:ring-2 focus:ring-primary focus:border-primary text-left text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500"
      >
        {getButtonText()}
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh]  overflow-auto" onClick={(e) => e.stopPropagation()}>
        <div className="p-6 border-b border-zinc-200 dark:border-zinc-700">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">Select Shop Location</h3>
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

        <div className="flex flex-col md:flex-row ">
          {/* Map Container */}
          <div className="flex-1 relative p-4" onClick={(e) => e.stopPropagation()}>
            <div
              ref={mapRef}
              className="w-full h-[300px] md:h-[500px] rounded-lg overflow-hidden pointer-events-auto"
              style={{ cursor: 'crosshair' }}
            />
          </div>

          {/* Sidebar */}
          <div className="w-full md:w-80 p-6 md:border-l border-zinc-200 dark:border-zinc-700 pointer-events-auto" onClick={(e) => e.stopPropagation()}>
            <div className="space-y-4">
              {/* Search Input */}
              <div className="relative">
                <h4 className="font-semibold mb-2 text-zinc-900 dark:text-zinc-100">Search Location</h4>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  placeholder="Search for a location..."
                  className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-primary"
                />
                {isSearching && (
                  <div className="flex items-center gap-2 mt-2 text-sm text-zinc-500">
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Searching...
                  </div>
                )}
                {searchResults.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 max-h-48 overflow-y-auto border border-zinc-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 shadow-lg z-10">
                    {searchResults.map((result, index) => (
                      <button
                        key={index}
                        onClick={() => handleSearchResultClick(result)}
                        className="w-full px-3 py-2 text-left text-sm text-zinc-900 dark:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 border-b border-zinc-200 dark:border-zinc-700 last:border-b-0"
                      >
                        {result.display_name}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <h4 className="font-semibold mb-2 text-zinc-900 dark:text-zinc-100">Address</h4>
                <div className="text-sm text-zinc-600 dark:text-zinc-400">
                  {address || 'Click on map to get address'}
                </div>
              </div>

              <button
                onClick={handleGetCurrentLocation}
                disabled={isLocating}
                className="w-full px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-700 transition-colors disabled:bg-zinc-400 disabled:cursor-not-allowed"
                type="button"
              >
                {isLocating ? (
                  <span className="inline-flex items-center gap-2">
                    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
                      <path d="M22 12a10 10 0 00-10-10" stroke="currentColor" strokeWidth="4" className="opacity-75" />
                    </svg>
                    Getting location...
                  </span>
                ) : (
                  '📍 Use My Location'
                )}
              </button>

              <div className="pt-4 border-t border-zinc-200 dark:border-zinc-700">
                <button
                  onClick={handleConfirmLocation}
                  disabled={!address}
                  className="w-full px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  type="button"
                >
                  Confirm Location
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowModal(false);
                  }}
                  className="w-full px-4 py-2 mt-2 bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-lg hover:bg-zinc-300 dark:hover:bg-zinc-600 transition-colors"
                  type="button"
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
