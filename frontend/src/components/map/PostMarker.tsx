import React, { useState, useRef, useEffect } from 'react';
import type { Post } from '../../types/post';
import { optimizeCloudinaryUrl } from '../../utils/cloudinary';
import { PhotoGrid } from '../common/PhotoGallery';

const FOOD_TYPE_ICONS: Record<string, string> = {
  'Beverage': '🥤', 'Snack': '🍿', 'Sweets': '🍬', 'Main Dish': '🍽️',
  'Side Dish': '🥗', 'Dessert': '🍰', 'Bakery': '🥐', 'Canned Goods': '🥫',
  'Condiments': '🧂', 'Dairy': '🥛', 'Frozen Food': '🧊', 'Fruits': '🍎',
  'Vegetables': '🥦', 'Other': '🍴'
};

export function getFoodTypeIcon(type: string): string {
  return FOOD_TYPE_ICONS[type] || FOOD_TYPE_ICONS['Other'];
}

interface PostMarkerDesignProps {
  post: Post;
  onClick?: (e: React.MouseEvent) => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  qualityValue: number;
  groupCount?: number;
  profilePhotoOverride?: string;
  scaleValue?: number; // 🚀 Accepts continuous scale timeline adjustments from the group cycle
  opacityValue?: number; // 🚀 Added: Accepts continuous opacity timeline adjustments from the group cycle
}

export function PostMarkerDesign({
  post,
  onClick,
  onMouseEnter,
  onMouseLeave,
  qualityValue,
  groupCount,
  profilePhotoOverride,
  scaleValue = 1,
  opacityValue = 1 // 🚀 Added: Defaults to 1 so the single PostMapMarker doesn't fade unexpectedly
}: PostMarkerDesignProps) {
  const [isHoveredLocal, setIsHoveredLocal] = useState(false);
  // 🚀 REF BLOCK UNLOCKS LAYOUT OVERRIDES: Attaches a straight DOM track to reach the wrapper element
  const markerRef = useRef<HTMLDivElement>(null);

  // 🚀 FORCE MAPLIBRE ROOT Z-INDEX MANUALLY ON HOVER:
  useEffect(() => {
    if (!markerRef.current) return;

    // Traverses upward into MapLibre's generated container layer wrapper tag (.maplibregl-marker)
    const maplibreWrapper = markerRef.current.parentElement;
    if (maplibreWrapper) {
      if (isHoveredLocal) {
        // Force the absolute maximum stacking height over the entire map tile grid
        maplibreWrapper.style.zIndex = '10';
      } else {
        // Cleanly restore to your base sorting score calculation formula when the mouse exits
        maplibreWrapper.style.zIndex = String(qualityValue);
      }
    }
  }, [isHoveredLocal, qualityValue]);

  const authorInitial = post.author?.name ? post.author.name.charAt(0).toUpperCase() : '?';
  const shortText = post.text && post.text.length > 60 ? post.text.substring(0, 60) + '...' : (post.text || '');

  const profilePhoto = profilePhotoOverride || post.author?.profilePhoto;
  const optimizedProfileUrl = profilePhoto
    ? optimizeCloudinaryUrl(profilePhoto, { width: 50, height: 50, crop: 'thumb', quality: 90 })
    : null;

  const displayPhotos = post.photos || [];

  // 🚀 HARDCODED SCALE & OPACITY COMBINATOR: Merges group cycling states with your local hover events fluidly
  const currentScale = isHoveredLocal ? 1.08 : scaleValue;
  const currentOpacity = isHoveredLocal ? 1 : opacityValue;

  const hardcodedMarkerStyle = {
    transform: `scale(${currentScale})`,
    opacity: currentOpacity, // 🚀 Binds your fade layer cleanly into the element styles
    // Injects opacity directly into the smooth timing properties [INDEX]
    transition: isHoveredLocal
      ? 'transform 0.35s ease-out, opacity 0.15s ease-out'
      : 'transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.15s ease-in-out',

    WebkitFontSmoothing: 'antialiased',
    MozOsxFontSmoothing: 'grayscale',

    // 🚀 KEEP IT IN 2D BOUNDS: Setting transform-origin at the pointer tip stabilizes the scale anchors
    transformOrigin: 'bottom center',
  } as React.CSSProperties;

  return (
    <div
      ref={markerRef}
      onMouseEnter={() => {
        setIsHoveredLocal(true);
        onMouseEnter?.();
      }}
      onMouseLeave={() => {
        setIsHoveredLocal(false);
        onMouseLeave?.();
      }}
      style={hardcodedMarkerStyle}
      className="transition-all duration-200 ease-in-out hover:drop-shadow-[0_8px_20px_rgba(0,0,0,0.25)] [&:hover~div]:opacity-30"
    >
      <div
        onClick={onClick}
        style={{ '--bg-avatar': profilePhoto ? `url('${profilePhoto}')` : 'none' } as React.CSSProperties}
        className="relative flex flex-col items-start w-[44px] h-auto cursor-pointer group"
      >
        {/* 1. Base Author Profile Avatar Anchor */}
        <div
          className="relative z-10 ml-[3px] mt-0 h-[44px] w-[44px] max-md:h-[35px] max-md:w-[35px] rounded-full border-2 border-[#efb666] bg-[#f0c388] flex items-center justify-center overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.3)] transition-all duration-200 group-hover:opacity-90 group-hover:scale-110 group-hover:shadow-[0_4px_12px_rgba(0,0,0,0.4)]"
          data-count={groupCount}
        >
          {optimizedProfileUrl ? (
            <div
              className="w-full h-full bg-cover bg-center rounded-full"
              style={{ backgroundImage: `url('${optimizedProfileUrl}')` }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-white text-lg max-md:text-sm font-semibold">
              {authorInitial}
            </div>
          )}
        </div>

        {/* 2. Speech Bubble Overlay Layout Container */}
        <div className="absolute bottom-[46px] left-0 z-10 flex flex-col items-start w-[180px] max-md:w-[138px] max-md:bottom-[38px] max-md:left-[-4px]">
          {post.types && post.types.length > 0 && (
            <div className="absolute bottom-3 right-1.5 flex gap-0.5 z-20 bg-white rounded-[12px] px-1 py-1">
              {post.types.slice(0, 2).map((type: string, i: number) => (
                <span key={i} className="text-[17px] max-md:text-[12px] flex items-center justify-center leading-none">
                  {getFoodTypeIcon(type)}
                </span>
              ))}
            </div>
          )}

          <div className="w-[180px] max-w-[180px] p-2.5 max-md:w-[138px] max-md:max-w-[138px] bg-[#fffffff1] rounded-2xl border border-[#efb666] shadow-[0_3px_2px_rgba(0,0,0,0.15)] relative mb-0">
            <div className="font-normal md:font-semibold text-[#333] leading-[1.4] text-xs md:text-md mt-0.5 line-clamp-1">
              {shortText}
            </div>

            {displayPhotos.length > 0 && (
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  onClick?.(e);
                }}
                className="w-full mt-1 overflow-hidden h-auto max-md:h-[60px] mb-1 md:mb-0 rounded-lg photoContainer"
              >
                {/* 🚀 PROPER FIXED PROPERTY PROPAGATION: Restores photos={displayPhotos} */}
                <PhotoGrid photos={displayPhotos} size="small" />
              </div>
            )}
          </div>

          <div className="w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[8px] border-t-[#efb666] ml-[17px] -mt-[1px] relative -z-10 " />
        </div>
      </div>
    </div>
  );
}
