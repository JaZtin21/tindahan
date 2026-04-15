import { calculateRadiusFromZoom, reverseGeocode } from '../index';
import type { LocationHandlersOptions } from '../../../types/map';

export function createLocationHandlers({
  setMapCenter,
  setMapZoom,
  setLocationQuery,
  setCurrentLocation,
  fetchPosts,
  postsLoading,
  lastFetchCenterRef,
  setIsLocating
}: LocationHandlersOptions) {

  const handleLocationSelect = (location: { lat: number; lng: number; name: string }) => {
    const newCenter = { lat: location.lat, lng: location.lng };
    setMapCenter(newCenter);
    setMapZoom(17);
    setLocationQuery(location.name);
    setCurrentLocation({ lat: location.lat, lng: location.lng, name: location.name });
    lastFetchCenterRef.current = { lat: location.lat, lng: location.lng };
    
    // Fetch posts immediately for new location
    if (!postsLoading) {
      fetchPosts({
        variables: {
          lat: location.lat,
          lng: location.lng,
          radius: calculateRadiusFromZoom(17),
          page: 1,
          limit: 50
        }
      });
    }
  };

  const handleMyLocation = async () => {
    console.log('Getting your location...');
    setIsLocating?.(true); // Start loading indicator

    // Detect if PC (no touch support or large screen) vs Mobile
    const isPC = !('ontouchstart' in window) || window.innerWidth > 1024;
    
    // PC gets shorter timeout and no high accuracy (faster fallback)
    const timeout = isPC ? 3000 : 10000;
    const enableHighAccuracy = !isPC; // Disable on PC for faster response

    console.log(`[MyLocation] Device detected: ${isPC ? 'PC' : 'Mobile'}, timeout: ${timeout}ms, highAccuracy: ${enableHighAccuracy}`);

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          resolve,
          reject,
          {
            enableHighAccuracy,
            timeout,
            maximumAge: isPC ? 60000 : 0 // Allow 1min cached on PC for faster response
          }
        );
      });

      const userLocation = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      };

      console.log('ACTUAL User location:', userLocation);
      console.log('GPS Accuracy:', position.coords.accuracy, 'meters');

      // Update map immediately - don't wait for geocoding
      setMapCenter(userLocation);
      setMapZoom(20);
      lastFetchCenterRef.current = { lat: userLocation.lat, lng: userLocation.lng };

      // Show accuracy warning only if very poor
      if (position.coords.accuracy > 1000) {
        console.warn('Location accuracy is poor (', position.coords.accuracy, 'meters)');
      }

      // Run geocoding and posts fetching IN PARALLEL (not sequential)
      const [address] = await Promise.all([
        reverseGeocode(userLocation.lat, userLocation.lng),
        // Fetch posts in parallel with geocoding
        !postsLoading ? fetchPosts({
          variables: {
            lat: userLocation.lat,
            lng: userLocation.lng,
            radius: calculateRadiusFromZoom(20),
            page: 1,
            limit: 50
          }
        }) : Promise.resolve(null)
      ]);

      setLocationQuery(address);
      setCurrentLocation({ ...userLocation, name: address });

      console.log('Map centered and MAX zoomed on your location!');
      console.log('Address found:', address);
    } catch (error) {
      console.error('Error getting location:', error);
      console.log('Location error details:', (error as Error).message);
      alert(`Failed to get your location: ${(error as Error).message}. Please enable location services and try again.`);
    } finally {
      setIsLocating?.(false); // Stop loading indicator
    }
  };

  return { handleLocationSelect, handleMyLocation };
}
