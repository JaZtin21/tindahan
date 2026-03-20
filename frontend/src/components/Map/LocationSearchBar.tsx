import React, { useState } from 'react';

interface LocationSearchBarProps {
  onLocationSelect: (location: { lat: number; lng: number; name: string }) => void;
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
}

// Nominatim geocoding function
const searchLocation = async (query: string) => {
  try {
    console.log('🔍 Location API TRIGGERED - Searching for:', query);
    
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5`
    );
    
    const data = await response.json();
    
    const results = data.map((item: any) => ({
      type: 'location',
      name: item.display_name,
      lat: parseFloat(item.lat),
      lng: parseFloat(item.lon),
      details: item.class
    }));
    
    return results;
  } catch (error: any) {
    console.error('❌ Location API ERROR:', error);
    return [];
  }
};

export function LocationSearchBar({ onLocationSelect, placeholder = "Search for a location...", value, onChange }: LocationSearchBarProps) {
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTimeout, setSearchTimeout] = useState<number | null>(null);

  const handleInputChange = (inputValue: string) => {
    // Call onChange to update parent state
    if (onChange) {
      onChange(inputValue);
    }
    
    // Clear previous timeout
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }
    
    if (inputValue.trim()) {
      setIsLoading(true);
      
      // Debounce search - wait 300ms after typing stops
      const timeout = setTimeout(async () => {
        const locationResults = await searchLocation(inputValue);
        setSuggestions(locationResults);
        setShowSuggestions(true);
        setIsLoading(false);
      }, 300);
      
      setSearchTimeout(timeout);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
      setIsLoading(false);
    }
  };

  const handleLocationSelect = (location: any) => {
    if (onChange) {
      onChange(location.name);
    }
    onLocationSelect({
      lat: location.lat,
      lng: location.lng,
      name: location.name
    });
    setShowSuggestions(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && showSuggestions && suggestions.length > 0) {
      handleLocationSelect(suggestions[0]);
    }
  };

  return (
    <div className="relative w-full">
      <input
        type="text"
        value={value || ''}
        onChange={(e) => handleInputChange(e.target.value)}
        onKeyPress={handleKeyPress}
        placeholder={placeholder}
        className="w-full px-4 py-3 pl-12 text-lg border border-zinc-300 dark:border-zinc-600 rounded-xl bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
      />
      <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-zinc-400">
        {isLoading ? '⏳' : '📍'}
      </div>
      
      {/* Suggestions dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-xl z-50 max-h-64 overflow-y-auto">
          {suggestions.map((suggestion, index) => (
            <div
              key={index}
              onClick={() => handleLocationSelect(suggestion)}
              className="px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-800 cursor-pointer border-b border-zinc-100 dark:border-zinc-800 last:border-b-0 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-zinc-900 dark:text-zinc-100">
                    {suggestion.name}
                  </div>
                  <div className="text-sm text-zinc-500 dark:text-zinc-400">
                    🌍 {suggestion.details} (Click to fly here)
                  </div>
                </div>
                <div className="text-xs px-2 py-1 bg-zinc-100 dark:bg-zinc-800 rounded-full text-zinc-600 dark:text-zinc-400">
                  📍 Location
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
