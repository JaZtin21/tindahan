import { useState, useRef, useEffect } from 'react';
import { useMap } from 'react-leaflet';
import { useSelector } from 'react-redux';
import L from 'leaflet';
import type { PostGroup } from '../../types/map';
import type { Post } from '../../types/post';
import { getPostGroupBubbleHtml } from './PostMarker';

interface PostGroupMarkerProps {
  group: PostGroup;
  onClick?: (post: Post) => void;
}

export function PostGroupMarker({ group, onClick }: PostGroupMarkerProps) {
  const map = useMap();
  const { isOpen: isPostPreviewOpen } = useSelector((state: any) => state.postPreview);
  const markerRef = useRef<any>(null);
  const [currentPostIndex, setCurrentPostIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [isMyPostOpen, setIsMyPostOpen] = useState(false); // Track if MY post is in modal
  const [isResuming, setIsResuming] = useState(false); // Track if resuming after hover/modal
  const [wasPaused, setWasPaused] = useState(false); // Track if we were paused before
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const currentIndexRef = useRef(0); // Ref to track current index for click handler
  
  // Get current post
  const currentPost = group.posts[currentPostIndex];
  
  // Clear interval
  const clearCycleInterval = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  // Start cycling
  const startCycling = () => {
    clearCycleInterval();
    intervalRef.current = setInterval(() => {
      setCurrentPostIndex(prev => {
        const newIndex = (prev + 1) % group.posts.length;
        currentIndexRef.current = newIndex; // Keep ref in sync
        return newIndex;
      });
    }, 3000);
  };

  // Handle hover and modal state - only pause if MY post is open or I'm hovered
  useEffect(() => {
    const isPaused = isHovered || isMyPostOpen;
    
    if (isPaused) {
      clearCycleInterval();
      setIsResuming(false); // Not resuming when paused
      setWasPaused(true); // Track that we were paused
    } else if (wasPaused) {
      // We were paused and now we're not - resume with popdown only
      setIsResuming(true); // Set resuming state for popdown only
      setWasPaused(false); // Reset paused tracking
      
      // After popdown animation, go to next post and resume normal cycling
      setTimeout(() => {
        setCurrentPostIndex(prev => {
          const newIndex = (prev + 1) % group.posts.length;
          currentIndexRef.current = newIndex; // Keep ref in sync
          return newIndex;
        });
        setIsResuming(false);
        startCycling();
      }, 500); // Match popdown animation duration
    } else {
      // Normal cycling (no previous pause)
      startCycling();
    }
  }, [isHovered, isMyPostOpen, wasPaused]);

  // Sync local modal state with global state
  useEffect(() => {
    if (!isPostPreviewOpen) {
      setIsMyPostOpen(false);
      setIsHovered(false);
      
    }
  }, [isPostPreviewOpen]);

  // Create marker once
  useEffect(() => {
    const firstPost = group.posts[0];
    // Use ACTUAL post position, not offset position
    const lat = firstPost.location!.lat;
    const lng = firstPost.location!.lng;

    const icon = L.divIcon({
      html: getPostGroupBubbleHtml(firstPost, group.posts.length),
      className: 'post-bubble-marker group-marker-animate',
      iconSize: [40, 44],
      iconAnchor: [20, 44],
      popupAnchor: [0, -44]
    });

    const marker = L.marker([lat, lng], { icon });
    
    marker.on('click', () => {
      if (onClick) {
        // Get the current post index from ref (always up-to-date)
        const currentIndex = currentIndexRef.current;
        const clickedPost = group.posts[currentIndex];
        onClick(clickedPost);
        setIsMyPostOpen(true); // Track that MY post is open
      }
    });
    
    marker.on('mouseover', () => {
      setIsHovered(true);
    });
    
    marker.on('mouseout', () => {
      setIsHovered(false);
    });
    
    marker.addTo(map);
    markerRef.current = marker;

    return () => {
      clearCycleInterval();
      if (markerRef.current) {
        map.removeLayer(markerRef.current);
        markerRef.current = null;
      }
    };
  }, [map, group.posts.length]);

  // Update marker icon and position when current post changes
  useEffect(() => {
    if (!markerRef.current) return;
    
    // Use ACTUAL post position, not offset position
    const lat = currentPost.location!.lat;
    const lng = currentPost.location!.lng;
    
    // Set class based on LOCAL state (not global)
    let className = 'post-bubble-marker';
    if (isHovered || isMyPostOpen) {
      className += ' paused';
    } else if (isResuming) {
      className += ' resuming';
    } else {
      className += ' cycling';
    }
    
    markerRef.current.setLatLng([lat, lng]);
    markerRef.current.setIcon(L.divIcon({
      html: getPostGroupBubbleHtml(currentPost, group.posts.length),
      className,
      iconSize: [40, 44],
      iconAnchor: [20, 44],
      popupAnchor: [0, -44]
    }));
  }, [currentPostIndex, currentPost, isHovered, isResuming]);

  return null;
}
