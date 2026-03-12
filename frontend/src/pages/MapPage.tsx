import { useState } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '../store';
import { OpenStreetMap, StorePinner, SearchBar } from '../components/Map';

export function MapPage() {
  const location = useSelector((state: RootState) => state.location);
  const [showPinner, setShowPinner] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredStores, setFilteredStores] = useState([
    { lat: 14.5995, lng: 120.9842, title: 'Mang Kiko\'s Sari-Sari Store' },
    { lat: 14.6091, lng: 120.9799, title: 'Aling Nena\'s Grocery' },
    { lat: 14.5897, lng: 120.9834, title: 'Tindahan ni Tony' },
  ]);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    console.log('Searching for:', query);
    // Here you would search your database
    // For now, just log the query
  };

  const handleMapClick = (lat: number, lng: number) => {
    console.log('Map clicked at:', { lat, lng });
    // Here you could add a new store marker
  };

  const currentLocation = location.lat && location.lng 
    ? { lat: location.lat, lng: location.lng }
    : { lat: 14.5995, lng: 120.9842 }; // Manila default

  return (
    <div className="bg-white dark:bg-zinc-900 relative">
      {/* Top Search Bar */}
      <div className="sticky top-[78px] z-40 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 px-4 py-4">
        <SearchBar 
          onSearch={handleSearch}
          placeholder="Search for stores or products..."
        />
      </div>

      {/* Main Content */}
      <div className="sticky h-[calc(100vh-90px)]">
        {/* Full Screen Map */}
          <OpenStreetMap
            center={currentLocation}
            zoom={14}
            onMapClick={handleMapClick}
            markers={filteredStores}
          />

        {/* Floating Store Pinner (when shown) */}
        {showPinner && (
          <div className="absolute top-4 left-4 z-30">
            <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-xl border border-zinc-200 dark:border-zinc-700 w-80 max-h-[calc(100vh-177px)] overflow-y-auto">
              <div className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Pin Store Location</h3>
                  <button
                    onClick={() => setShowPinner(false)}
                    className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 text-xl"
                  >
                    ×
                  </button>
                </div>
                <StorePinner />
              </div>
            </div>
          </div>
        )}

        {/* Floating Action Button */}
        <div className="absolute bottom-4 right-4 z-30">
          <button
            onClick={() => setShowPinner(!showPinner)}
            className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-full p-4 shadow-xl transition-colors"
            title="Pin Store Location"
          >
            📍
          </button>
        </div>

        {/* Search Results Info (when searching) */}
        {searchQuery && (
          <div className="absolute top-4 right-4 z-30">
            <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-xl border border-zinc-200 dark:border-zinc-700 px-4 py-3">
              <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                Searching: "{searchQuery}"
              </div>
              <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                Found {filteredStores.length} stores
              </div>
            </div>
          </div>
        )}

        {/* Map Controls Info */}
        <div className="absolute bottom-4 left-4 z-30">
          <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-xl border border-zinc-200 dark:border-zinc-700 px-3 py-2 text-xs text-zinc-600 dark:text-zinc-400">
            🗺️ OpenStreetMap • Click to add store • 📍 to pin location
          </div>
        </div>
      </div>
    </div>
  );
}
