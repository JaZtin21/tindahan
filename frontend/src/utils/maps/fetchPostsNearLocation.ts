import { ApolloClient, gql } from '@apollo/client';

interface PostLocation {
  lat: number;
  lng: number;
  name: string;
}

interface PostAuthor {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
}

interface Post {
  id: string;
  title: string;
  text: string;
  photos: string[];
  types: string[];
  author: PostAuthor;
  location?: PostLocation;
  likes: number;
  isLiked: boolean;
  commentCount: number;
  createdAt: string;
  updatedAt?: string;
}

interface FetchPostsResult {
  success: boolean;
  message: string;
  data: Post[];
  total: number;
  page: number;
  limit: number;
}

/**
 * Fetches posts near a specific location from the GraphQL API.
 * 
 * @param client - Apollo Client instance
 * @param lat - Latitude of the center point
 * @param lng - Longitude of the center point
 * @param radius - Search radius in meters (default: 5000 = 5km)
 * @param page - Page number for pagination (default: 1)
 * @param limit - Number of posts per page (default: 50)
 * @returns Promise with posts data or null on error
 * 
 * @example
 * const posts = await fetchPostsNearLocation(apolloClient, 14.5995, 120.9842, 5000);
 * if (posts) {
 *   console.log(`Found ${posts.total} posts`);
 *   posts.data.forEach(post => console.log(post.title));
 * }
 */
export async function fetchPostsNearLocation(
  client: ApolloClient,
  lat: number,
  lng: number,
  radius: number = 5000,
  page: number = 1,
  limit: number = 50
): Promise<FetchPostsResult | null> {
  const POSTS_NEAR_LOCATION_QUERY = gql`
    query PostsNearLocation($lat: Float!, $lng: Float!, $radius: Float, $page: Int, $limit: Int) {
      postsNearLocation(lat: $lat, lng: $lng, radius: $radius, page: $page, limit: $limit) {
        success
        message
        data {
          id
          title
          text
          photos
          types
          author {
            id
            name
            email
            role
            isActive
          }
          location {
            lat
            lng
            name
          }
          likes
          isLiked
          commentCount
          createdAt
          updatedAt
        }
        total
        page
        limit
      }
    }
  `;

  try {
    const result = await client.query({
      query: POSTS_NEAR_LOCATION_QUERY,
      variables: { lat, lng, radius, page, limit },
      fetchPolicy: 'network-only',
    });

    const data = result.data as { postsNearLocation?: FetchPostsResult } | undefined;

    if (data?.postsNearLocation?.success) {
      return data.postsNearLocation;
    }

    console.warn('Failed to fetch posts:', data?.postsNearLocation?.message);
    return null;
  } catch (error) {
    console.error('Error fetching posts near location:', error);
    return null;
  }
}

/**
 * Calculates the radius in meters based on the map zoom level.
 * Higher zoom (closer view) = smaller radius
 * Lower zoom (wider view) = larger radius
 * 
 * @param zoom - Current map zoom level
 * @returns Radius in meters
 */
export function calculateRadiusFromZoom(zoom: number): number {
  // Approximate conversion from zoom to visible radius
  // These values are rough estimates based on typical map scales
  const zoomToRadius: Record<number, number> = {
    1: 10000000,   // ~10,000 km (world view)
    2: 5000000,    // ~5,000 km
    3: 2500000,    // ~2,500 km
    4: 1250000,    // ~1,250 km
    5: 600000,     // ~600 km
    6: 300000,     // ~300 km
    7: 150000,     // ~150 km
    8: 80000,      // ~80 km
    9: 40000,      // ~40 km
    10: 20000,     // ~20 km
    11: 10000,     // ~10 km
    12: 5000,      // ~5 km
    13: 2500,      // ~2.5 km
    14: 1500,      // ~1.5 km (default)
    15: 800,       // ~800 m
    16: 400,       // ~400 m
    17: 200,       // ~200 m
    18: 100,       // ~100 m
    19: 50,        // ~50 m
    20: 25,        // ~25 m
  };

  // Clamp zoom to available range
  const clampedZoom = Math.max(1, Math.min(20, Math.round(zoom)));
  return zoomToRadius[clampedZoom] || 5000; // Default to 5km
}

export type { Post, PostLocation, PostAuthor, FetchPostsResult };
