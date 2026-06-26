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
  sourceUrl?: string;
  price?: string;
  dimensions?: string;
  sourceType?: 'Catalog' | 'Sourced';
}

export const PRODUCT_LIBRARY: ProductLibraryItem[] = [
  {
    id: 'real-black-task-lamp',
    name: 'Black Task Lamp',
    brand: 'Interior Creator',
    category: 'Lighting',
    subCategory: 'Table Lamp',
    thumbnailUrl: '/images/product-library/real-black-task-lamp.png',
    styleTags: ['real-product-photo', 'transparent-cutout', 'staging-ready', 'minimal'],
    roomTypes: ['living-room', 'bedroom', 'office', 'moodboard'],
    materials: ['matte metal'],
    colorPalette: ['black', 'soft white'],
    recommendedFor: ['living-room', 'bedroom', 'office'],
    promptKeywords: ['black task lamp', 'real product photo', 'transparent table lamp cutout'],
    premiumScore: 88,
    legendsFitScore: 86,
    dimensions: 'Product photo asset',
    sourceType: 'Catalog',
  },
];
