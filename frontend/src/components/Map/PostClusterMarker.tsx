interface PostWithLocation {
  lat: number;
  lng: number;
  id: string;
  title: string;
  text: string;
  photos?: string[];
  author: {
    id?: string;
    name: string;
    email?: string;
  };
  likes?: number;
  commentCount?: number;
  createdAt?: string;
  [key: string]: any;
}

interface PostCluster {
  posts: any[];
  centerLat: number;
  centerLng: number;
}

/**
 * Group posts that are very close to each other into clusters
 * Returns clusters and unclustered single posts
 */
export function clusterPostsByProximity(
  posts: PostWithLocation[],
  thresholdMeters: number = 50
): { clusters: PostCluster[]; singles: PostWithLocation[] } {
  if (posts.length <= 1) {
    return { clusters: [], singles: posts };
  }

  const processed = new Set<number>();
  const clusters: PostCluster[] = [];
  const singles: PostWithLocation[] = [];

  const workingPosts = posts.map((p, index) => ({ ...p, _index: index }));

  for (let i = 0; i < workingPosts.length; i++) {
    if (processed.has(i)) continue;

    const currentPost = workingPosts[i];
    const nearbyPosts: typeof workingPosts = [currentPost];

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

      if (distance <= thresholdMeters) {
        nearbyPosts.push(otherPost);
        processed.add(j);
      }
    }

    if (nearbyPosts.length === 1) {
      // Single post, no cluster needed
      singles.push(currentPost);
      processed.add(i);
    } else {
      // Multiple posts - create cluster at center point
      const center = calculateCenter(nearbyPosts);
      clusters.push({
        posts: nearbyPosts,
        centerLat: center.lat,
        centerLng: center.lng
      });
      processed.add(i);
    }
  }

  return { clusters, singles };
}

/**
 * Calculate center point of multiple posts
 */
function calculateCenter(posts: PostWithLocation[]): { lat: number; lng: number } {
  const sumLat = posts.reduce((sum, p) => sum + p.lat, 0);
  const sumLng = posts.reduce((sum, p) => sum + p.lng, 0);
  return {
    lat: sumLat / posts.length,
    lng: sumLng / posts.length
  };
}

/**
 * Calculate distance between two coordinates in meters
 */
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
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
 * Generate HTML for a cluster marker containing multiple posts in a grid
 */
export function getPostClusterHtml(cluster: PostCluster): string {
  const postCards = cluster.posts.map((post: PostWithLocation) => {
    const authorInitial = post.author.name.charAt(0).toUpperCase();
    const shortText = post.text.length > 40 ? post.text.substring(0, 40) + '...' : post.text;

    return `
      <div class="cluster-post-card">
        <div class="cluster-post-header">
          <div class="cluster-post-avatar">${authorInitial}</div>
          <div class="cluster-post-name">${post.author.name}</div>
        </div>
        <div class="cluster-post-text">${shortText}</div>
        <div class="cluster-post-photos">
          <div class="cluster-photo-placeholder"></div>
          <div class="cluster-photo-placeholder"></div>
        </div>
      </div>
    `;
  }).join('');

  return `
    <div class="post-cluster-container">
      <div class="post-cluster-grid">
        ${postCards}
      </div>
    </div>
  `;
}

/**
 * Get Leaflet divIcon configuration for cluster marker
 */
export function getPostClusterIcon(L: any, cluster: PostCluster) {
  // Dynamic width based on number of posts (2 columns)
  const cols = 2;
  const cardWidth = 140;
  const cardGap = 8;
  const padding = 12;
  const totalWidth = Math.min(cluster.posts.length, cols) * (cardWidth + cardGap) + padding * 2;
  const rows = Math.ceil(cluster.posts.length / cols);
  const cardHeight = 120;
  const totalHeight = rows * (cardHeight + cardGap) + padding * 2;

  return L.divIcon({
    html: getPostClusterHtml(cluster),
    iconSize: [totalWidth, totalHeight],
    iconAnchor: [totalWidth / 2, totalHeight / 2],
    popupAnchor: [0, -totalHeight / 2],
    className: 'post-cluster-marker'
  });
}

/**
 * Create a Leaflet marker for a post cluster
 */
export function createPostClusterMarker(L: any, cluster: PostCluster) {
  const icon = getPostClusterIcon(L, cluster);
  return L.marker([cluster.centerLat, cluster.centerLng], { icon });
}
