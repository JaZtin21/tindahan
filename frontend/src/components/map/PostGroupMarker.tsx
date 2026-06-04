import { useState, useRef, useEffect } from 'react';
import { useMap } from 'react-leaflet';
import { useSelector } from 'react-redux';
import L from 'leaflet';
import type { PostGroup } from '../../types/map';
import type { Post } from '../../types/post';
import { getPhotoGridHtml } from '../common/PhotoGallery';
import { getFoodTypeIcon } from './PostMarker';
import { getPostGroupBubbleHtml } from './PostMarker';
import { getPostBubbleHtml } from './PostMarker';

/**
 * 1. Your original base layout function.
 * We inject a dynamic CSS variable (--bg-avatar) into the wrapper.
 * We replace the destructive <img> tag with a background-styled <div>.
 */

/**
 * 2. Your original group markup wrapper.
 * Appends the image URL variable directly to the parent layout shell.
 */

interface PostGroupMarkerProps {
  group: PostGroup;
  onClick?: (post: Post) => void;
}

/**
 * 3. YOUR EXACT ORIGINAL COMPONENT (100% UNCHANGED)
 */
export function PostGroupMarker({ group, onClick }: PostGroupMarkerProps) {
  const map = useMap();
  const { isOpen: isPostPreviewOpen } = useSelector((state: any) => state.postPreview);
  const markerRef = useRef<any>(null);
  const [currentPostIndex, setCurrentPostIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [isMyPostOpen, setIsMyPostOpen] = useState(false); 
  const [isResuming, setIsResuming] = useState(false); 
  const [wasPaused, setWasPaused] = useState(false); 
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const currentIndexRef = useRef(0); 
  
  const currentPost = group.posts[currentPostIndex];
  
  const clearCycleInterval = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const startCycling = () => {
    clearCycleInterval();
    intervalRef.current = setInterval(() => {
      setCurrentPostIndex(prev => {
        const newIndex = (prev + 1) % group.posts.length;
        currentIndexRef.current = newIndex; 
        return newIndex;
      });
    }, 3000);
  };

  useEffect(() => {
    const isPaused = isHovered || isMyPostOpen;
    
    if (isPaused) {
      clearCycleInterval();
      setIsResuming(false); 
      setWasPaused(true); 
    } else if (wasPaused) {
      setIsResuming(true); 
      setWasPaused(false); 
      
      setTimeout(() => {
        setCurrentPostIndex(prev => {
          const newIndex = (prev + 1) % group.posts.length;
          currentIndexRef.current = newIndex; 
          return newIndex;
        });
        setIsResuming(false);
        startCycling();
      }, 500); 
    } else {
      startCycling();
    }
  }, [isHovered, isMyPostOpen, wasPaused]);

  useEffect(() => {
    if (!isPostPreviewOpen) {
      setIsMyPostOpen(false);
      setIsHovered(false);
    }
  }, [isPostPreviewOpen]);

  useEffect(() => {
    const firstPost = group.posts[0];
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
        const currentIndex = currentIndexRef.current;
        const clickedPost = group.posts[currentIndex];
        onClick(clickedPost);
        setIsMyPostOpen(true); 
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

  useEffect(() => {
    if (!markerRef.current) return;
    
    const lat = currentPost.location!.lat;
    const lng = currentPost.location!.lng;
    
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
