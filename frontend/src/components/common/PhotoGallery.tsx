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

interface PhotoGridProps {
  photos: string[];
  size?: 'small' | 'medium' | 'large';
}

/**
 * 🚀 FIXED: Pure React Photo Grid Component using native Tailwind utilities
 * Replaces the old string template function while preserving exact grid heights and counters
 */
export function PhotoGrid({ photos, size = 'medium' }: PhotoGridProps) {
  if (!photos || photos.length === 0) return null;

  const displayCount = Math.min(photos.length, 4);
  const remainingCount = photos.length - 4;
  const displayPhotos = photos.slice(0, displayCount);

  // Size layout specs mapped directly to explicit Tailwind values
  const sizes = {
    small: { height: 'h-[80px]', width: 100, gap: 'gap-[2px]', text: 'text-sm' },
    medium: { height: 'h-[120px]', width: 150, gap: 'gap-1', text: 'text-lg' },
    large: { height: 'h-[300px]', width: 400, gap: 'gap-1', text: 'text-3xl' }
  };
  const cfg = sizes[size];

  const getUrl = (url: string, w: number, h: number) =>
    optimizeCloudinaryUrl(url, { width: w, height: h, crop: 'fill', quality: 'auto' });

  // 1 photo layout pattern
  if (displayCount === 1) {
    return (
      <div className={`photoContainer w-full ${cfg.height} rounded-lg overflow-hidden mb-2`}>
        <div
          className="w-full h-full bg-cover bg-center"
          style={{ backgroundImage: `url('${getUrl(displayPhotos[0], cfg.width * 2, size === 'small' ? 80 : size === 'medium' ? 120 : 300)}')` }}
        />
      </div>
    );
  }

  // 2 photos - side by side 50/50 layout pattern
  if (displayCount === 2) {
    return (
      <div className={`photoContainer grid grid-cols-2 ${cfg.gap} ${cfg.height} mb-2 rounded-lg overflow-hidden`}>
        <div className="w-full h-full bg-cover bg-center" style={{ backgroundImage: `url('${getUrl(displayPhotos[0], cfg.width, size === 'small' ? 80 : size === 'medium' ? 120 : 300)}')` }} />
        <div className="w-full h-full bg-cover bg-center" style={{ backgroundImage: `url('${getUrl(displayPhotos[1], cfg.width, size === 'small' ? 80 : size === 'medium' ? 120 : 300)}')` }} />
      </div>
    );
  }

  // 3 photos - large left, 2 stacked right layout pattern
  if (displayCount === 3) {
    return (
      <div className={`photoContainer grid grid-cols-2 grid-rows-2 ${cfg.gap} ${cfg.height} mb-2 rounded-lg overflow-hidden`}>
        <div
          className="w-full h-full bg-cover bg-center row-span-2"
          style={{ backgroundImage: `url('${getUrl(displayPhotos[0], cfg.width, size === 'small' ? 80 : size === 'medium' ? 120 : 300)}')` }}
        />
        <div className="w-full h-full bg-cover bg-center" style={{ backgroundImage: `url('${getUrl(displayPhotos[1], cfg.width, (size === 'small' ? 80 : size === 'medium' ? 120 : 300) / 2)}')` }} />
        <div className="w-full h-full bg-cover bg-center" style={{ backgroundImage: `url('${getUrl(displayPhotos[2], cfg.width, (size === 'small' ? 80 : size === 'medium' ? 120 : 300) / 2)}')` }} />
      </div>
    );
  }

  // 4+ photos - 2x2 grid with absolute item counter layout pattern
  return (
    <div className={`photoContainer grid grid-cols-2 grid-rows-2 ${cfg.gap} ${cfg.height} mb-2 rounded-lg overflow-hidden`}>
      <div className="w-full h-full bg-cover bg-center" style={{ backgroundImage: `url('${getUrl(displayPhotos[0], cfg.width, (size === 'small' ? 80 : size === 'medium' ? 120 : 300) / 2)}')` }} />
      <div className="w-full h-full bg-cover bg-center" style={{ backgroundImage: `url('${getUrl(displayPhotos[1], cfg.width, (size === 'small' ? 80 : size === 'medium' ? 120 : 300) / 2)}')` }} />
      <div className="w-full h-full bg-cover bg-center" style={{ backgroundImage: `url('${getUrl(displayPhotos[2], cfg.width, (size === 'small' ? 80 : size === 'medium' ? 120 : 300) / 2)}')` }} />
      <div className="relative w-full h-full">
        <div className="w-full h-full bg-cover bg-center" style={{ backgroundImage: `url('${getUrl(displayPhotos[3], cfg.width, (size === 'small' ? 80 : size === 'medium' ? 120 : 300) / 2)}')` }} />
        {remainingCount > 0 && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white font-bold tracking-wide">
            <span className={cfg.text}>+{remainingCount}</span>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Facebook-style photo gallery with grid layout
 * Supports 1-10+ photos with different grid patterns
 * Click to open lightbox viewer
 * (Kept 100% untouched so your standard web UI galleries do not alter layout)
 */
export function PhotoGallery({ photos, className = '', maxDisplay = 6, size = 'large' }: PhotoGalleryProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  if (!photos || photos.length === 0) return null;

  const slides = photos.map(url => ({
    src: optimizeCloudinaryUrl(url, { width: 1920, quality: 'auto:best' }),
    download: url,
  }));

  const getGridClasses = (count: number, index: number) => {
    switch (count) {
      case 1: return 'col-span-full';
      case 2: return 'h-full';
      case 3:
        if (index === 0) return 'row-span-2 h-full';
        return 'h-full';
      case 4: return 'h-full';
      case 5:
        if (index < 2) return 'h-full';
        return 'h-full';
      default:
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
      <div className={`grid gap-1 rounded-xl overflow-hidden ${photos.length === 1 ? `grid-cols-1 ${size === 'large' ? 'h-72 lg:h-96' : size === 'medium' ? 'h-48 lg:h-64' : 'h-40'}` :
        photos.length === 2 ? `grid-cols-2 ${size === 'large' ? 'h-72 lg:h-96' : size === 'medium' ? 'h-48 lg:h-64' : 'h-40'}` :
          photos.length === 3 ? `grid-cols-2 grid-rows-2 ${size === 'large' ? 'h-72 lg:h-96' : size === 'medium' ? 'h-48 lg:h-64' : 'h-40'}` :
            photos.length === 4 ? `grid-cols-2 grid-rows-2 ${size === 'large' ? 'h-72 lg:h-96' : size === 'medium' ? 'h-48 lg:h-64' : 'h-40'}` :
              `grid-cols-2 grid-rows-2 ${size === 'large' ? 'h-72 lg:h-96' : size === 'medium' ? 'h-48 lg:h-64' : 'h-40'}`
        }`}>
        {photos.slice(0, Math.min(maxDisplay, 4)).map((photo, index) => {
          const isLastVisible = index === 3 && photos.length > 4;
          const remainingCount = photos.length - 4;
          const thumbWidth = photos.length === 1 ? 1200 : photos.length <= 2 ? 800 : photos.length <= 4 ? 600 : 400;

          return (
            <div
              key={index}
              className={`relative cursor-pointer overflow-hidden group ${getGridClasses(Math.min(photos.length, 6), index)}`}
              onClick={() => handlePhotoClick(index)}
            >
              <img
                src={optimizeCloudinaryUrl(photo, { width: thumbWidth, crop: 'fill', quality: 'auto:best' })}
                alt={`Photo ${index + 1}`}
                className="w-full h-full object-cover"
                loading={index > 2 ? 'lazy' : 'eager'}
              />
              {isLastVisible && remainingCount > 0 && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                  <span className="text-white text-3xl font-bold">+{remainingCount}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
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

      />
    </div>
  );
}
