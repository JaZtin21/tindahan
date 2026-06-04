import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { setLocation } from '../../store';

export function StorePinner() {
  const dispatch = useDispatch();
  const [location, setLocationState] = useState({
    lat: 14.5995, // Manila default
    lng: 120.9842,
  });
  const [storeName, setStoreName] = useState('');
  const [isPinning, setIsPinning] = useState(false);

  const handlePinStore = async () => {
    if (!storeName.trim()) {
      alert('Please enter a store name');
      return;
    }

    setIsPinning(true);
    
    try {
      // Get current location
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject);
      });

      const storeLocation = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      };

      // Save to Redux store
      dispatch(setLocation(storeLocation));
      
      // Here you would also save to backend/database
      console.log('Store pinned:', { name: storeName, ...storeLocation });
      
      alert(`Store "${storeName}" pinned successfully!`);
      setStoreName('');
    } catch (error) {
      console.error('Error getting location:', error);
      alert('Failed to get location. Please enable location services.');
    } finally {
      setIsPinning(false);
    }
  };

  const handleGetCurrentLocation = async () => {
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject);
      });

      setLocationState({
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      });

      dispatch(setLocation({
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      }));
    } catch (error) {
      console.error('Error getting location:', error);
      alert('Failed to get location. Please enable location services.');
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6">
        <h3 className="text-lg font-semibold mb-4">Pin Your Store Location</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Store Name</label>
            <input
              type="text"
              value={storeName}
              onChange={(e) => setStoreName(e.target.value)}
              placeholder="Enter your store name"
              className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Location</label>
            <div className="grid grid-cols-2 gap-2 mb-4">
              <input
                type="number"
                value={location.lat}
                onChange={(e) => setLocationState(prev => ({ ...prev, lat: parseFloat(e.target.value) }))}
                placeholder="Latitude"
                step="0.0001"
                className="rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <input
                type="number"
                value={location.lng}
                onChange={(e) => setLocationState(prev => ({ ...prev, lng: parseFloat(e.target.value) }))}
                placeholder="Longitude"
                step="0.0001"
                className="rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <button
              onClick={handleGetCurrentLocation}
              className="w-full rounded-lg bg-zinc-100 dark:bg-zinc-800 px-3 py-2 text-sm font-medium hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
            >
              📍 Use Current Location
            </button>
          </div>

          <button
            onClick={handlePinStore}
            disabled={isPinning}
            className="w-full rounded-xl bg-emerald-500 px-4 py-3 font-semibold text-emerald-950 hover:bg-emerald-600 disabled:bg-emerald-300 disabled:cursor-not-allowed transition-colors"
          >
            {isPinning ? '📍 Pinning...' : '📍 Pin Store Location'}
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6">
        <h4 className="font-medium mb-2">Current Location</h4>
        <div className="text-sm text-zinc-600 dark:text-zinc-400">
          Lat: {location.lat.toFixed(4)}, Lng: {location.lng.toFixed(4)}
        </div>
      </div>
    </div>
  );
}
