interface Post {
  id: string;
  lat: number;
  lng: number;
  [key: string]: any;
}

interface PostCluster {
  id: string;
  posts: Post[];
  centerLat: number;
  centerLng: number;
}

/**
 * Groups posts that are within a certain distance of each other.
 * Unlike clusterNearbyPosts, this keeps posts at their original locations
 * and returns them as groups for sequential display.
 * 
 * @param posts - Array of posts with lat/lng
 * @param threshold - Distance threshold in meters (default 50m)
 * @returns Array of clusters, each containing posts at the same location
 */
export function groupNearbyPosts(
  posts: Post[],
  threshold: number = 50
): PostCluster[] {
  if (posts.length === 0) return [];
  if (posts.length === 1) {
    return [{
      id: `cluster-${posts[0].id}`,
      posts: [posts[0]],
      centerLat: posts[0].lat,
      centerLng: posts[0].lng
    }];
  }

  const processed = new Set<number>();
  const clusters: PostCluster[] = [];

  // Create working copy
  const workingPosts = posts.map((p, index) => ({ ...p, _index: index }));

  for (let i = 0; i < workingPosts.length; i++) {
    if (processed.has(i)) continue;

    const currentPost = workingPosts[i];
    const clusterPosts: typeof workingPosts = [currentPost];

    // Find all posts within threshold
    for (let j = i + 1; j < workingPosts.length; j++) {
      if (processed.has(j)) continue;

      const otherPost = workingPosts[j];
      const distance = calculateDistance(
        currentPost.lat,
        currentPost.lng,
        otherPost.lat,
        otherPost.lng
      );

      if (distance <= threshold) {
        clusterPosts.push(otherPost);
        processed.add(j);
      }
    }

    // Calculate cluster center
    const centerLat = clusterPosts.reduce((sum, p) => sum + p.lat, 0) / clusterPosts.length;
    const centerLng = clusterPosts.reduce((sum, p) => sum + p.lng, 0) / clusterPosts.length;

    clusters.push({
      id: `cluster-${currentPost.id}`,
      posts: clusterPosts,
      centerLat,
      centerLng
    });

    processed.add(i);
  }

  return clusters;
}

/**
 * Calculate distance between two coordinates in meters
 */
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000; // Earth's radius in meters
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return deg * Math.PI / 180;
}

export type { Post, PostCluster };
