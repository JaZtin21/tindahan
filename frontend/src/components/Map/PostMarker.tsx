import type { Post } from '../../types';

/**
 * Generate HTML for post bubble marker (the icon shown on map)
 * New design: Bubble with description + photos, avatar at bottom right
 */
export function getPostBubbleHtml(post: Post): string {
  const authorInitial = post.author?.name.charAt(0).toUpperCase() || '?';
  const shortText = post.text && post.text.length > 60 ? post.text.substring(0, 60) + '...' : (post.text || '');
  const profilePhoto = post.author?.profilePhoto;
  const hasProfilePhoto = !!profilePhoto;
  
  // Create avatar HTML - either image or initials
  const avatarHtml = hasProfilePhoto 
    ? `<img src="${profilePhoto}" alt="${post.author?.name || 'User'}" class="post-bubble-avatar-img" crossorigin="anonymous" referrerpolicy="no-referrer" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';"><div class="post-bubble-avatar-fallback" style="display:none;">${authorInitial}</div>`
    : `<div class="post-bubble-avatar-fallback">${authorInitial}</div>`;

  return `
    <div class="post-marker-wrapper">
      <!-- Conversation Bubble -->
      <div class="post-bubble-new">
        <!-- Description text at top -->
        <div class="post-bubble-description">${shortText}</div>
        <!-- Photo placeholders grid -->
        <div class="post-bubble-photos">
          <div class="photo-grid">
            <div class="photo-placeholder photo-large"></div>
            <div class="photo-col">
              <div class="photo-placeholder photo-small"></div>
              <div class="photo-placeholder photo-small"></div>
            </div>
          </div>
        </div>
      </div>
      <!-- Triangle pointer -->
      <div class="post-bubble-pointer-new"></div>
      <!-- Profile Avatar (bottom left) -->
      <div class="post-bubble-avatar-new">
        ${avatarHtml}
      </div>
    </div>
  `;
}

/**
 * Generate HTML for post popup (shown when clicking the marker)
 * Edit this to change the popup content
 */
export function getPostPopupHtml(post: Post): string {
  const authorInitial = post.author?.name.charAt(0).toUpperCase() || '?';
  const profilePhoto = post.author?.profilePhoto;
  const hasProfilePhoto = !!profilePhoto;
  
  // Avatar HTML for popup - either image or initials
  const avatarHtml = hasProfilePhoto
    ? `<img src="${profilePhoto}" class="post-popup-avatar-img" crossorigin="anonymous" referrerpolicy="no-referrer" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';"><div class="post-popup-avatar-fallback" style="display:none;">${authorInitial}</div>`
    : `<div class="post-popup-avatar-fallback">${authorInitial}</div>`;

  return `
    <div class="post-popup">
      <div class="post-popup-title">${post.title || 'Untitled'}</div>
      <div class="post-popup-text">${post.text || ''}</div>
      <div class="post-popup-author">
        <div class="post-popup-avatar-container">
          ${avatarHtml}
        </div>
        <div class="post-popup-author-info">
          <div class="post-popup-author-name">${post.author?.name || 'Unknown'}</div>
          <div class="post-popup-author-email">${post.author?.email || ''}</div>
        </div>
      </div>
      <div class="post-popup-stats">
        <span>❤️ ${post.likes || 0} likes</span>
        <span>💬 ${post.commentCount || 0} comments</span>
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
