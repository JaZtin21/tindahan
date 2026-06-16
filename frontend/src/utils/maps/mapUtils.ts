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


export function clusterPosts(posts: any[], thresholdMeters: number): PostOrGroup[] {
  const validPosts = posts.filter(
    p => p.id && p.location && p.location.lat != null && p.location.lng != null
  );

  if (validPosts.length === 0) return [];

  const used = new Set<string>();
  const centers: { lat: number; lng: number }[] = [];

  // STAGE 1: Establish all cluster center points
  for (const post of validPosts) {
    if (used.has(post.id)) continue;

    const currentCluster: any[] = [post];
    used.add(post.id);

    let centerLat = post.location.lat;
    let centerLng = post.location.lng;

    let expanded: boolean;
    do {
      expanded = false;
      for (const other of validPosts) {
        if (used.has(other.id)) continue;

        const distance = getDistanceInMeters(
          centerLat, centerLng,
          other.location.lat, other.location.lng
        );

        if (distance <= thresholdMeters) {
          currentCluster.push(other);
          used.add(other.id);
          expanded = true;

          // In-place center updates
          let sumLat = 0, sumLng = 0;
          for (const p of currentCluster) {
            sumLat += p.location.lat;
            sumLng += p.location.lng;
          }
          centerLat = sumLat / currentCluster.length;
          centerLng = sumLng / currentCluster.length;
        }
      }
    } while (expanded);

    // Save this finalized center position
    centers.push({ lat: centerLat, lng: centerLng });
  }

  // STAGE 2: Assign EVERY post to its absolute closest center
  // This guarantees no post is dropped or left out
  const groupsArray: any[][] = centers.map(() => []);

  for (const post of validPosts) {
    let closestCenterIdx = 0;
    let minDistance = Infinity;

    for (let i = 0; i < centers.length; i++) {
      const dist = getDistanceInMeters(
        centers[i].lat, centers[i].lng,
        post.location.lat, post.location.lng
      );

      if (dist < minDistance) {
        minDistance = dist;
        closestCenterIdx = i;
      }
    }

    // Force assign the post to the best center found
    groupsArray[closestCenterIdx].push(post);
  }

  // STAGE 3: Format the final output structure
  const result: PostOrGroup[] = [];
  for (const groupPosts of groupsArray) {
    if (groupPosts.length === 0) continue;

    if (groupPosts.length === 1) {
      // If your original types expect a single object, pass the first item
      result.push({ type: 'single', post: groupPosts[0] });
    } else {
      result.push({ type: 'group', group: { posts: groupPosts } });
    }
  }

  return result;
}




