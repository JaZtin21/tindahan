import React, { useState, useRef, useEffect } from 'react';
import { Marker } from 'react-map-gl/maplibre';
import { useSelector } from 'react-redux';
import type { PostGroup } from '../../types/map';
import type { Post } from '../../types/post';
import { PostMarkerDesign } from './PostMarker';

interface PostGroupMarkerProps {
  group: PostGroup;
  onClick?: (post: Post) => void;
}

export function PostGroupMarker({ group, onClick }: PostGroupMarkerProps) {
  const { isOpen: isPostPreviewOpen } = useSelector((state: any) => state.postPreview);
  const [currentPostIndex, setCurrentPostIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [isMyPostOpen, setIsMyPostOpen] = useState(false);
  const [wasPaused, setWasPaused] = useState(false);

  // 🚀 FIXED ENTRY ENGINE: Initializes scale and opacity at 0 so it pops/fades smoothly upon viewport mount
  const [markerScale, setMarkerScale] = useState(0);
  const [markerOpacity, setMarkerOpacity] = useState(0);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const currentIndexRef = useRef(0);

  const currentPost = group.posts[currentPostIndex];

  // 🚀 MOUNT DETECTOR: Executes your custom pop-in entry animation the moment the element registers on the map
  useEffect(() => {
    const entryTimer = setTimeout(() => {
      setMarkerScale(1);
      setMarkerOpacity(1);
    }, 50); // Small macro-task delay forces browser to process the 0 -> 1 transition smoothly

    return () => clearTimeout(entryTimer);
  }, []);

  const clearCycleInterval = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const startCycling = () => {
    clearCycleInterval();
    intervalRef.current = setInterval(() => {
      // Simultaneously drop scale to 0 AND fade opacity to 0 smoothly 250ms right before data shifts
      setMarkerScale(0);
      setMarkerOpacity(0);

      setTimeout(() => {
        setCurrentPostIndex(prev => {
          const newIndex = (prev + 1) % group.posts.length;
          currentIndexRef.current = newIndex;
          return newIndex;
        });
        // Pop and fade the brand new post cleanly back into full existence
        setMarkerScale(1);
        setMarkerOpacity(1);
      }, 250);

    }, 4000);
  };

  useEffect(() => {
    const isPaused = isHovered || isMyPostOpen;

    if (isPaused) {
      clearCycleInterval();
      setMarkerScale(1);
      setMarkerOpacity(1);
      setWasPaused(true);
    } else if (wasPaused) {
      setWasPaused(false);
      startCycling();
    } else {
      startCycling();
    }
    return () => clearCycleInterval();
  }, [isHovered, isMyPostOpen, wasPaused]);

  useEffect(() => {
    if (!isPostPreviewOpen) {
      setIsMyPostOpen(false);
      setIsHovered(false);
    }
  }, [isPostPreviewOpen]);

  if (!currentPost?.location?.lat || !currentPost?.location?.lng) return null;

  const isCurrentlyPaused = isHovered || isMyPostOpen;
  const qualityValue = isCurrentlyPaused ? 1000 : (0 + (Number(currentPost.quality) || 0));

  return (
    <Marker
      latitude={currentPost.location.lat}
      longitude={currentPost.location.lng}
      // 🚨 LOCK LAYOUT ORIENTATION: Guarantees your speech bubble stays facing flat forward when map rotates
      rotationAlignment="viewport"
      pitchAlignment="viewport"
    >
      <PostMarkerDesign
        post={currentPost}
        qualityValue={qualityValue}
        groupCount={group.posts.length}
        profilePhotoOverride={currentPost.author?.profilePhoto}
        scaleValue={markerScale}
        opacityValue={markerOpacity}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={() => {
          if (onClick) {
            const currentIndex = currentIndexRef.current;
            const clickedPost = group.posts[currentIndex];
            onClick(clickedPost);
            setIsMyPostOpen(true);
          }
        }}
      />
    </Marker>
  );
}
