import { useState } from 'react';

interface SearchBarProps {
  onSearch: (query: string) => void;
  onStoreSelect?: (store: { lat: number; lng: number; name: string }) => void;
  placeholder?: string;
}

// Test data for stores and products - MATCHING THE MAP MARKERS
const testData = [
  { type: 'store', name: 'Mang Kiko\'s Sari-Sari Store', location: 'Quezon City', lat: 14.5995, lng: 120.9842 },
  { type: 'store', name: 'Aling Nena\'s Grocery', location: 'Manila', lat: 14.6091, lng: 120.9799 },
  { type: 'store', name: 'Tindahan ni Tony', location: 'Pasay', lat: 14.5897, lng: 120.9834 },
  { type: 'product', name: 'Pancit Canton', available: 12 },
  { type: 'product', name: 'Softdrinks (Coke)', available: 8 },
  { type: 'product', name: 'Instant Noodles', available: 15 },
  { type: 'product', name: 'Rice', available: 5 },
  { type: 'product', name: 'Cooking Oil', available: 3 },
  { type: 'product', name: 'Soap', available: 10 },
];

// Nominatim geocoding function
const searchLocation = async (query: string) => {
  try {
    console.log('🔍 API TRIGGERED - Searching for:', query);
    console.log('📡 Making request to: https://nominatim.openstreetmap.org/search');
    
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5`
    );
    
    console.log('📡 Response status:', response.status);
    
    const data = await response.json();
    console.log('📊 Raw API response:', data);
    console.log('📈 Results count:', data.length);
    
    const results = data.map((item: any) => ({
      type: 'location',
      name: item.display_name,
      lat: parseFloat(item.lat),
      lng: parseFloat(item.lon),
      details: item.class
    }));
    
    console.log('✅ Processed results:', results);
    return results;
  } catch (error: any) {
    console.error('❌ API ERROR:', error);
    console.error('❌ Error details:', error?.message || 'Unknown error');
    return [];
  }
};

export function SearchBar({ onSearch, onStoreSelect, placeholder = "Search for stores, products, or locations..." }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTimeout, setSearchTimeout] = useState<number | null>(null);

  const handleInputChange = (value: string) => {
    setQuery(value);
    
    // Clear previous timeout
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }
    
    if (value.trim()) {
      setIsLoading(true);
      
      // Debounce search - wait 800ms after typing stops
      const timeout = setTimeout(async () => {
        console.log('Debounce triggered for:', value);
        
        // Search local data first (instant)
        const localResults = testData.filter(item =>
          item.name.toLowerCase().includes(value.toLowerCase())
        );
        
        // Search for locations (always trigger API)
        const locationResults = await searchLocation(value);
        console.log('API results:', locationResults);
        
        // Combine results
        const allResults = [
          ...localResults.map((item: any) => ({ ...item, source: 'local' })),
          ...locationResults.map((item: any) => ({ ...item, source: 'geocoding' }))
        ];
        
        setSuggestions(allResults);
        setShowSuggestions(true);
        setIsLoading(false);
      }, 300); // Reduced to 300ms for faster response
      
      setSearchTimeout(timeout);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
      setIsLoading(false);
    }
  };

  const handleSearch = (searchQuery?: string) => {
    const finalQuery = searchQuery || query;
    if (finalQuery.trim()) {
      onSearch(finalQuery.trim());
      setShowSuggestions(false);
    }
  };

  const handleSuggestionClick = (suggestion: any) => {
    setQuery(suggestion.name);
    
    // If it's a store, call the store select callback
    if (suggestion.type === 'store' && onStoreSelect && 'lat' in suggestion && 'lng' in suggestion) {
      onStoreSelect({
        lat: suggestion.lat,
        lng: suggestion.lng,
        name: suggestion.name
      });
    }
    
    // If it's a location, fly to it
    if (suggestion.type === 'location' && onStoreSelect && 'lat' in suggestion && 'lng' in suggestion) {
      onStoreSelect({
        lat: suggestion.lat,
        lng: suggestion.lng,
        name: suggestion.name
      });
    }
    
    handleSearch(suggestion.name);
  };

  return (
    <div className="relative w-full max-w-2xl mx-auto ">
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => handleInputChange(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
          placeholder={placeholder}
          className="w-full px-4 py-3 pl-12 text-lg border border-zinc-300 dark:border-zinc-600 rounded-xl bg-white dark:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent shadow-lg"
        />
        <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-zinc-400">
          {isLoading ? '⏳' : '🔍'}
        </div>
        <button
          onClick={() => handleSearch()}
          className="absolute right-2 top-1/2 transform -translate-y-1/2 px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors font-medium text-sm"
        >
          Search
        </button>
      </div>

      {/* Suggestions dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-xl z-50 max-h-64 overflow-y-auto">
          {suggestions.map((suggestion, index) => (
            <div
              key={index}
              onClick={() => handleSuggestionClick(suggestion)}
              className="px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-800 cursor-pointer border-b border-zinc-100 dark:border-zinc-800 last:border-b-0 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-zinc-900 dark:text-zinc-100">
                    {suggestion.name}
                  </div>
                  <div className="text-sm text-zinc-500 dark:text-zinc-400">
                    {suggestion.type === 'store' 
                      ? `📍 ${suggestion.location} (Click to view)`
                      : suggestion.type === 'product'
                      ? `📦 Available in ${suggestion.available} stores`
                      : `🌍 ${suggestion.details} (Click to fly here)`
                    }
                  </div>
                </div>
                <div className="text-xs px-2 py-1 bg-zinc-100 dark:bg-zinc-800 rounded-full text-zinc-600 dark:text-zinc-400">
                  {suggestion.source === 'geocoding' ? '📍 Location' : suggestion.type}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Close suggestions when clicking outside */}
      {showSuggestions && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setShowSuggestions(false)}
        />
      )}
    </div>
  );
}
