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
  
  const handleStoreSelect = (store: { lat: number; lng: number; name: string; id?: string }) => {
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
      id: store.id || 'selected-store'
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
      description: 'Local sari-sari store offering daily essentials and snacks.',
      address: 'Address not available',
      phone: '+63 XXX XXX XXXX',
      hours: '6:00 AM - 9:00 PM'
    }));
  };

  return { handleStoreSelect };
}
