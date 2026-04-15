import { useState, useEffect } from 'react';
import { groupNearbyPosts } from '../../utils/maps';
import type { UseMapPostsOptions, Post } from '../../types/map';

// CONFIGURABLE: Rotation timing settings (in milliseconds)
const POST_DISPLAY_DURATION = 3000;
const GAP_BETWEEN_POSTS = 500;

export function useMapPosts({ postsData }: UseMapPostsOptions) {
  // Cache for posts - stores fetched posts so they persist when zooming
  const [cachedPosts, setCachedPosts] = useState<Post[]>([]);
  
  // Post cluster rotation state
  const [clusterRotations, setClusterRotations] = useState<Map<string, number>>(new Map());
  const [groupedPostClusters, setGroupedPostClusters] = useState<any[]>([]);

  // Update cached posts when new data arrives - ACCUMULATE instead of replace
  useEffect(() => {
    const newPosts = postsData?.postsNearLocation?.data;
    if (newPosts && newPosts.length > 0) {
      setCachedPosts(prevPosts => {
        const existingPostsMap = new Map(prevPosts.map(p => [p.id, p]));
        newPosts.forEach((newPost: Post) => {
          existingPostsMap.set(newPost.id, newPost);
        });
        return Array.from(existingPostsMap.values());
      });
    }
  }, [postsData]);

  // Group posts into clusters ONLY when posts change (NOT on zoom)
  useEffect(() => {
    if (cachedPosts.length === 0) {
      setGroupedPostClusters([]);
      return;
    }
    
    const rawPostMarkers = cachedPosts.map((post: Post) => ({
      lat: post.location?.lat || 0,
      lng: post.location?.lng || 0,
      title: post.title?.substring(0, 30) + ((post.title?.length || 0) > 30 ? '...' : '') || 'Post',
      type: 'post' as const,
      post: post,
      id: post.id
    })).filter((m: any) => m.lat && m.lng);
    
    const clusters = groupNearbyPosts(rawPostMarkers, 15);
    setGroupedPostClusters(clusters);
    
    // Initialize rotation indices for new clusters only
    setClusterRotations(prev => {
      const next = new Map(prev);
      clusters.forEach((cluster: any) => {
        if (!next.has(cluster.id)) {
          next.set(cluster.id, 0);
        }
      });
      // Remove old clusters
      const clusterIds = new Set(clusters.map((c: any) => c.id));
      for (const id of next.keys()) {
        if (!clusterIds.has(id)) {
          next.delete(id);
        }
      }
      return next;
    });
  }, [cachedPosts]);

  // Rotation effect - cycles through posts in each cluster
  useEffect(() => {
    if (groupedPostClusters.length === 0) return;
    
    const interval = setInterval(() => {
      setClusterRotations(prev => {
        const next = new Map(prev);
        groupedPostClusters.forEach((cluster: any) => {
          const currentIndex = next.get(cluster.id) || 0;
          const nextIndex = (currentIndex + 1) % cluster.posts.length;
          next.set(cluster.id, nextIndex);
        });
        return next;
      });
    }, POST_DISPLAY_DURATION + GAP_BETWEEN_POSTS);
    
    return () => clearInterval(interval);
  }, [groupedPostClusters]);

  return {
    cachedPosts,
    clusterRotations,
    groupedPostClusters,
    setClusterRotations
  };
}
