import type { Post as PostType } from '../map';

// Re-export Post from map types
export type { PostType as Post };

// Post creation input type (for forms)
export interface CreatePostInput {
  title: string;
  text: string;
  photos: File[];
  types: string[];
  location: { lat: number; lng: number; name: string };
}

// Component Props Interfaces
export interface CreatePostModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (post: { title: string; text: string; photos: File[]; types: string[]; location: { lat: number; lng: number; name: string } }) => void;
  isSubmitting?: boolean;
  currentLocation?: { lat: number; lng: number; name?: string } | null;
}
