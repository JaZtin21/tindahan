// Geocoding utility functions using Nominatim

/**
 * Reverse geocode coordinates to get address name using MapTiler
 */
export const reverseGeocode = async (lat: number, lng: number): Promise<string> => {
  try {
    console.log('🔍 MapTiler Reverse geocoding for:', { lat, lng });

    // 1. Grab your key securely from Vite's environment bundle
    const key = import.meta.env.VITE_MAPTILE_KEY || '';
    if (!key) {
      console.error('❌ MAPTILER CONFIG ERROR: VITE_MAPTILE_KEY is missing from .env');
      return `Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
    }

    // 2. MapTiler demands coordinates in [longitude, latitude] order!
    const url = `https://api.maptiler.com/geocoding/${lng},${lat}.json?key=${key}&limit=1`;

    const response = await fetch(url);
    const data = await response.json();

    // 3. Extract the clean human-readable address name from features
    if (data && data.features && data.features.length > 0) {
      const formattedAddress = data.features[0].place_name;
      console.log('✅ MapTiler Reverse resolved cleanly:', formattedAddress);
      return formattedAddress;
    } else {
      // Clean fallback text string instead of numeric coordinate labels
      return 'Unknown Location Name';
    }
  } catch (error: any) {
    console.error('❌ MapTiler Reverse geocoding ERROR:', error);
    // Fallback to literal text description on network failure
    return 'Location name not found';
  }
};


/**
 * Search for locations by query string
 */
export const searchLocation = async (query: string): Promise<Array<{
  type: 'location';
  name: string;
  lat: number;
  lng: number;
  details: string;
}>> => {
  try {
    console.log('🔍 MAPTILER API TRIGGERED - Searching for:', query);
    
    // 1. Grab your key securely from Vite's environment bundle
    const key = import.meta.env.VITE_MAPTILE_KEY || '';
    if (!key) {
      console.error('❌ MAPTILER CONFIG ERROR: VITE_MAPTILE_KEY is missing from .env');
      return [];
    }

    const url = `https://api.maptiler.com/geocoding/${encodeURIComponent(query)}.json?key=${key}&limit=5`;
    
    console.log('📡 Making request to MapTiler:', url);

    const response = await fetch(url);
    console.log('📡 Response status:', response.status);

    const data = await response.json();
    console.log('📊 Raw MapTiler response:', data);
    
    // 2. Loop through the MapTiler features structure
    const features = data.features || [];
    console.log('📈 Results count:', features.length);

    const results = features.map((item: any) => {
      // MapTiler coordinates are strictly ordered as [longitude, latitude]
      const [lng, lat] = item.center;

      return {
        type: 'location' as const,
        name: item.place_name, 
        lat: lat,
        lng: lng,
        // Grabs descriptive category tag or place types (e.g., 'poi', 'street', 'city')
        details: item.properties?.category || item.place_type?.[0] || 'location' 
      };
    });

    console.log('✅ Processed MapTiler results:', results);
    return results;
  } catch (error: any) {
    console.error('❌ MAPTILER API ERROR:', error);
    console.error('❌ Error details:', error?.message || 'Unknown error');
    return [];
  }
};

