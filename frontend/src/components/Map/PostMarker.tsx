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
  
  // Create avatar HTML
  const avatarHtml = hasProfilePhoto 
    ? `<img src="${optimizeCloudinaryUrl(profilePhoto, { width: 50, height: 50, crop: 'thumb', quality: 90 })}" alt="${post.author?.name || 'User'}" class="post-bubble-avatar-img" crossorigin="anonymous" referrerpolicy="no-referrer" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';"><div class="post-bubble-avatar-fallback" style="display:none;">${authorInitial}</div>`
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
          <div style="font-size: 13px; font-weight: 500; color: #333; line-height: 1.4; margin-bottom: 8px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; text-overflow: ellipsis;">${shortText}</div>
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
export function getPostPopupHtml(post: Post): string {
  const authorInitial = post.author?.name.charAt(0).toUpperCase() || '?';
  const profilePhoto = post.author?.profilePhoto;
  const hasProfilePhoto = !!profilePhoto;
  
  // Avatar HTML
  const avatarHtml = hasProfilePhoto
    ? `<img src="${optimizeCloudinaryUrl(profilePhoto, { width: 50, height: 50, crop: 'thumb', quality: 90 })}" style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover;" crossorigin="anonymous" referrerpolicy="no-referrer" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';"><div style="display:none; width: 40px; height: 40px; border-radius: 50%; background: #3b82f6; color: white; display: flex; align-items: center; justify-content: center; font-weight: 600;">${authorInitial}</div>`
    : `<div style="width: 40px; height: 40px; border-radius: 50%; background: #3b82f6; color: white; display: flex; align-items: center; justify-content: center; font-weight: 600;">${authorInitial}</div>`;

  // Use PhotoGallery's HTML generator for consistent grid layout
  const photosHtml = post.photos && post.photos.length > 0 
    ? getPhotoGridHtml(post.photos, 'medium') 
    : '';

  return `
    <div style="font-family: system-ui, -apple-system, sans-serif; padding: 12px; min-width: 250px; max-width: 300px;">
      <div style="font-weight: 600; font-size: 16px; margin-bottom: 8px; color: #111;">${post.title || 'Untitled'}</div>
      <div style="font-size: 14px; color: #333; line-height: 1.4; margin-bottom: 10px; white-space: pre-wrap;">${post.text || ''}</div>
      ${photosHtml}
      <div style="display: flex; align-items: center; gap: 10px; margin-top: 10px; padding-top: 10px; border-top: 1px solid #eee;">
        ${avatarHtml}
        <div>
          <div style="font-weight: 500; font-size: 14px; color: #111;">${post.author?.name || 'Unknown'}</div>
          <div style="font-size: 12px; color: #666;">${post.author?.email || ''}</div>
        </div>
      </div>
      <div style="display: flex; gap: 16px; margin-top: 10px; font-size: 13px; color: #666;">
        <span>❤️ ${post.likes || 0}</span>
        <span>💬 ${post.commentCount || 0}</span>
      </div>
    </div>
  `;
}

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
    iconSize: [200, 44],     // Only the avatar height matters for anchor
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
  // Add data-count attribute to the avatar div for CSS badge
  return baseHtml.replace('class="post-bubble-avatar-new"', `class="post-bubble-avatar-new" data-count="${count}"`);
}

/**
 * Create a Leaflet marker for a post
 * This is the main function to create a post marker on the map
 * @param animate - If true, adds pop-in animation
 */
export function createPostMarker(L: any, post: Post, lat: number, lng: number, animate: boolean = false) {
  const icon = getPostIcon(L, post, animate);
  return L.marker([lat, lng], { icon })
    .bindPopup(getPostPopupHtml(post));
}
