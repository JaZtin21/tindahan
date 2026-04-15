// Map types

export interface Post {
  id: string;
  title?: string;
  text?: string;
  photos?: string[];
  author?: {
    id: string;
    name: string;
    email: string;
  };
  likes?: number;
  commentCount?: number;
  createdAt?: string;
  location?: { lat: number; lng: number };
  [key: string]: any;
}

export interface PostMarker {
  lat: number;
  lng: number;
  title?: string;
  type?: 'store' | 'post';
  post?: Post;
  // Rotation/clustering properties for posts
  rotationIndex?: number;
  totalInCluster?: number;
  clusterId?: string;
}

export interface MapProps {
  center: { lat: number; lng: number };
  zoom: number;
  onMapClick?: (lat: number, lng: number) => void;
  onMarkerClick?: (store: { lat: number; lng: number; name: string }) => void;
  onMapMoveEnd?: (center: { lat: number; lng: number }, zoom: number) => void;
  markers?: PostMarker[];
  currentLocation?: { lat: number; lng: number; name?: string } | null;
}

// Store types
export interface Store {
  lat: number;
  lng: number;
  title: string;
  id?: string;
}

// Post creation input
export interface CreatePostInput {
  title: string;
  text: string;
  photos: File[];
  types: string[];
  location: { lat: number; lng: number; name: string };
}

// Handler option types
export interface ProductHandlersOptions {
  setProductNameForSearch: (name: string | null) => void;
  setProductSearchStores: (stores: Store[]) => void;
  setFilteredStores: (stores: Store[]) => void;
  refetchShopsByProduct: (variables: { productName: string }) => Promise<any>;
}

export interface PostHandlersOptions {
  createPost: (options: { variables: { input: any } }) => Promise<any>;
}

export interface StoreHandlersOptions {
  setMapCenter: (center: { lat: number; lng: number }) => void;
  setMapZoom: (zoom: number) => void;
  setSelectedStore: (store: Store | null) => void;
  fetchPosts: (options: { variables: any }) => void;
  postsLoading: boolean;
  lastFetchCenterRef: React.MutableRefObject<{ lat: number; lng: number } | null>;
  dispatch: import('react').Dispatch<any>;
  openSideNav: (data: any) => any;
}

export interface LocationHandlersOptions {
  setMapCenter: (center: { lat: number; lng: number }) => void;
  setMapZoom: (zoom: number) => void;
  setLocationQuery: (query: string) => void;
  setCurrentLocation: (location: { lat: number; lng: number; name?: string } | null) => void;
  fetchPosts: (options: { variables: any }) => void;
  postsLoading: boolean;
  lastFetchCenterRef: React.MutableRefObject<{ lat: number; lng: number } | null>;
}

// Hook option types
export interface UseMapPostsOptions {
  postsData?: any;
}

export interface UseMapMarkersOptions {
  filteredStores: Store[];
  productSearchStores: Store[];
  groupedPostClusters: any[];
  clusterRotations: Map<string, number>;
  mapZoom: number;
  selectedStore: Store | null;
}

export interface MapCenter {
  lat: number;
  lng: number;
}

export interface UseMapCenterOptions {
  fetchPosts: (options: { variables: any }) => void;
  postsLoading: boolean;
  initialCenter?: MapCenter;
  initialZoom?: number;
}
