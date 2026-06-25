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

const product = (
  id: string,
  name: string,
  category: string,
  subCategory: string,
  roomTypes: string[],
  promptKeywords: string[],
  options: Partial<ProductLibraryItem> = {},
): ProductLibraryItem => ({
  id,
  name,
  brand: options.brand || 'Interior Creator',
  category,
  subCategory,
  thumbnailUrl: `/images/product-library/${id}.png`,
  styleTags: options.styleTags || ['modern', 'minimal', 'staging-ready'],
  roomTypes,
  materials: options.materials || ['wood', 'linen', 'stone', 'metal'],
  colorPalette: options.colorPalette || ['navy', 'cream', 'warm oak', 'cold gold'],
  recommendedFor: options.recommendedFor || roomTypes,
  promptKeywords,
  premiumScore: options.premiumScore || 88,
  legendsFitScore: options.legendsFitScore || 90,
  sourceUrl: options.sourceUrl,
  price: options.price,
  dimensions: options.dimensions,
  sourceType: options.sourceType || 'Catalog',
});

export const PRODUCT_LIBRARY: ProductLibraryItem[] = [
  product('cream-track-sofa', 'Cream Track Sofa', 'Furniture', 'Sofa', ['living-room', 'listing'], ['cream sofa', 'track arm sofa', 'neutral upholstered seating'], {
    materials: ['linen', 'wood'],
  }),
  product('green-tufted-sofa', 'Green Tufted Sofa', 'Furniture', 'Sofa', ['living-room', 'listing'], ['green tufted sofa', 'editorial lounge seating'], {
    materials: ['velvet', 'wood'],
  }),
  product('muse-sofa', 'Muse Modular Sofa', 'Furniture', 'Sofa', ['living-room', 'listing', 'moodboard'], ['cream modular sofa', 'soft rounded sofa', 'contemporary sofa'], {
    brand: 'Sourced Product',
    sourceType: 'Sourced',
    materials: ['boucle', 'upholstery'],
  }),
  product('womb-chair', 'Womb Chair', 'Furniture', 'Chair', ['living-room', 'bedroom', 'moodboard'], ['blue womb chair', 'accent lounge chair', 'sculptural chair'], {
    brand: 'Sourced Product',
    sourceType: 'Sourced',
    materials: ['fabric', 'metal'],
  }),
  product('woven-lounge-chair', 'Woven Lounge Chair', 'Furniture', 'Chair', ['living-room', 'bedroom'], ['woven lounge chair', 'wood frame chair', 'natural accent chair'], {
    materials: ['wood', 'woven cord'],
  }),
  product('blue-accent-chair', 'Blue Accent Chair', 'Furniture', 'Chair', ['living-room', 'bedroom'], ['blue accent chair', 'compact lounge chair'], {
    materials: ['fabric', 'wood'],
  }),
  product('dining-round-table-set', 'Round Dining Set', 'Furniture', 'Dining', ['dining-room', 'kitchen', 'listing'], ['round dining table', 'woven dining chairs', 'dining set'], {
    materials: ['wood', 'stone', 'woven cord'],
  }),
  product('wire-coffee-table', 'Wire Base Coffee Table', 'Furniture', 'Table', ['living-room', 'moodboard'], ['round coffee table', 'wire base table'], {
    materials: ['wood', 'metal'],
  }),
  product('round-side-table', 'Round Side Table', 'Furniture', 'Table', ['living-room', 'bedroom'], ['round side table', 'small accent table'], {
    materials: ['stone', 'metal'],
  }),
  product('slim-console-table', 'Slim Console Table', 'Furniture', 'Console', ['living-room', 'entry'], ['slim console table', 'hairpin console', 'entry table'], {
    materials: ['wood', 'metal'],
  }),
  product('media-console', 'Low Media Console', 'Furniture', 'Console', ['living-room', 'listing'], ['low media console', 'modern media cabinet'], {
    materials: ['wood', 'metal'],
  }),
  product('black-storage-cabinet', 'Black Storage Cabinet', 'Furniture', 'Storage', ['living-room', 'dining-room', 'bedroom'], ['black storage cabinet', 'modern cabinet'], {
    materials: ['wood', 'metal'],
  }),
  product('linen-platform-bed', 'Linen Platform Bed', 'Furniture', 'Bed', ['bedroom', 'listing'], ['linen platform bed', 'neutral bed', 'upholstered bed'], {
    materials: ['linen', 'wood'],
  }),
  product('marble-kitchen-island', 'Marble Kitchen Island', 'Furniture', 'Kitchen', ['kitchen', 'listing'], ['marble kitchen island', 'waterfall island'], {
    materials: ['marble', 'metal'],
  }),
  product('wood-kitchen-island', 'Wood Kitchen Island', 'Furniture', 'Kitchen', ['kitchen', 'listing'], ['wood kitchen island', 'warm kitchen storage'], {
    materials: ['wood', 'stone'],
  }),
  product('white-counter-stools', 'White Counter Stools', 'Furniture', 'Seating', ['kitchen', 'dining-room'], ['white counter stools', 'bar stools'], {
    materials: ['wood', 'upholstery'],
  }),
  product('linear-pendant-light', 'Linear Pendant Light', 'Lighting', 'Pendant', ['living-room', 'dining-room', 'kitchen'], ['linear pendant light', 'modern chandelier'], {
    materials: ['glass', 'metal'],
  }),
  product('bedside-table-lamp', 'Bedside Table Lamp', 'Lighting', 'Table Lamp', ['bedroom', 'living-room'], ['bedside table lamp', 'ambient lamp'], {
    materials: ['linen', 'metal'],
  }),
];
