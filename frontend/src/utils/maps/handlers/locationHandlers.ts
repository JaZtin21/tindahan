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

      if (position.coords.accuracy > 1000) {
        console.warn('Location accuracy is poor (', position.coords.accuracy, 'meters)');
        alert(`Location accuracy is poor (${position.coords.accuracy.toFixed(0)}m). This is normal on PC. For better accuracy, try on your phone.`);
      }

      setMapCenter(userLocation);
      setMapZoom(20);

      const address = await reverseGeocode(userLocation.lat, userLocation.lng);
      setLocationQuery(address);
      setCurrentLocation({ ...userLocation, name: address });
      lastFetchCenterRef.current = { lat: userLocation.lat, lng: userLocation.lng };
      
      // Fetch posts immediately for user location
      if (!postsLoading) {
        fetchPosts({
          variables: {
            lat: userLocation.lat,
            lng: userLocation.lng,
            radius: calculateRadiusFromZoom(20),
            page: 1,
            limit: 50
          }
        });
      }

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
