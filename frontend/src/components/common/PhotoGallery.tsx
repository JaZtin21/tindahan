import { useState } from 'react';
import Lightbox from 'yet-another-react-lightbox';
import Zoom from 'yet-another-react-lightbox/plugins/zoom';
import 'yet-another-react-lightbox/styles.css';
import { optimizeCloudinaryUrl } from '../../utils/cloudinary';

interface PhotoGalleryProps {
  photos: string[];
  className?: string;
  maxDisplay?: number;
  size?: 'small' | 'medium' | 'large';
}

/**
 * Generate HTML string for photo grid (for Leaflet markers/popups)
 * Returns the same grid layout as PhotoGallery component
 */
export function getPhotoGridHtml(photos: string[], size: 'small' | 'medium' | 'large' = 'medium'): string {
  if (!photos || photos.length === 0) return '';
  
  const displayCount = Math.min(photos.length, 4);
  const remainingCount = photos.length - 4;
  const displayPhotos = photos.slice(0, displayCount);
  
  // Size configurations
  const sizes = {
    small: { height: 80, width: 100, gap: 2 },
    medium: { height: 120, width: 150, gap: 4 },
    large: { height: 300, width: 400, gap: 4 }
  };
  const cfg = sizes[size];
  
  // Generate optimized URLs
  const getUrl = (url: string, w: number, h: number) => 
    optimizeCloudinaryUrl(url, { width: w, height: h, crop: 'fill', quality: 'auto' });
  
  // 1 photo
  if (displayCount === 1) {
    return `<div style="width: 100%; height: ${cfg.height}px; border-radius: 8px; overflow: hidden; margin-bottom: 8px;">
      <img src="${getUrl(displayPhotos[0], cfg.width * 2, cfg.height)}" style="width: 100%; height: 100%; object-fit: cover;" crossorigin="anonymous" referrerpolicy="no-referrer" />
    </div>`;
  }
  
  // 2 photos - side by side 50/50
  if (displayCount === 2) {
    return `<div style="display: grid; grid-template-columns: 1fr 1fr; gap: ${cfg.gap}px; height: ${cfg.height}px; margin-bottom: 8px; border-radius: 8px; overflow: hidden;">
      <img src="${getUrl(displayPhotos[0], cfg.width, cfg.height)}" style="width: 100%; height: 100%; object-fit: cover;" crossorigin="anonymous" referrerpolicy="no-referrer" />
      <img src="${getUrl(displayPhotos[1], cfg.width, cfg.height)}" style="width: 100%; height: 100%; object-fit: cover;" crossorigin="anonymous" referrerpolicy="no-referrer" />
    </div>`;
  }
  
  // 3 photos - large left, 2 stacked right
  if (displayCount === 3) {
    return `<div style="display: grid; grid-template-columns: 1fr 1fr; grid-template-rows: 1fr 1fr; gap: ${cfg.gap}px; height: ${cfg.height}px; margin-bottom: 8px; border-radius: 8px; overflow: hidden;">
      <img src="${getUrl(displayPhotos[0], cfg.width, cfg.height)}" style="width: 100%; height: 100%; object-fit: cover; grid-row: 1 / 3;" crossorigin="anonymous" referrerpolicy="no-referrer" />
      <img src="${getUrl(displayPhotos[1], cfg.width, cfg.height / 2)}" style="width: 100%; height: 100%; object-fit: cover;" crossorigin="anonymous" referrerpolicy="no-referrer" />
      <img src="${getUrl(displayPhotos[2], cfg.width, cfg.height / 2)}" style="width: 100%; height: 100%; object-fit: cover;" crossorigin="anonymous" referrerpolicy="no-referrer" />
    </div>`;
  }
  
  // 4+ photos - 2x2 grid with overlay
  return `<div style="display: grid; grid-template-columns: 1fr 1fr; grid-template-rows: 1fr 1fr; gap: ${cfg.gap}px; height: ${cfg.height}px; margin-bottom: 8px; border-radius: 8px; overflow: hidden;">
    <img src="${getUrl(displayPhotos[0], cfg.width, cfg.height / 2)}" style="width: 100%; height: 100%; object-fit: cover;" crossorigin="anonymous" referrerpolicy="no-referrer" />
    <img src="${getUrl(displayPhotos[1], cfg.width, cfg.height / 2)}" style="width: 100%; height: 100%; object-fit: cover;" crossorigin="anonymous" referrerpolicy="no-referrer" />
    <img src="${getUrl(displayPhotos[2], cfg.width, cfg.height / 2)}" style="width: 100%; height: 100%; object-fit: cover;" crossorigin="anonymous" referrerpolicy="no-referrer" />
    <div style="position: relative; width: 100%; height: 100%;">
      <img src="${getUrl(displayPhotos[3], cfg.width, cfg.height / 2)}" style="width: 100%; height: 100%; object-fit: cover;" crossorigin="anonymous" referrerpolicy="no-referrer" />
      ${remainingCount > 0 ? `<div style="position: absolute; inset: 0; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: ${size === 'small' ? '14px' : '18px'};">+${remainingCount}</div>` : ''}
    </div>
  </div>`;
}

