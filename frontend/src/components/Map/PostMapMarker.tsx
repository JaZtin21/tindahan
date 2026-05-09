import { useRef, useEffect } from 'react';
import { useMap } from 'react-leaflet';
import type { Post } from '../../types/post';
import { getPostBubbleHtml } from './PostMarker';

interface PostMapMarkerProps {
  post: Post;
  onClick?: (post: Post) => void;
  isEdited?: boolean;
}

export function PostMapMarker({ post, onClick, isEdited }: PostMapMarkerProps) {
  const map = useMap();
  const markerRef = useRef<any>(null);
  const isRemovingRef = useRef(false);
  const postRef = useRef<string>('');
  const onClickRef = useRef(onClick);
  
  // Keep callback ref updated
  onClickRef.current = onClick;
  
  useEffect(() => {
    // Only recreate if post ID actually changed
    if (post.id === postRef.current && markerRef.current) {
      return;
    }
    postRef.current = post.id;
    
    const init = async () => {
      const L = await import('leaflet');
      
      // Check if marker already exists
      if (markerRef.current) {
        map.removeLayer(markerRef.current);
        markerRef.current = null;
      }
      
      // Create the conversation bubble icon using actual PostMarker styling with animation
      // Skip animation if this is an edited post (just updating content, not adding new)
      const className = isEdited ? 'post-bubble-marker' : 'post-bubble-marker animate-in';
      const icon = L.divIcon({
        html: getPostBubbleHtml(post),
        className: className,
        iconSize: [200, 44],
        iconAnchor: [25, 22],
        popupAnchor: [0, -44]
      });
      
      // Create marker with post location
      const marker = L.marker([post.location!.lat, post.location!.lng], { icon });
      
      // Add click handler using ref
      marker.on('click', () => {
        onClickRef.current?.(post);
      });
      
      // Add to map
      marker.addTo(map);
      markerRef.current = marker;
    };
    
    init();
    
    return () => {
      if (markerRef.current && !isRemovingRef.current) {
        isRemovingRef.current = true;
        
        // Add animate-out class for pop-down animation
        const element = markerRef.current.getElement();
        if (element) {
          element.classList.remove('animate-in');
          element.classList.add('animate-out');
          
          // Wait for animation to complete before removing
          setTimeout(() => {
            if (markerRef.current) {
              map.removeLayer(markerRef.current);
              markerRef.current = null;
            }
            isRemovingRef.current = false;
          }, 300); // Match CSS animation duration
        } else {
          // Fallback if element not found
          map.removeLayer(markerRef.current);
          markerRef.current = null;
          isRemovingRef.current = false;
        }
      }
    };
  }, [post, map]);

  return null;
}
