// Map types

export interface Post {
  id: string;
  title: string;
  text: string;
  photos: string[];
  author: {
    id: string;
    name: string;
    email: string;
  };
  likes: number;
  commentCount: number;
  createdAt: string;
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
