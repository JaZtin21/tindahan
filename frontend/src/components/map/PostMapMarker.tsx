import React, { useState, useEffect } from 'react';
import { Marker } from 'react-map-gl/maplibre';
import type { Post } from '../../types/post';
import { PostMarkerDesign } from './PostMarker';

interface PostMapMarkerProps {
  post: Post;
  onClick?: (post: Post) => void;
}

export function PostMapMarker({ post, onClick }: PostMapMarkerProps) {
  // 🚀 FIXED ENTRY ENGINE: Initializes scale and opacity at 0 so it pops/fades smoothly upon viewport mount
  const [markerScale, setMarkerScale] = useState(0);
  const [markerOpacity, setMarkerOpacity] = useState(0);

  // 🚀 MOUNT DETECTOR: Executes entry pop-in transitions immediately upon map registration
  useEffect(() => {
    const entryTimer = setTimeout(() => {
      setMarkerScale(1);
      setMarkerOpacity(1);
    }, 50); // A 50ms macro-task delay forces the browser to process the 0 -> 1 transition smoothly
    return () => clearTimeout(entryTimer);
  }, []);

  if (!post.location?.lat || !post.location?.lng) return null;

  const qualityValue = 1 + (Number(post.quality) || 0);

  return (
    <Marker
      latitude={post.location.lat}
      longitude={post.location.lng}
      // 🚨 LOCK LAYOUT ORIENTATION: Guarantees single markers stay facing flat forward when map rotates
      rotationAlignment="viewport"
      pitchAlignment="viewport"
    >
      <PostMarkerDesign
        post={post}
        qualityValue={qualityValue}
        // 🚀 PASS DUAL ENTRY STATE PROPS DOWN CLEANLY:
        scaleValue={markerScale}
        opacityValue={markerOpacity}
        onClick={() => onClick?.(post)}
      />
    </Marker>
  );
}
