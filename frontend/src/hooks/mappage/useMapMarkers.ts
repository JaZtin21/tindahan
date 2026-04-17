import { useState, useEffect } from 'react';
import type { UseMapMarkersOptions } from '../../types/map';

export function useMapMarkers({
  filteredStores,
  productSearchStores,
  groupedPostClusters,
  clusterRotations,
  mapZoom,
  selectedStore
}: UseMapMarkersOptions) {
  const [allMarkers, setAllMarkers] = useState<any[]>([]);

  useEffect(() => {
    // Use product search stores if available, otherwise fall back to filtered stores
    const storesToShow = productSearchStores.length > 0 ? productSearchStores : filteredStores;
    
    // Convert stores to marker format with all data for sidebar
    const storeMarkers = storesToShow.map(store => ({
      lat: store.lat,
      lng: store.lng,
      title: store.title,
      type: 'store' as const,
      id: store.id,
      location: store.location,
      coverPhoto: store.coverPhoto,
      businessType: store.businessType,
      description: store.description,
      phone: store.phone,
      email: store.email,
      hours: store.hours,
    }));
    
    // Only show posts when zoom > 16
    let visiblePostMarkers: any[] = [];
    
    if (mapZoom > 16) {
      groupedPostClusters.forEach((cluster: any) => {
        const currentIndex = clusterRotations.get(cluster.id) || 0;
        const currentPost = cluster.posts[currentIndex];
        
        if (currentPost) {
          visiblePostMarkers.push({
            lat: currentPost.lat,
            lng: currentPost.lng,
            title: currentPost.post?.title?.substring(0, 30) + ((currentPost.post?.title?.length || 0) > 30 ? '...' : '') || 'Post',
            type: 'post' as const,
            post: currentPost.post,
            clusterId: cluster.id,
            rotationIndex: currentIndex,
            totalInCluster: cluster.posts.length
          });
        }
      });
    }
    
    // Add selected store as a marker if no product stores are showing
    if (productSearchStores.length === 0 && filteredStores.length === 0 && selectedStore) {
      storeMarkers.push({
        lat: selectedStore.lat,
        lng: selectedStore.lng,
        title: selectedStore.title,
        type: 'store' as const,
        id: selectedStore.id,
        location: selectedStore.location,
        coverPhoto: selectedStore.coverPhoto,
        businessType: selectedStore.businessType,
        description: selectedStore.description,
        phone: selectedStore.phone,
        email: selectedStore.email,
        hours: selectedStore.hours,
        rating: selectedStore.rating,
      });
    }
    
    // Combine stores and visible posts
    setAllMarkers([...storeMarkers, ...visiblePostMarkers]);
  }, [filteredStores, productSearchStores, groupedPostClusters, clusterRotations, mapZoom, selectedStore]);

  return { allMarkers };
}
