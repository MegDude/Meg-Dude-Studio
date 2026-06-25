export interface ExtractedInteriorImage {
  id: string;
  localPath: string;
}

export const EXTRACTED_IMAGE_MANIFEST: Record<string, ExtractedInteriorImage> = {};

/**
 * Gets the best image URL for a product, prioritizing local manifest paths.
 * 
 * Order of priority:
 * 1. Local image from EXTRACTED_IMAGE_MANIFEST (if match exists based on product ID)
 * 2. Remote URL from database/data (the passed in originalUrl)
 * 3. In-app placeholder
 */
export function getOptimizedImageUrl(productId: string, originalUrl?: string): string {
  const manifestEntry = EXTRACTED_IMAGE_MANIFEST[productId];
  if (manifestEntry && manifestEntry.localPath) {
    return manifestEntry.localPath;
  }
  
  // If the URL is valid for the browser, use it. Restored workspace objects
  // commonly use data URLs, while in-session uploads use blob URLs.
  if (
    originalUrl &&
    (originalUrl.startsWith('http') ||
      originalUrl.startsWith('blob:') ||
      originalUrl.startsWith('data:image/'))
  ) {
    return originalUrl;
  }
  
  // If original URL is already a local path, use it
  if (originalUrl && originalUrl.startsWith('/')) {
      return originalUrl;
  }

  return 'placeholder';
}
