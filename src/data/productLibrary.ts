export interface ProductLibraryItem {
  id: string;
  name: string;
  brand: string;
  category: string;
  subCategory: string;
  thumbnailUrl: string;
  styleTags: string[];
  roomTypes: string[];
  materials: string[];
  colorPalette: string[];
  recommendedFor: string[];
  promptKeywords: string[];
  premiumScore: number;
  legendsFitScore: number;
}

const product = (
  id: string,
  name: string,
  category: string,
  subCategory: string,
  thumbnailUrl: string,
  roomTypes: string[],
  promptKeywords: string[],
): ProductLibraryItem => ({
  id,
  name,
  brand: 'Legends Austin',
  category,
  subCategory,
  thumbnailUrl,
  styleTags: ['modern', 'downtown', 'warm-minimal'],
  roomTypes,
  materials: ['wood', 'linen', 'stone', 'metal'],
  colorPalette: ['navy', 'cream', 'warm oak', 'cold gold'],
  recommendedFor: roomTypes,
  promptKeywords,
  premiumScore: 88,
  legendsFitScore: 94,
});

export const PRODUCT_LIBRARY: ProductLibraryItem[] = [
  product(
    'cream-track-sofa',
    'Cream Track Arm Sofa',
    'Furniture',
    'Sofa',
    '/images/interior-products/cream-track-sofa.jpeg',
    ['living-room', 'studio'],
    ['cream modern sofa', 'low track arms', 'linen upholstery'],
  ),
  product(
    'green-tufted-sofa',
    'Green Tufted Sofa',
    'Furniture',
    'Sofa',
    '/images/interior-products/green-tufted-sofa.jpeg',
    ['living-room', 'studio'],
    ['green tufted sofa', 'editorial lounge seating'],
  ),
  product(
    'woven-lounge-chair',
    'Woven Lounge Chair',
    'Furniture',
    'Chair',
    '/images/interior-products/woven-lounge-chair.jpeg',
    ['living-room', 'bedroom', 'studio'],
    ['wood frame lounge chair', 'woven seat', 'accent chair'],
  ),
  product(
    'blue-accent-chair',
    'Blue Accent Chair',
    'Furniture',
    'Chair',
    '/images/interior-products/blue-accent-chair.jpeg',
    ['living-room', 'bedroom', 'studio'],
    ['blue accent chair', 'compact lounge chair'],
  ),
  product(
    'dining-round-table-set',
    'Round Dining Set',
    'Furniture',
    'Dining',
    '/images/interior-products/dining-round-table-set.jpeg',
    ['dining-room', 'kitchen', 'living-room'],
    ['round marble dining table', 'woven dining chairs'],
  ),
  product(
    'wire-coffee-table',
    'Wire Base Coffee Table',
    'Furniture',
    'Table',
    '/images/interior-products/wire-coffee-table.jpeg',
    ['living-room', 'studio'],
    ['round coffee table', 'wire metal base'],
  ),
  product(
    'round-side-table',
    'Round Side Table',
    'Furniture',
    'Table',
    '/images/interior-products/round-side-table.jpeg',
    ['living-room', 'bedroom'],
    ['round side table', 'small accent table'],
  ),
  product(
    'slim-console-table',
    'Slim Console Table',
    'Furniture',
    'Console',
    '/images/interior-products/slim-console-table.jpeg',
    ['living-room', 'entry', 'dining-room'],
    ['slim console table', 'hairpin legs', 'wood console'],
  ),
  product(
    'media-console',
    'Low Media Console',
    'Furniture',
    'Console',
    '/images/interior-products/media-console.jpeg',
    ['living-room', 'studio'],
    ['low media console', 'modern tv stand'],
  ),
  product(
    'black-storage-cabinet',
    'Black Storage Cabinet',
    'Furniture',
    'Storage',
    '/images/interior-products/black-storage-cabinet.jpeg',
    ['living-room', 'dining-room', 'bedroom'],
    ['black storage cabinet', 'modern cabinet'],
  ),
  product(
    'linen-platform-bed',
    'Linen Platform Bed',
    'Furniture',
    'Bed',
    '/images/interior-products/linen-platform-bed.jpeg',
    ['bedroom'],
    ['linen platform bed', 'cream bedding'],
  ),
  product(
    'marble-kitchen-island',
    'Marble Kitchen Island',
    'Furniture',
    'Kitchen',
    '/images/interior-products/marble-kitchen-island.jpeg',
    ['kitchen'],
    ['marble kitchen island', 'waterfall stone counter'],
  ),
  product(
    'wood-kitchen-island',
    'Wood Kitchen Island',
    'Furniture',
    'Kitchen',
    '/images/interior-products/wood-kitchen-island.jpeg',
    ['kitchen'],
    ['wood kitchen island', 'warm kitchen storage'],
  ),
  product(
    'white-counter-stools',
    'White Counter Stools',
    'Furniture',
    'Seating',
    '/images/interior-products/white-counter-stools.jpeg',
    ['kitchen', 'dining-room'],
    ['white counter stools', 'bar seating'],
  ),
  product(
    'linear-pendant-light',
    'Linear Pendant Light',
    'Lighting',
    'Pendant',
    '/images/interior-products/linear-pendant-light.jpeg',
    ['living-room', 'dining-room', 'kitchen'],
    ['linear pendant light', 'modern suspended fixture'],
  ),
  product(
    'bedside-table-lamp',
    'Bedside Table Lamp',
    'Lighting',
    'Table Lamp',
    '/images/interior-products/bedside-table-lamp.jpeg',
    ['bedroom', 'living-room'],
    ['bedside table lamp', 'soft ambient light'],
  ),
];
