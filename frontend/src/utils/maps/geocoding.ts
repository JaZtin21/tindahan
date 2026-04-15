// Geocoding utility functions using Nominatim

const NOMINATIM_BASE_URL = 'https://nominatim.openstreetmap.org';

/**
 * Reverse geocode coordinates to get address
 */
export const reverseGeocode = async (lat: number, lng: number): Promise<string> => {
  try {
    console.log('🔍 Reverse geocoding for:', { lat, lng });

    const response = await fetch(
      `${NOMINATIM_BASE_URL}/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`
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
    console.log('🔍 API TRIGGERED - Searching for:', query);
    console.log('📡 Making request to:', `${NOMINATIM_BASE_URL}/search`);

    const response = await fetch(
      `${NOMINATIM_BASE_URL}/search?format=json&q=${encodeURIComponent(query)}&limit=5`
    );

    console.log('📡 Response status:', response.status);

    const data = await response.json();
    console.log('📊 Raw API response:', data);
    console.log('📈 Results count:', data.length);

    const results = data.map((item: any) => ({
      type: 'location' as const,
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
