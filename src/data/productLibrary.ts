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
  brand: options.brand || 'Interior Creator Cutout',
  category,
  subCategory,
  thumbnailUrl: `/images/product-library/${id}.png`,
  styleTags: options.styleTags || ['individual-item', 'transparent-cutout', 'staging-ready'],
  roomTypes,
  materials: options.materials || ['mixed material'],
  colorPalette: options.colorPalette || ['neutral', 'warm wood', 'soft grey', 'cold gold'],
  recommendedFor: options.recommendedFor || roomTypes,
  promptKeywords,
  premiumScore: options.premiumScore || 86,
  legendsFitScore: options.legendsFitScore || 88,
  sourceUrl: options.sourceUrl,
  price: options.price,
  dimensions: options.dimensions,
  sourceType: options.sourceType || 'Catalog',
});

export const PRODUCT_LIBRARY: ProductLibraryItem[] = [
  product('sectional-01', 'Sectional Sofa', 'Furniture', 'Sofa', ['living-room', 'listing'], ['sectional sofa cutout', 'individual sectional', 'large lounge seating'], {
    materials: ['upholstery'],
  }),
  product('sofa-01', 'Track Arm Sofa', 'Furniture', 'Sofa', ['living-room', 'listing'], ['sofa cutout', 'individual sofa', 'neutral upholstered sofa'], {
    materials: ['upholstery'],
  }),
  product('sofa-02', 'Compact Sofa', 'Furniture', 'Sofa', ['living-room', 'apartment', 'listing'], ['compact sofa cutout', 'individual small sofa'], {
    materials: ['upholstery'],
  }),
  product('accent-chair-01', 'Accent Chair', 'Furniture', 'Chair', ['living-room', 'bedroom', 'moodboard'], ['accent chair cutout', 'individual lounge chair'], {
    materials: ['upholstery', 'metal'],
  }),
  product('lounge-chair-01', 'Lounge Chair', 'Furniture', 'Chair', ['living-room', 'bedroom'], ['lounge chair cutout', 'individual reading chair'], {
    materials: ['upholstery', 'metal'],
  }),
  product('dining-chair-01', 'Dining Chair', 'Furniture', 'Chair', ['dining-room', 'kitchen'], ['dining chair cutout', 'individual side chair'], {
    materials: ['upholstery', 'metal'],
  }),
  product('bar-stool-01', 'Counter Stool', 'Furniture', 'Seating', ['kitchen', 'dining-room'], ['counter stool cutout', 'individual bar stool'], {
    materials: ['upholstery', 'metal'],
  }),
  product('coffee-table-01', 'Coffee Table', 'Furniture', 'Table', ['living-room', 'moodboard'], ['coffee table cutout', 'individual coffee table'], {
    materials: ['wood', 'metal'],
  }),
  product('side-table-01', 'Side Table', 'Furniture', 'Table', ['living-room', 'bedroom'], ['side table cutout', 'individual accent table'], {
    materials: ['wood', 'metal'],
  }),
  product('dining-table-01', 'Dining Table', 'Furniture', 'Dining', ['dining-room', 'kitchen', 'listing'], ['dining table cutout', 'individual dining table'], {
    materials: ['wood', 'metal'],
  }),
  product('floor-lamp-01', 'Floor Lamp', 'Lighting', 'Floor Lamp', ['living-room', 'bedroom', 'listing'], ['floor lamp cutout', 'individual standing lamp'], {
    materials: ['metal', 'fabric shade'],
  }),
  product('table-lamp-01', 'Table Lamp', 'Lighting', 'Table Lamp', ['bedroom', 'living-room'], ['table lamp cutout', 'individual lamp'], {
    materials: ['metal', 'fabric shade'],
  }),
  product('pendant-light-01', 'Pendant Light', 'Lighting', 'Pendant', ['living-room', 'dining-room', 'kitchen'], ['pendant light cutout', 'individual hanging light'], {
    materials: ['metal', 'fabric shade'],
  }),
  product('area-rug-01', 'Area Rug', 'Textiles', 'Rug', ['living-room', 'bedroom', 'listing'], ['area rug cutout', 'individual rug'], {
    materials: ['woven textile'],
  }),
  product('runner-rug-01', 'Runner Rug', 'Textiles', 'Rug', ['entry', 'kitchen', 'hallway'], ['runner rug cutout', 'individual runner rug'], {
    materials: ['woven textile'],
  }),
  product('monstera-01', 'Monstera Plant', 'Decor', 'Plant', ['living-room', 'bedroom', 'moodboard'], ['monstera plant cutout', 'individual potted plant'], {
    materials: ['ceramic', 'greenery'],
    colorPalette: ['green', 'warm clay', 'cream'],
  }),
  product('olive-tree-01', 'Olive Tree', 'Decor', 'Plant', ['living-room', 'bedroom', 'listing'], ['olive tree cutout', 'individual potted tree'], {
    materials: ['ceramic', 'greenery'],
    colorPalette: ['green', 'warm clay', 'cream'],
  }),
  product('potted-plant-01', 'Potted Plant', 'Decor', 'Plant', ['living-room', 'bedroom', 'moodboard'], ['potted plant cutout', 'individual decor plant'], {
    materials: ['ceramic', 'greenery'],
    colorPalette: ['green', 'warm clay', 'cream'],
  }),
  product('vase-01', 'Ceramic Vase', 'Decor', 'Vase', ['living-room', 'dining-room', 'moodboard'], ['vase cutout', 'individual ceramic vase'], {
    materials: ['ceramic'],
  }),
  product('wall-art-01', 'Wall Art', 'Decor', 'Art', ['living-room', 'bedroom', 'moodboard'], ['wall art cutout', 'individual framed art'], {
    materials: ['paper', 'frame'],
  }),
  product('mirror-01', 'Wall Mirror', 'Decor', 'Mirror', ['living-room', 'bedroom', 'entry'], ['mirror cutout', 'individual wall mirror'], {
    materials: ['glass', 'frame'],
  }),
  product('espresso-machine-01', 'Espresso Machine', 'Kitchen', 'Appliance', ['kitchen', 'moodboard'], ['espresso machine cutout', 'individual kitchen appliance'], {
    materials: ['metal', 'plastic'],
  }),
];