/**
 * Facebook-style photo gallery with grid layout
 * Supports 1-10+ photos with different grid patterns
 * Click to open lightbox viewer
 */
export function PhotoGallery({ photos, className = '', maxDisplay = 6, size = 'large' }: PhotoGalleryProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  if (!photos || photos.length === 0) return null;

  // Prepare slides for lightbox with full quality (1920px for full HD display)
  const slides = photos.map(url => ({
    src: optimizeCloudinaryUrl(url, { width: 1920, quality: 'auto:best' }),
    download: url,
  }));

  // Get grid layout based on photo count
  const getGridClasses = (count: number, index: number) => {
    switch (count) {
      case 1:
        return 'col-span-full';
      case 2:
        return 'h-full';
      case 3:
        // Large left (spans 2 rows), 2 stacked right
        if (index === 0) return 'row-span-2 h-full';
        return 'h-full';
      case 4:
        return 'h-full';
      case 5:
        if (index < 2) return 'h-full';
        return 'h-full';
      default: // 6+
        if (index < 2) return 'h-full';
        if (index === 5) return 'h-full relative';
        return 'h-full';
    }
  };

  const handlePhotoClick = (index: number) => {
    setCurrentIndex(index);
    setIsOpen(true);
  };

  return (
    <div className={className}>
      <div className={`grid gap-1 rounded-xl overflow-hidden ${
        photos.length === 1 ? `grid-cols-1 ${size === 'large' ? 'h-72' : size === 'medium' ? 'h-48' : 'h-20'}` :
        photos.length === 2 ? `grid-cols-2 ${size === 'large' ? 'h-72' : size === 'medium' ? 'h-48' : 'h-20'}` :
        photos.length === 3 ? `grid-cols-2 grid-rows-2 ${size === 'large' ? 'h-72' : size === 'medium' ? 'h-48' : 'h-20'}` :
        photos.length === 4 ? `grid-cols-2 grid-rows-2 ${size === 'large' ? 'h-72' : size === 'medium' ? 'h-48' : 'h-20'}` :
        `grid-cols-3 grid-rows-2 ${size === 'large' ? 'h-72' : size === 'medium' ? 'h-48' : 'h-20'}`
      }`}>
        {photos.slice(0, Math.min(maxDisplay, 4)).map((photo, index) => {
          const isLastVisible = index === 3 && photos.length > 4;
          const remainingCount = photos.length - 4;

          // Optimize thumbnail size based on grid position
          const thumbWidth = photos.length === 1 ? 800 : 
                            photos.length <= 2 ? 600 : 
                            photos.length <= 4 ? 400 : 300;

          return (
            <div
              key={index}
              className={`relative cursor-pointer overflow-hidden group ${getGridClasses(Math.min(photos.length, 6), index)}`}
              onClick={() => handlePhotoClick(index)}
            >
              <img
                src={optimizeCloudinaryUrl(photo, {
                  width: thumbWidth,
                  crop: 'fill',
                  quality: 'auto:eco'
                })}
                alt={`Photo ${index + 1}`}
                className="w-full h-full object-cover"
                loading={index > 2 ? 'lazy' : 'eager'}
              />
              
              {/* Overlay for +X more */}
              {isLastVisible && remainingCount > 0 && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                  <span className="text-white text-3xl font-bold">+{remainingCount}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Lightbox */}
      <Lightbox
        open={isOpen}
        close={() => setIsOpen(false)}
        slides={slides}
        index={currentIndex}
        on={{ view: ({ index }) => setCurrentIndex(index) }}
        plugins={[Zoom]}
        zoom={{
          maxZoomPixelRatio: 3,
          zoomInMultiplier: 2,
        }}
        carousel={{
          finite: photos.length <= 1,
          preload: 2,
        }}
        animation={{
          fade: 300,
          swipe: 300,
        }}
        styles={{
          container: { backgroundColor: 'rgba(0, 0, 0, 0.95)' },
        }}
      />
    </div>
  );
}
