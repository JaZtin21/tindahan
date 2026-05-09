import type { PostOrGroup } from '../../types/map';

// Haversine distance calculation between two lat/lng points in meters
export function getDistanceInMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371e3; // Earth radius in meters
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lng2 - lng1) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) *
    Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

// Group posts that are within threshold distance of each other
export function clusterPosts(posts: any[], thresholdMeters: number): PostOrGroup[] {

  
  if (posts.length === 0) return [];

  const used = new Set<string>();
  const result: PostOrGroup[] = [];

  for (const post of posts) {
    if (used.has(post.id)) continue;
    if (!post.location || post.location.lat == null || post.location.lng == null) continue;

    const group: any[] = [post];
    used.add(post.id);

    for (const other of posts) {
      if (used.has(other.id)) continue;
      if (!other.location || other.location.lat == null || other.location.lng == null) continue;
      if (post.id === other.id) continue;

      const distance = getDistanceInMeters(
        post.location.lat, post.location.lng,
        other.location.lat, other.location.lng
      );

      if (distance <= thresholdMeters) {
       group.push(other);
        used.add(other.id);
      }
    }

    if (group.length === 1) {
      result.push({ type: 'single', post });
    } else {
      // Group posts without center calculation - individual posts will use their own positions
      result.push({ type: 'group', group: { posts: group } });
    }
  }

   return result;
}

// Calculate offset position for grouped markers to prevent overlap
export function getOffsetPosition(index: number, total: number, baseLat: number, baseLng: number): [number, number] {
  if (total <= 1) return [baseLat, baseLng];
  
  // Arrange in a small circle around the base position
  // 10 meters offset at equator ~ 0.00009 degrees
  const offsetMeters = 15;
  const angle = (2 * Math.PI * index) / total;
  const latOffset = (offsetMeters * Math.cos(angle)) / 111320;
  const lngOffset = (offsetMeters * Math.sin(angle)) / (111320 * Math.cos(baseLat * Math.PI / 180));
  
  return [baseLat + latOffset, baseLng + lngOffset];
}

export const MIN_MARKER_ZOOM = 16; // Minimum zoom level to show post markers (city level zoom)
