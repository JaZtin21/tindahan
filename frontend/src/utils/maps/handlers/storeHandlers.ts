import { calculateRadiusFromZoom } from '../index';
import type { StoreHandlersOptions } from '../../../types/map';

export function createStoreHandlers({
  setMapCenter,
  setMapZoom,
  setSelectedStore,
  fetchPosts,
  postsLoading,
  lastFetchCenterRef,
  dispatch,
  openSideNav
}: StoreHandlersOptions) {
  
  const handleStoreSelect = (store: { lat: number; lng: number; name: string; id?: string; description?: string; location?: string; coverPhoto?: string; businessType?: string; phone?: string; email?: string; hours?: string }) => {
    console.log('Flying to store:', store);
    const newCenter = { lat: store.lat, lng: store.lng };
    setMapCenter(newCenter);
    setMapZoom(20);
    lastFetchCenterRef.current = { lat: store.lat, lng: store.lng };
    
    // Set selected store for highlighting
    setSelectedStore({
      lat: store.lat,
      lng: store.lng,
      title: store.name,
      id: store.id || 'selected-store',
      location: store.location,
      coverPhoto: store.coverPhoto,
      businessType: store.businessType
    });
    
    // Fetch posts immediately for store location
    if (!postsLoading) {
      fetchPosts({
        variables: {
          lat: store.lat,
          lng: store.lng,
          radius: calculateRadiusFromZoom(20),
          page: 1,
          limit: 50
        }
      });
    }

    dispatch(openSideNav({
      name: store.name,
      lat: store.lat,
      lng: store.lng,
      type: 'store',
      description: store.description,
      address: store.location || 'Address not available',
      image: store.coverPhoto,
      phone: store.phone,
      email: store.email,
      hours: store.hours
    }));
  };

  return { handleStoreSelect };
}
