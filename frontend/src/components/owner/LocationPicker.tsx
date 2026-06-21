import React, { useState, useRef, useEffect, useCallback } from 'react';
import BaseMap, { Marker, Popup } from 'react-map-gl/maplibre';
import maplibregl from 'maplibre-gl';
import type { LocationPickerProps } from '../../types/owner';
import { Modal } from '../Modal';
import 'maplibre-gl/dist/maplibre-gl.css';

const MAPTILER_BASE_URL = "https://api.maptiler.com";
const MAPTILER_STYLE_NAME = "voyager";
const MAP_TILE_URL = `${MAPTILER_BASE_URL}/maps/${MAPTILER_STYLE_NAME}/style.json?key=${import.meta.env.VITE_MAPTILE_KEY || 'your_fallback_key'}`;

export function LocationPicker({ onLocationSelect, initialLocation = { lat: 14.5995, lng: 120.9842 }, initialAddress = '' }: LocationPickerProps) {
  const [selectedLocation, setSelectedLocation] = useState(initialLocation);
  const [showModal, setShowModal] = useState(false);
  const [address, setAddress] = useState(initialAddress);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLocating, setIsLocating] = useState(false);

  // 🚀 REFACTORED TO REACT-MAP-GL REF TRACKING PIPELINE [INDEX]
  const mapRef = useRef<any>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 1. Core function: Instantly updates coordinate states and triggers camera movement [INDEX]
  const handleMapClick = (lat: number, lng: number) => {
    setSelectedLocation({ lat, lng });
    setAddress('Retrieving address name...');

    // Smoothly fly center focus using MapLibre's native instance [INDEX]
    if (mapRef.current) {
      mapRef.current.flyTo({
        center: [lng, lat], // 🚨 Note: Longitude first in MapLibre! [INDEX]
        zoom: 19,
        duration: 1000,
        essential: true
      });
    }

    // Fire the debounced reverse geocoding lookup
    debouncedReverseGeocode(lat, lng);
  };

  // 2. Debounced Fetch: Intercepts rapid user clicking arrays and fires reverse geocoding
  const debouncedReverseGeocode = (lat: number, lng: number) => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      const key = import.meta.env.VITE_MAPTILE_KEY || '';
      if (!key) {
        console.error('VITE_MAPTILE_KEY is missing from .env');
        setAddress('Configuration error');
        return;
      }

      // MapTiler Geocoding API requires longitude first: [lng, lat] [INDEX]
      const url = `https://api.maptiler.com/geocoding/${lng},${lat}.json?key=${key}&limit=1`;

      fetch(url)
        .then(response => response.json())
        .then(data => {
          if (data && data.features && data.features.length > 0) {
            const formattedAddress = data.features[0].place_name;
            setAddress(formattedAddress);
            console.log('Address resolved cleanly via MapTiler:', formattedAddress);
          } else {
            setAddress('Unknown Location Name');
          }
        })
        .catch((error) => {
          console.error('MapTiler Geocoding failure:', error);
          setAddress('Address name not found');
        });
    }, 500);
  };

  const handleGetCurrentLocation = async (e: React.MouseEvent) => {
    e.stopPropagation();

    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }

    setIsLocating(true);

    if (navigator.permissions && navigator.permissions.query) {
      try {
        const permissionStatus = await navigator.permissions.query({ name: 'geolocation' });
        if (permissionStatus.state === 'denied') {
          setIsLocating(false);
          showError(
            'Location Permission Blocked',
            'Please check if location is turned on in your device settings and check your browser settings. Go to Chrome > Settings > Site Settings > Location and set to "Allow" for this app or Settings > Safari > Location and set to "Allow" for this app for IOS.'
          );
          return;
        }
      } catch (err) {
        console.warn('Permissions query not supported, falling back.', err);
      }
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        handleMapClick(latitude, longitude);
        setIsLocating(false);
      },
      (error) => {
        console.error('Error getting location:', error);
        setIsLocating(false);

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
        timeout: 8000,
        maximumAge: 0
      }
    );
  };

  const handleConfirmLocation = (e: React.MouseEvent) => {
    e.stopPropagation();
    console.log('Confirming location:', selectedLocation, address);
    onLocationSelect(selectedLocation, address);
    setShowModal(false);
  };

  const handleSearch = useCallback(async (query: string) => {
    setSearchQuery(query);

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (query.length < 3) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);

    debounceRef.current = setTimeout(async () => {
      const key = import.meta.env.VITE_MAPTILE_KEY || '';
      if (!key) {
        console.error('VITE_MAPTILE_KEY is missing from .env');
        setIsSearching(false);
        return;
      }

      try {
        const url = `https://api.maptiler.com/geocoding/${encodeURIComponent(query)}.json?key=${key}&limit=5`;
        const response = await fetch(url);
        const data = await response.json();
        setSearchResults(data.features || []);
      } catch (error) {
        console.error('Search error:', error);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 500); // Corrected to 500ms debounce window matching your top declaration
  }, []);

  const handleSearchResultClick = (result: any) => {
    // 🚀 FIXED: MapTiler packs coordinates inside a [longitude, latitude] array! [INDEX]
    const [lng, lat] = result.center;
    handleMapClick(lat, lng);
    setAddress(result.place_name);
    setSearchResults([]);
    setSearchQuery('');
  };

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  // Display button text based on whether address is set
  const getButtonText = () => {
    if (address) {
      return `📍 ${address.length > 50 ? address.substring(0, 50) + '...' : address}`;
    }
    return '📍 Select Location on Map';
  };

  const [feedbackModal, setFeedbackModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: 'success' | 'error'
  }>({ isOpen: false, title: '', message: '', type: 'success' });

  const showSuccess = (title: string, message: string) => {
    setFeedbackModal({ isOpen: true, title, message, type: 'success' });
  };

  const showError = (title: string, message: string) => {
    setFeedbackModal({ isOpen: true, title, message, type: 'error' });
  };

  // 🚀 FIXED UNMOUNT BASE TRIGGERS: RESTORED ORIGINAL LAYOUT BUTTON FOR FORM TOGGLES
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
    <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center md:p-4 p-0">
      <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
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

        <div className="flex flex-col md:flex-row">
          {/* Map Container */}
          <div className=" relative p-0 md:p-4 h-[450px] md:flex-1 md:h-[500px]" onClick={(e) => e.stopPropagation()}>
            <BaseMap
              ref={mapRef}
              initialViewState={{
                longitude: selectedLocation.lng,
                latitude: selectedLocation.lat,
                zoom: 15
              }}
              onClick={(e) => handleMapClick(e.lngLat.lat, e.lngLat.lng)}
              style={{ width: '100%', height: '100%', cursor: 'crosshair' }}
              mapStyle={MAP_TILE_URL}
              mapLib={maplibregl}
              attributionControl={false}
            >
              <Marker
                latitude={selectedLocation.lat}
                longitude={selectedLocation.lng}
                offsetLeft={-18}
                offsetTop={-36}
                rotationAlignment="viewport"
                pitchAlignment="viewport"
              >
                <div style={{
                  background: '#efb666',
                  width: '36px',
                  height: '36px',
                  borderRadius: '100px',
                  border: '2px solid white',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '18px',
                  cursor: 'pointer'
                }}>
                  📍
                </div>
              </Marker>

            </BaseMap>
          </div>

          {/* Sidebar */}
          <div className="w-full md:w-80 p-6 md:border-l border-zinc-200 dark:border-zinc-700 pointer-events-auto" onClick={(e) => e.stopPropagation()}>
            <div className="space-y-4">
              <div className="relative">
                <h4 className="font-semibold mb-2 text-zinc-900 dark:text-zinc-100">Search Location</h4>
                <div className="flex items-center gap-2 relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => handleSearch(e.target.value)}
                    placeholder="Search for a location..."
                    className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 rounded-lg text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-secondary"
                  />
                  {isSearching && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-amber-500 border-t-transparent animate-spin rounded-full" />
                  )}
                </div>

                {searchResults.length > 0 && (
                  <div className="absolute left-0 right-0 mt-1 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-xl max-h-60 overflow-y-auto z-50 flex flex-col">
                    {searchResults.map((result: any) => (
                      <div
                        key={result.id}
                        onClick={() => handleSearchResultClick(result)}
                        className="px-4 py-3 text-xs text-zinc-700 dark:text-zinc-300 hover:bg-amber-50 dark:hover:bg-zinc-700 cursor-pointer transition-colors border-b border-zinc-100 dark:border-zinc-700 last:border-none truncate"
                      >
                        📍 {result.place_name}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-zinc-50 dark:bg-zinc-800 p-4 rounded-xl border border-zinc-100 dark:border-zinc-700 flex flex-col gap-1">
                <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">selected Address</span>
                <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed break-words">
                  {address || 'No location address pinned yet...'}
                </p>
              </div>

              <button
                type="button"
                onClick={handleGetCurrentLocation}
                disabled={isLocating}
                className="w-full px-4 py-2.5 bg-zinc-100 dark:bg-zinc-800  border border-zinc-200 dark:border-zinc-700 rounded-full text-zinc-800 dark:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-700 active:scale-95 transition-all text-sm font-semibold flex items-center justify-center gap-2"
              >
                {isLocating ? (
                  <div className="w-4 h-4 border-2 border-zinc-800 dark:border-zinc-200 border-t-transparent animate-spin rounded-full " />
                ) : (
                  '🎯 Use My Location'
                )}
              </button>

              <div className="pt-4 border-t border-zinc-200 dark:border-zinc-700 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={handleConfirmLocation}
                  disabled={!address || address === 'Retrieving address name...'}
                  className="w-full px-4 py-2.5 bg-secondary hover:bg-secondary-50 disabled:bg-zinc-300 text-white font-semibold rounded-full text-sm shadow-md active:scale-95 transition-all disabled:pointer-events-none disabled:opacity-50"
                >
                  Confirm This Location
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="w-full px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-zinc-500 font-medium text-sm hover:text-zinc-700 rounded-full transition-colors"
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

