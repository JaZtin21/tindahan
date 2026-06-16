import type { Post } from '../../types';
import { optimizeCloudinaryUrl } from '../../utils/cloudinary';
import { getPhotoGridHtml } from '../common/PhotoGallery';

// Food type icon mapping using emoji for simplicity and colorful display
const FOOD_TYPE_ICONS: Record<string, string> = {
  'Beverage': '🥤',
  'Snack': '🍿',
  'Sweets': '🍬',
  'Main Dish': '🍽️',
  'Side Dish': '🥗',
  'Dessert': '🍰',
  'Bakery': '🥐',
  'Canned Goods': '🥫',
  'Condiments': '🧂',
  'Dairy': '🥛',
  'Frozen Food': '🧊',
  'Fruits': '🍎',
  'Vegetables': '🥦',
  'Other': '🍴'
};

// Get icon for a food type
export function getFoodTypeIcon(type: string): string {
  return FOOD_TYPE_ICONS[type] || FOOD_TYPE_ICONS['Other'];
}

/**
 * Generate HTML for post bubble marker (the icon shown on map)
 * Uses PhotoGallery's getPhotoGridHtml for consistent grid layout
 */
export function getPostBubbleHtml(post: Post): string {
  const authorInitial = post.author?.name.charAt(0).toUpperCase() || '?';
  const shortText = post.text && post.text.length > 60 ? post.text.substring(0, 60) + '...' : (post.text || '');
  const profilePhoto = post.author?.profilePhoto;
  const hasProfilePhoto = !!profilePhoto;

  const isGoogleProfileImage = (url: string): boolean => {
    return url?.includes('googleusercontent.com') || url?.includes('google.com') || false
  }

  const getSafeProfilePhoto = (): string | null => {
    if (!profilePhoto) return null
    const photo = profilePhoto

    // Google profile images have strict CORS - use as-is but with special img attributes
    // or use a proxy if available
    if (isGoogleProfileImage(photo)) {
      // For now, return the URL but we'll add crossOrigin attribute to img
      // Consider using a backend proxy for Google images in production
      return optimizeCloudinaryUrl(profilePhoto, { width: 50, height: 50, crop: 'thumb', quality: 90 })
    }

    return optimizeCloudinaryUrl(profilePhoto, { width: 50, height: 50, crop: 'thumb', quality: 90 })
  }

  // FIXED DIRECT ASSIGNMENT: Instead of a generic CSS var(), we inject the absolute optimized URL string 
  // directly into the background-image rule. This ensures it displays out of memory instantly on cycles/zooms.
  const optimizedProfileUrl = getSafeProfilePhoto()

  const avatarHtml = hasProfilePhoto
    ? `<div class="post-bubble-avatar-img" style="background-image: url('${optimizedProfileUrl}'); background-size: cover; background-position: center; width: 100%; height: 100%; border-radius: 50%;">
         <div class="post-bubble-avatar-fallback" style="display:none;">${authorInitial}</div>
       </div>`
    : `<div class="post-bubble-avatar-fallback">${authorInitial}</div>`;

  // Use PhotoGallery's HTML generator for consistent grid layout
  const photosHtml = post.photos && post.photos.length > 0
    ? getPhotoGridHtml(post.photos, 'small')
    : '';

  // Generate food type icons HTML
  const foodTypesHtml = post.types && post.types.length > 0
    ? `<div class="food-type-icons">
        ${post.types.slice(0, 2).map((type: string) => `<span class="food-type-icon">${getFoodTypeIcon(type)}</span>`).join('')}
      </div>`
    : '';

  return `
    <div class="post-marker-wrapper">
      <div class="post-bubble-avatar-new">
        ${avatarHtml}
      </div>
      <div class="post-bubble-container">
        ${foodTypesHtml}
        <div class="post-bubble-new">
          <div style="font-size: 13px; font-weight: 700; color: #333; line-height: 1.4; margin-bottom: 6px; display: -webkit-box; -webkit-line-clamp: 1; -webkit-box-orient: vertical; overflow: hidden; text-overflow: ellipsis;">${shortText}</div>
          ${photosHtml}
        </div>
        <div class="post-bubble-pointer-new"></div>
      </div>
    </div>
  `;
}



/**
 * Generate HTML for post popup (shown when clicking the marker)
 * Uses PhotoGallery's getPhotoGridHtml for consistent grid layout
 */


/**
 * Get Leaflet divIcon configuration for post marker
 * @param animate - If true, adds 'animate-in' class for pop animation
 */
export function getPostIcon(L: any, post: Post, animate: boolean = false) {
  const className = animate
    ? 'post-bubble-marker animate-in'
    : 'post-bubble-marker';

  // Avatar is 44px wide, positioned at bottom left with 3px margin
  // Center of avatar = 3 + 22 = 25px from left
  // Center of avatar vertically = 44px / 2 = 22px
  return L.divIcon({
    html: getPostBubbleHtml(post),
    className: className,
    iconSize: [44, 44],     // Only the avatar height matters for anchor
    iconAnchor: [25, 22],    // Center of the 44px avatar circle (x=25, y=22 from bottom)
    popupAnchor: [0, -44]    // Popup above the avatar
  });
}

/**
 * Generate HTML for post group bubble marker with count badge
 * Used when multiple posts are clustered together
 * @param post - The post to display in the cycle
 * @param count - Total number of posts in the group
 */
export function getPostGroupBubbleHtml(post: Post, count: number): string {
  const baseHtml = getPostBubbleHtml(post);
  const profilePhoto = post.author?.profilePhoto || '';

  // Inject the custom badge count and map the dynamic image URL into the style tag
  return baseHtml
    .replace('class="post-bubble-avatar-new"', `class="post-bubble-avatar-new" data-count="${count}"`)
    .replace('class="post-marker-wrapper"', `class="post-marker-wrapper" style="--bg-avatar: url('${profilePhoto}');"`);
}

/**
 * Create a Leaflet marker for a post
 * This is the main function to create a post marker on the map
 * @param animate - If true, adds pop-in animation
 */
