/**
 * Cloudinary URL optimization utilities
 */

export interface CloudinaryOptions {
  width?: number;
  height?: number;
  quality?: 'auto' | 'auto:low' | 'auto:eco' | 'auto:best' | number;
  crop?: 'fit' | 'fill' | 'scale' | 'thumb';
  format?: 'auto' | 'webp' | 'jpg' | 'png';
  dpr?: 'auto' | number;
}

/**
 * Transforms a Cloudinary URL with optimization parameters
 * 
 * @param url - Original Cloudinary URL
 * @param options - Transformation options
 * @returns Optimized URL
 * 
 * @example
 * optimizeCloudinaryUrl(
 *   'https://res.cloudinary.com/demo/image/upload/v123/photo.jpg',
 *   { width: 800, quality: 'auto', crop: 'fit' }
 * )
 * // Returns: https://res.cloudinary.com/demo/image/upload/q_auto,w_800,c_fit/v123/photo.jpg
 */
export function optimizeCloudinaryUrl(url: string, options: CloudinaryOptions = {}): string {
  if (!url || !url.includes('cloudinary.com')) {
    return url;
  }

  const transformations: string[] = [];

  if (options.quality) {
    transformations.push(`q_${options.quality}`);
  }

  if (options.width) {
    transformations.push(`w_${options.width}`);
  }

  if (options.height) {
    transformations.push(`h_${options.height}`);
  }

  if (options.crop) {
    transformations.push(`c_${options.crop}`);
  }

  if (options.format) {
    transformations.push(`f_${options.format}`);
  }

  if (options.dpr) {
    transformations.push(`dpr_${options.dpr}`);
  }

  if (transformations.length === 0) {
    return url;
  }

  // Insert transformations after /upload/ and before version/public_id
  const uploadIndex = url.indexOf('/upload/');
  if (uploadIndex === -1) {
    return url;
  }

  const transformStr = transformations.join(',');
  const insertIndex = uploadIndex + '/upload/'.length;

  return url.slice(0, insertIndex) + transformStr + '/' + url.slice(insertIndex);
}

/**
 * Common optimization presets
 */
export const presets = {
  /** Small thumbnail - good for lists */
  thumbnail: (url: string) => optimizeCloudinaryUrl(url, {
    width: 150,
    height: 150,
    crop: 'thumb',
    quality: 'auto:low',
    format: 'auto'
  }),

  /** Medium preview - good for cards */
  preview: (url: string) => optimizeCloudinaryUrl(url, {
    width: 400,
    crop: 'fit',
    quality: 'auto',
    format: 'auto'
  }),

  /** Large display - good for detail view */
  display: (url: string) => optimizeCloudinaryUrl(url, {
    width: 800,
    crop: 'fit',
    quality: 'auto',
    format: 'auto'
  }),

  /** Full quality - when you need original */
  full: (url: string) => url
};
