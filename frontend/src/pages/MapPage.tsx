import { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState } from '../store';
import { OpenStreetMap, SearchBar, LocationSearchBar } from '../components/Map';
import { openSideNav } from '../store';

export function MapPage() {
  const dispatch = useDispatch();
  const [searchQuery, setSearchQuery] = useState('');
  const [mapCenter, setMapCenter] = useState(
    { lat: 14.5995, lng: 120.9842 } // Manila default - no hardcoded location check
  );
  const [mapZoom, setMapZoom] = useState(14);
  const [filteredStores, setFilteredStores] = useState([
    { lat: 14.5995, lng: 120.9842, title: 'Mang Kiko\'s Sari-Sari Store' },
    { lat: 14.6091, lng: 120.9799, title: 'Aling Nena\'s Grocery' },
    { lat: 14.5897, lng: 120.9834, title: 'Tindahan ni Tony' },
  ]);
  const [locationQuery, setLocationQuery] = useState('');
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number; name?: string } | null>(null);

  const handleLocationSelect = (location: { lat: number; lng: number; name: string }) => {
    setMapCenter({ lat: location.lat, lng: location.lng });
    setMapZoom(16);
    setLocationQuery(location.name);
    setCurrentLocation({ lat: location.lat, lng: location.lng, name: location.name });
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    console.log('Searching for:', query);
    // Here you would search your database
    // For now, just log the query
  };

  const handleMapClick = (lat: number, lng: number) => {
    console.log('Map clicked at:', { lat, lng });
    // Map click functionality removed
  };

  // Reverse geocoding function to get address from coordinates
  const reverseGeocode = async (lat: number, lng: number) => {
    try {
      console.log('🔍 Reverse geocoding for:', { lat, lng });
      
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`
      );
      
      const data = await response.json();
      
      if (data && data.display_name) {
        return data.display_name;
      } else {
        return `Unknown Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
      }
    } catch (error: any) {
      console.error('❌ Reverse geocoding ERROR:', error);
      return `My Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
    }
  };

  const handleMyLocation = async () => {
    console.log('Getting your location...');
    
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          resolve, 
          reject,
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
          }
        );
      });

      const userLocation = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      };

      console.log('ACTUAL User location:', userLocation);
      console.log('GPS Accuracy:', position.coords.accuracy, 'meters');
      
      // Check if accuracy is reasonable (less than 1km)
      if (position.coords.accuracy > 1000) {
        console.warn('Location accuracy is poor (', position.coords.accuracy, 'meters)');
        alert(`Location accuracy is poor (${position.coords.accuracy.toFixed(0)}m). This is normal on PC. For better accuracy, try on your phone.`);
      }
      
      // Update map center to user location and zoom in hard
      setMapCenter(userLocation);
      setMapZoom(20); // Maximum zoom level
      
      // Get address from coordinates
      const address = await reverseGeocode(userLocation.lat, userLocation.lng);
      setLocationQuery(address);
      setCurrentLocation({ ...userLocation, name: address });
      
      console.log('Map centered and MAX zoomed on your location!');
      console.log('Address found:', address);
      
    } catch (error) {
      console.error('Error getting location:', error);
      console.log('Location error details:', error.message);
      alert(`Failed to get your location: ${error.message}. Please enable location services and try again.`);
    }
  };

  const handleStoreSelect = (store: { lat: number; lng: number; name: string }) => {
    console.log('Flying to store:', store);
    setMapCenter({ lat: store.lat, lng: store.lng });
    setMapZoom(20); // MAX zoom for search results
    setSearchQuery(''); // Clear search after selecting store
    
    // Open SideNav with selected location using Redux
    dispatch(openSideNav({
      name: store.name,
      lat: store.lat,
      lng: store.lng,
      type: 'store',
      description: 'Local sari-sari store offering daily essentials and snacks.',
      address: 'Address not available',
      phone: '+63 XXX XXX XXXX',
      hours: '6:00 AM - 9:00 PM'
    }));
  };

  return (
    <div className="bg-white dark:bg-zinc-900 relative min-h-screen">
      {/* Top Search Bar */}
      <div className="absolute top-[77px] z-40 px-4 py-4 left-[50%] transform -translate-x-1/2 w-[700px]">
        {/* First Row: My Location and Manual Location Search */}
        <div className="flex items-center gap-3 mb-3">
          {/* My Location Button */}
          <button
            onClick={handleMyLocation}
            className="flex-shrink-0 p-3 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-600 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
            title="Go to my location"
          >
            🎯
          </button>
          
          {/* Manual Location Search Bar */}
          <LocationSearchBar 
            onLocationSelect={handleLocationSelect}
            placeholder="Search for your current location"
            value={locationQuery}
            onChange={setLocationQuery}
          />
        </div>
        
        {/* Second Row: Current Search Bar */}
        <div>
          <SearchBar 
            onSearch={handleSearch}
            onStoreSelect={handleStoreSelect}
            placeholder="Search for stores or products near you"
          />
        </div>
      </div>

      {/* Main Content */}
      <div className="fixed top-[77px] left-0 right-0 bottom-0 z-[1]">
        {/* Full Screen Map */}
        <OpenStreetMap
          center={mapCenter}
          zoom={mapZoom}
          onMapClick={handleMapClick}
          onMarkerClick={handleStoreSelect}
          markers={filteredStores}
          currentLocation={currentLocation}
        />

        {/* Map Controls Info */}
        <div className="absolute bottom-4 left-4 z-30">
          <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-xl border border-zinc-200 dark:border-zinc-700 px-3 py-2 text-xs text-zinc-600 dark:text-zinc-400">
            🗺️ OpenStreetMap • Click to add store
          </div>
        </div>
      </div>
    </div>
  );
}
