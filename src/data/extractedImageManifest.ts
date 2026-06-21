export interface ExtractedInteriorImage {
  id: string;
  localPath: string; // The path within /public/images/interior-inventory/
}

// Pre-defined map of available local inventory images
export const EXTRACTED_IMAGE_MANIFEST: Record<string, ExtractedInteriorImage> = {
  "lo-luna-nightstand": {
    id: "lo-luna-nightstand",
    localPath: "/images/interior-inventory/lo-luna-nightstand-01.jpg"
  },
  "lo-marble-salt-pepper": {
    id: "lo-marble-salt-pepper",
    localPath: "/images/interior-inventory/lo-marble-salt-pepper-01.jpg"
  },
  "lo-willow-dresser": {
    id: "lo-willow-dresser",
    localPath: "/images/interior-inventory/lo-willow-dresser-01.jpg"
  },
  "supply-acacia-blue": {
    id: "supply-acacia-blue",
    localPath: "/images/interior-inventory/supply-acacia-blue-01.jpg"
  },
  "supply-acacia-stone-blue": {
    id: "supply-acacia-stone-blue",
    localPath: "/images/interior-inventory/supply-acacia-stone-blue-01.jpg"
  },
  "supply-pelargonium-garnet": {
    id: "supply-pelargonium-garnet",
    localPath: "/images/interior-inventory/supply-pelargonium-garnet-01.jpg"
  },
  "supply-pelargonium-lapis": {
    id: "supply-pelargonium-lapis",
    localPath: "/images/interior-inventory/supply-pelargonium-lapis-01.jpg"
  },
  "supply-pelargonium-malachite": {
    id: "supply-pelargonium-malachite",
    localPath: "/images/interior-inventory/supply-pelargonium-malachite-01.jpg"
  },
  "th-brass-coffee-spoon": {
    id: "th-brass-coffee-spoon",
    localPath: "/images/interior-inventory/th-brass-coffee-spoon-01.jpg"
  },
  "th-brass-scoop": {
    id: "th-brass-scoop",
    localPath: "/images/interior-inventory/th-brass-scoop-01.jpg"
  },
  "th-brass-trays": {
    id: "th-brass-trays",
    localPath: "/images/interior-inventory/th-brass-trays-01.jpg"
  },
  "th-ceramic-oil-dispenser": {
    id: "th-ceramic-oil-dispenser",
    localPath: "/images/interior-inventory/th-ceramic-oil-dispenser-01.jpg"
  },
  "th-horikawa-incense": {
    id: "th-horikawa-incense",
    localPath: "/images/interior-inventory/th-horikawa-incense-01.jpg"
  },
  "th-hot-spring-candle": {
    id: "th-hot-spring-candle",
    localPath: "/images/interior-inventory/th-hot-spring-candle-01.jpg"
  },
  "th-kinto-teapot": {
    id: "th-kinto-teapot",
    localPath: "/images/interior-inventory/th-kinto-teapot-01.jpg"
  },
  "th-wooden-measuring-spoons": {
    id: "th-wooden-measuring-spoons",
    localPath: "/images/interior-inventory/th-wooden-measuring-spoons-01.jpg"
  }
};

/**
 * Gets the best image URL for a product, prioritizing local manifest paths.
 * 
 * Order of priority:
 * 1. Local image from EXTRACTED_IMAGE_MANIFEST (if match exists based on product ID)
 * 2. Remote URL from database/data (the passed in originalUrl)
 * 3. Fallback placeholder
 */
export function getOptimizedImageUrl(productId: string, originalUrl?: string): string {
  const manifestEntry = EXTRACTED_IMAGE_MANIFEST[productId];
  if (manifestEntry && manifestEntry.localPath) {
    return manifestEntry.localPath;
  }
  
  // If remote URL is valid, use it
  if (originalUrl && originalUrl.startsWith('http')) {
    return originalUrl;
  }
  
  // If original URL is already a local path, use it
  if (originalUrl && originalUrl.startsWith('/')) {
      return originalUrl;
  }

  return '/images/interior-inventory/placeholder.jpg';
}
