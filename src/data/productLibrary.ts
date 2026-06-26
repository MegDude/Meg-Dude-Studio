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

const realProduct = (
  id: string,
  name: string,
  brand: string,
  category: string,
  subCategory: string,
  roomTypes: string[],
  promptKeywords: string[],
  options: Partial<ProductLibraryItem> = {},
): ProductLibraryItem => ({
  id,
  name,
  brand,
  category,
  subCategory,
  thumbnailUrl: `/images/product-library/${id}.png`,
  styleTags: options.styleTags || ['real-product-photo', 'transparent-cutout', 'staging-ready'],
  roomTypes,
  materials: options.materials || ['mixed material'],
  colorPalette: options.colorPalette || ['neutral'],
  recommendedFor: options.recommendedFor || roomTypes,
  promptKeywords,
  premiumScore: options.premiumScore || 88,
  legendsFitScore: options.legendsFitScore || 86,
  sourceUrl: options.sourceUrl,
  price: options.price,
  dimensions: options.dimensions,
  sourceType: options.sourceType || 'Sourced',
});

export const PRODUCT_LIBRARY: ProductLibraryItem[] = [
  realProduct(
    'lo-luna-nightstand',
    'Luna Charging Nightstand',
    'Living Oak Home',
    'Furniture',
    'Nightstand',
    ['bedroom', 'living-room', 'moodboard'],
    ['real nightstand product cutout', 'wood bedside table', 'Austin retailer nightstand'],
    {
      materials: ['wood', 'drawer storage'],
      colorPalette: ['warm brown', 'natural wood'],
      sourceUrl: 'https://livingoakhome.com/products/luna-charging-nightstand-brown',
      price: '$1,499.00',
      dimensions: '28.5 W x 24.5 D x 27.75 H',
    },
  ),
  realProduct(
    'lo-willow-dresser',
    'Willow Dresser',
    'Living Oak Home',
    'Furniture',
    'Dresser',
    ['bedroom', 'living-room', 'moodboard'],
    ['real dresser product cutout', 'wood storage console', 'Austin retailer dresser'],
    {
      materials: ['wood', 'casegoods'],
      colorPalette: ['vintage brown', 'warm wood'],
      sourceUrl: 'https://livingoakhome.com/products/willow-dresser-vintage-brown',
      price: '$2,299.00',
      dimensions: '63 W x 19 D x 30 H',
    },
  ),
  realProduct(
    'lo-marble-salt-pepper',
    'Marble Salt & Pepper',
    'Living Oak Home',
    'Decor',
    'Kitchen',
    ['kitchen', 'dining-room', 'moodboard'],
    ['real marble salt and pepper product cutout', 'kitchen styling object', 'stone tabletop decor'],
    {
      materials: ['marble', 'stone'],
      colorPalette: ['cream', 'brown marble'],
      sourceUrl: 'https://livingoakhome.com/products/chocolate-marble-salt-pepper-shakers',
      price: '$46.00',
    },
  ),
  realProduct(
    'real-black-task-lamp',
    'Black Task Lamp',
    'Interior Creator',
    'Lighting',
    'Table Lamp',
    ['living-room', 'bedroom', 'office', 'moodboard'],
    ['real black task lamp product cutout', 'matte black table lamp', 'minimal desk lamp'],
    {
      materials: ['matte metal'],
      colorPalette: ['black', 'soft white'],
      dimensions: 'Product photo asset',
      sourceType: 'Catalog',
    },
  ),
];
