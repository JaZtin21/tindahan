import { useState } from 'react';
import { useLazyQuery } from '@apollo/client/react'; // useLazyQuery for async data fetching
import { SEARCH_SHOPS_QUERY } from '../../api/graphql/shop/shop-queries';
import { ITEMS_QUERY } from '../../api/graphql/product/product-queries';
import { searchLocation } from '../../utils/maps';

interface SearchBarProps {
  onSearch: (query: string) => void;
  onStoreSelect?: (store: { lat: number; lng: number; name: string }) => void;
  onProductSelect?: (productName: string, stores: any[]) => void;
  onClearProductStores?: () => void;
  placeholder?: string;
}

export function SearchBar({ onSearch, onStoreSelect, onProductSelect, onClearProductStores, placeholder = "Search for stores, products, or locations..." }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTimeout, setSearchTimeout] = useState<number | null>(null);
  
  // GraphQL lazy queries - returns a function we can call to fetch data
  const [searchShops] = useLazyQuery(SEARCH_SHOPS_QUERY);
  const [searchProducts] = useLazyQuery(ITEMS_QUERY);

  const handleInputChange = (value: string) => {
    setQuery(value);
    
    // Clear previous timeout
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }
    
    if (value.trim()) {
      setIsLoading(true);
      
      // Debounce search - wait 300ms after typing stops
      const timeout = setTimeout(async () => {
        console.log('Debounce triggered for:', value);
        
        // Trigger both searches and AWAIT the results (fixes race condition)
        const [shopsResult, productsResult] = await Promise.all([
          searchShops({ variables: { query: value, page: 1, limit: 10 } }),
          searchProducts({ variables: { input: { query: value, page: 1, limit: 10 } } })
        ]);
        
        const shops = shopsResult.data?.searchShops?.data || [];
        const products = productsResult.data?.items?.data || [];
        
        // Search for locations
        const locationResults = await searchLocation(value);
        
        // Format results
        const formattedShops = shops.map((shop: any) => ({
          type: 'store',
          id: shop.id,
          name: shop.name,
          location: shop.location,
          lat: shop.coordinates?.lat,
          lng: shop.coordinates?.lng,
          source: 'api'
        }));
        
        // Format products - only show unique product names
        const uniqueProducts = new Map();
        products.forEach((product: any) => {
          if (!uniqueProducts.has(product.name)) {
            uniqueProducts.set(product.name, {
              type: 'product',
              name: product.name,
              id: product.id,
              source: 'api'
            });
          }
        });
        const formattedProducts = Array.from(uniqueProducts.values());
        
        // Combine results
        const allResults = [
          ...formattedShops,
          ...formattedProducts,
          ...locationResults.map((item: any) => ({ ...item, source: 'geocoding' }))
        ];
        
        setSuggestions(allResults);
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

  const handleSearch = (searchQuery?: string) => {
    const finalQuery = searchQuery || query;
    if (finalQuery.trim()) {
      onSearch(finalQuery.trim());
      setShowSuggestions(false);
    }
  };

  const handleSuggestionClick = async (suggestion: any) => {
    setQuery(suggestion.name);
    
    console.log('[SearchBar] Clicked suggestion:', suggestion.type, suggestion.name);
    
    // If it's a store, call the store select callback (navigates to shop)
    // AND clear any product search stores from map
    if (suggestion.type === 'store' && onStoreSelect && suggestion.lat && suggestion.lng) {
      console.log('[SearchBar] Clearing product stores for store click');
      if (onClearProductStores) {
        onClearProductStores();
      }
      onStoreSelect({
        id: suggestion.id,
        lat: suggestion.lat,
        lng: suggestion.lng,
        name: suggestion.name
      });
    }
    
    // If it's a location, fly to it AND clear product search stores
    else if (suggestion.type === 'location' && onStoreSelect && suggestion.lat && suggestion.lng) {
      console.log('[SearchBar] Clearing product stores for location click');
      if (onClearProductStores) {
        onClearProductStores();
      }
      onStoreSelect({
        lat: suggestion.lat,
        lng: suggestion.lng,
        name: suggestion.name
      });
    }
    
    // If it's a product, fetch stores that have this product and show on map (no navigation)
    // Don't clear - product search will set new stores
    else if (suggestion.type === 'product' && onProductSelect) {
      console.log('[SearchBar] Product clicked, not clearing stores');
      onProductSelect(suggestion.name, []);
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
          className="w-full px-4 py-3 pl-12 text-lg border border-zinc-300 dark:border-zinc-600 rounded-xl bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent shadow-lg"
        />
        <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-zinc-400">
          {isLoading ? '⏳' : '🔍'}
        </div>
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
                      ? `🏪 ${suggestion.location || 'Store'} (Click to view)`
                      : suggestion.type === 'product'
                      ? `📦 Click to see stores with this product`
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
