import type { Post } from '../../types';
import { optimizeCloudinaryUrl } from '../../utils/cloudinary';
import { getPhotoGridHtml } from '../common/PhotoGallery';

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

  return `
    <div class="post-marker-wrapper">
      <div class="post-bubble-new">
        <div style="font-size: 13px; color: #333; line-height: 1.4; margin-bottom: 8px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; text-overflow: ellipsis;">${shortText}</div>
        ${photosHtml}
      </div>
      <div class="post-bubble-pointer-new"></div>
      <div class="post-bubble-avatar-new">
        ${avatarHtml}
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
  
  return L.divIcon({
    html: getPostBubbleHtml(post),
    iconSize: [200, 189],
    iconAnchor: [25, 182],
    popupAnchor: [0, -182],
    className: className
  });
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
