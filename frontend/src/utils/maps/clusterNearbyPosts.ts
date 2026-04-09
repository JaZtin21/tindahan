interface Post {
  lat: number;
  lng: number;
  [key: string]: any;
}

interface ClusteredPost extends Post {
  clustered?: boolean;
  originalLat?: number;
  originalLng?: number;
  mirrored?: boolean;
}

/**
 * Clusters posts that are within a certain distance of each other
 * and arranges them in a grid pattern to prevent overlapping.
 * 
 * @param posts - Array of posts with lat/lng
 * @param threshold - Distance threshold in meters (default 50m)
 * @param gridSpacing - Spacing between grid items in meters (default 60m)
 * @returns Posts with adjusted positions for clustered items
 */
export function clusterNearbyPosts(
  posts: Post[],
  threshold: number = 50,
  gridSpacing: number = 60
): Post[] {
  if (posts.length <= 1) return posts;

  const processed = new Set<number>();
  const result: Post[] = [];

  // Create working copy
  const workingPosts = posts.map((p, index) => ({ ...p, _index: index }));

  for (let i = 0; i < workingPosts.length; i++) {
    if (processed.has(i)) continue;

    const currentPost = workingPosts[i];
    const cluster: typeof workingPosts = [currentPost];

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
        cluster.push(otherPost);
        processed.add(j);
      }
    }

    if (cluster.length === 1) {
      // Single post, no adjustment needed
      result.push(currentPost);
      processed.add(i);
    } else {
      // Multiple posts in cluster - arrange in grid
      processed.add(i);
      
      const gridPositions = calculateGridPositions(
        currentPost.lat,
        currentPost.lng,
        cluster.length,
        gridSpacing
      );

      cluster.forEach((post, idx) => {
        const col = idx % 2; // 0 = left, 1 = right
        result.push({
          ...post,
          lat: gridPositions[idx].lat,
          lng: gridPositions[idx].lng,
          originalLat: post.lat,
          originalLng: post.lng,
          clustered: true,
          mirrored: col === 1 // Right column gets mirrored layout
        });
      });
    }
  }

  return result;
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

/**
 * Calculate grid positions around a center point
 * 2 columns, multiple rows, no spacing between items
 */
function calculateGridPositions(
  centerLat: number,
  centerLng: number,
  count: number,
  spacing: number
): { lat: number; lng: number }[] {
  const positions: { lat: number; lng: number }[] = [];
  
  // Calculate grid dimensions - 2 columns, multiple rows
  const cols = 2;
  const rows = Math.ceil(count / cols);
  
  // Convert meter offsets to lat/lng (approximate)
  // 1 degree lat ≈ 111km
  // 1 degree lng ≈ 111km * cos(lat)
  const latOffsetPerMeter = 1 / 111000;
  const lngOffsetPerMeter = 1 / (111000 * Math.cos(toRad(centerLat)));
  
  // Minimum spacing to prevent complete overlap (5 meters - essentially touching)
  const minSpacing = 5; 
  const effectiveSpacing = Math.max(spacing, minSpacing);
  
  // For 2 items: place them right next to each other with minimal gap
  if (count === 2) {
    const halfOffset = effectiveSpacing / 2;
    positions.push(
      { lat: centerLat, lng: centerLng - halfOffset * lngOffsetPerMeter },
      { lat: centerLat, lng: centerLng + halfOffset * lngOffsetPerMeter }
    );
    return positions;
  }
  
  // Calculate offset to center the grid
  const totalWidth = (cols - 1) * effectiveSpacing;
  const totalHeight = (rows - 1) * effectiveSpacing;
  
  const startLat = centerLat - (totalHeight / 2) * latOffsetPerMeter;
  const startLng = centerLng - (totalWidth / 2) * lngOffsetPerMeter;
  
  for (let i = 0; i < count; i++) {
    const row = Math.floor(i / cols);
    const col = i % cols;
    
    positions.push({
      lat: startLat + row * effectiveSpacing * latOffsetPerMeter,
      lng: startLng + col * effectiveSpacing * lngOffsetPerMeter
    });
  }
  
  return positions;
}

export type { Post, ClusteredPost };
