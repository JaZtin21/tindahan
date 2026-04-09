// Map marker HTML generators for Leaflet divIcon
// Extracted from OpenStreetMap.tsx to keep component clean

/**
 * Generate HTML for store marker
 */
export function getStoreMarkerHtml(): string {
  return `
    <div class="store-marker">
      🏪
    </div>
  `;
}

/**
 * Generate HTML for store popup
 */
export function getStorePopupHtml(title: string, lat: number, lng: number): string {
  return `
    <div class="store-popup-title">${title || 'Store Location'}</div>
    <div class="store-popup-coords">
      📍 ${lat.toFixed(4)}, ${lng.toFixed(4)}
    </div>
  `;
}

/**
 * Generate HTML for current location marker
 */
export function getCurrentLocationHtml(): string {
  return `
    <div class="current-location-marker">
      🎯
    </div>
  `;
}

/**
 * Generate CSS styles for map markers
 * Add this to your global CSS or style tag
 */
export function getMapMarkerStyles(): string {
  return `
    /* Post bubble marker styles */
    .post-bubble-container {
      position: relative;
      display: flex;
      flex-direction: row;
      align-items: flex-end;
    }

    .post-bubble-avatar {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 16px;
      font-weight: 600;
      flex-shrink: 0;
      border: 3px solid white;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      margin-right: -10px;
      z-index: 2;
    }

    .post-bubble-content {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      max-width: 180px;
      margin-bottom: 10px;
      margin-left: 0;
    }

    .post-bubble-box {
      background: white;
      border-radius: 12px;
      padding: 8px 12px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.15);
      border: 1px solid #e0e0e0;
      min-width: 120px;
      position: relative;
    }

    .post-bubble-title {
      font-weight: 600;
      font-size: 12px;
      color: #1a1a1a;
      margin-bottom: 4px;
      line-height: 1.3;
    }

    .post-bubble-text {
      font-size: 11px;
      color: #666;
      line-height: 1.3;
    }

    .post-bubble-pointer {
      width: 0;
      height: 0;
      border-left: 6px solid transparent;
      border-right: 6px solid transparent;
      border-top: 6px solid white;
      margin-left: 16px;
      filter: drop-shadow(0 2px 2px rgba(0,0,0,0.1));
    }

    /* New post bubble marker styles (redesigned) */
    .post-bubble-marker {
      background: transparent !important;
      border: none !important;
    }

    .post-bubble-marker > div {
      overflow: visible !important;
    }

    .post-marker-wrapper {
      position: relative;
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      width: 200px;
    }

    .post-bubble-new {
      background: white;
      border-radius: 16px;
      padding: 12px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      border: 1px solid #e0e0e0;
      width: 180px;
      position: relative;
      margin-bottom: 8px;
    }

    .post-bubble-description {
      font-size: 13px;
      color: #333;
      line-height: 1.4;
      margin-bottom: 10px;
      font-weight: 500;
    }

    .post-bubble-photos {
      margin-bottom: 4px;
    }

    .photo-grid {
      display: flex;
      gap: 6px;
      height: 80px;
    }

    .photo-col {
      display: flex;
      flex-direction: column;
      gap: 6px;
      flex: 1;
    }

    .photo-placeholder {
      background: #e0e0e0;
      border-radius: 8px;
      flex: 1;
    }

    .photo-large {
      flex: 1.2;
      min-width: 60px;
    }

    .photo-small {
      flex: 1;
      min-height: 35px;
    }

    .post-bubble-pointer-new {
      width: 0;
      height: 0;
      border-left: 8px solid transparent;
      border-right: 8px solid transparent;
      border-top: 8px solid white;
      margin-left: 16px;
      margin-top: -10px;
      margin-bottom: -6px;
      position: relative;
      z-index: 1;
    }

    .post-bubble-avatar-new {
      width: 44px;
      height: 44px;
      border-radius: 50%;
      background: linear-gradient(135deg, #e57373 0%, #c62828 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 18px;
      font-weight: 600;
      border: 3px solid white;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      flex-shrink: 0;
      margin-top: 7px;
      margin-left: 3px;
      z-index: 2;
    }

    /* Post popup styles */
    .post-popup {
      min-width: 200px;
    }

    .post-popup-title {
      font-weight: 600;
      font-size: 14px;
      color: #1a1a1a;
      margin-bottom: 8px;
    }

    .post-popup-text {
      font-size: 13px;
      color: #444;
      line-height: 1.4;
      margin-bottom: 10px;
    }

    .post-popup-author {
      display: flex;
      align-items: center;
      gap: 8px;
      padding-top: 8px;
      border-top: 1px solid #eee;
    }

    .post-popup-avatar {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 12px;
      font-weight: 600;
    }

    .post-popup-author-info {
      flex: 1;
    }

    .post-popup-author-name {
      font-size: 12px;
      font-weight: 500;
      color: #1a1a1a;
    }

    .post-popup-author-email {
      font-size: 11px;
      color: #888;
    }

    .post-popup-stats {
      display: flex;
      gap: 12px;
      margin-top: 10px;
      font-size: 12px;
      color: #666;
    }

    /* Store marker styles */
    .store-marker {
      background: #4285f4;
      width: 36px;
      height: 36px;
      border-radius: 8px;
      border: 2px solid white;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
    }

    /* Store popup styles */
    .store-popup-title {
      font-weight: 600;
      color: #202124;
      margin-bottom: 4px;
    }

    .store-popup-coords {
      color: #5f6368;
      font-size: 12px;
    }

    /* Current location marker styles */
    .current-location-marker {
      background: #ea4335;
      width: 40px;
      height: 40px;
      min-width: 40px;
      min-height: 40px;
      border-radius: 50%;
      border: 3px solid white;
      box-shadow: 0 2px 12px rgba(234, 67, 53, 0.4);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 20px;
      color: white;
      flex-shrink: 0;
      box-sizing: border-box;
    }

    /* Leaflet container overrides */
    .leaflet-container {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }

    .leaflet-popup-content-wrapper {
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.15);
    }

    .leaflet-popup-content {
      font-size: 14px;
      margin: 12px;
    }

    .leaflet-control-zoom {
      border: none !important;
      box-shadow: 0 2px 8px rgba(0,0,0,0.15) !important;
    }

    .leaflet-control-zoom a {
      background: white !important;
      color: #333 !important;
      border-bottom: 1px solid #ccc !important;
    }

    .leaflet-control-zoom a:last-child {
      border-bottom: none !important;
    }

    .leaflet-control-attribution {
      display: none !important;
    }

    /* Current location popup */
    .current-location-popup-title {
      font-weight: 600;
      color: #202124;
      margin-bottom: 4px;
    }

    .current-location-popup-text {
      color: #5f6368;
      font-size: 12px;
      margin-bottom: 4px;
    }

    .current-location-popup-coords {
      color: #5f6368;
      font-size: 12px;
    }
  `;
}

/**
 * Generate HTML for current location popup
 */
export function getCurrentLocationPopupHtml(lat: number, lng: number, name?: string): string {
  return `
    <div class="current-location-popup-title">🎯 Your Current Location</div>
    <div class="current-location-popup-text">${name || 'Current Location'}</div>
    <div class="current-location-popup-coords">📍 ${lat.toFixed(4)}, ${lng.toFixed(4)}</div>
  `;
}
