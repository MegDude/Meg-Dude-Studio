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
  sourceType?: 'Legends' | 'Retailer' | 'Austin';
}

const product = (
  id: string,
  name: string,
  category: string,
  subCategory: string,
  thumbnailUrl: string,
  roomTypes: string[],
  promptKeywords: string[],
  options: Partial<ProductLibraryItem> = {},
): ProductLibraryItem => ({
  id,
  name,
  brand: options.brand || 'Legends Austin',
  category,
  subCategory,
  thumbnailUrl,
  styleTags: options.styleTags || ['modern', 'downtown', 'warm-minimal'],
  roomTypes,
  materials: options.materials || ['wood', 'linen', 'stone', 'metal'],
  colorPalette: options.colorPalette || ['navy', 'cream', 'warm oak', 'cold gold'],
  recommendedFor: options.recommendedFor || roomTypes,
  promptKeywords,
  premiumScore: options.premiumScore || 88,
  legendsFitScore: options.legendsFitScore || 94,
  sourceUrl: options.sourceUrl,
  price: options.price,
  dimensions: options.dimensions,
  sourceType: options.sourceType || 'Legends',
});

const retailer = (
  id: string,
  brand: 'West Elm' | 'Pottery Barn',
  name: string,
  category: string,
  subCategory: string,
  thumbnailUrl: string,
  sourceUrl: string,
) => product(
  id,
  name,
  category,
  subCategory,
  thumbnailUrl,
  ['living-room', 'dining-room', 'bedroom', 'listing'],
  [name.toLowerCase(), brand.toLowerCase(), subCategory.toLowerCase(), 'retailer sourced product'],
  {
    brand,
    sourceUrl,
    sourceType: 'Retailer',
    styleTags: ['retailer', brand.toLowerCase().replace(/\s+/g, '-'), 'catalog'],
    materials: ['wood', 'fabric', 'metal', 'stone'],
    premiumScore: 84,
    legendsFitScore: 86,
  },
);

const austin = (
  id: string,
  business: string,
  name: string,
  category: string,
  subCategory: string,
  thumbnailUrl: string,
  sourceUrl: string,
  price = '',
  dimensions = '',
  tags: string[] = [],
) => product(
  id,
  name,
  category,
  subCategory,
  thumbnailUrl,
  ['living-room', 'dining-room', 'kitchen', 'bedroom', 'moodboard'],
  [name.toLowerCase(), business.toLowerCase(), subCategory.toLowerCase(), ...tags.map(tag => tag.toLowerCase())],
  {
    brand: business,
    sourceUrl,
    sourceType: 'Austin',
    price,
    dimensions,
    styleTags: ['austin-sourced', ...tags],
    materials: ['wood', 'stone', 'brass', 'textile'],
    premiumScore: 90,
    legendsFitScore: 92,
  },
);

export const PRODUCT_LIBRARY: ProductLibraryItem[] = [
  product('cream-track-sofa', 'Cream Track Arm Sofa', 'Furniture', 'Sofa', '/images/interior-products/cream-track-sofa.jpeg', ['living-room', 'studio'], ['cream modern sofa', 'low track arms', 'linen upholstery']),
  product('green-tufted-sofa', 'Green Tufted Sofa', 'Furniture', 'Sofa', '/images/interior-products/green-tufted-sofa.jpeg', ['living-room', 'studio'], ['green tufted sofa', 'editorial lounge seating']),
  product('woven-lounge-chair', 'Woven Lounge Chair', 'Furniture', 'Chair', '/images/interior-products/woven-lounge-chair.jpeg', ['living-room', 'bedroom', 'studio'], ['wood frame lounge chair', 'woven seat', 'accent chair']),
  product('blue-accent-chair', 'Blue Accent Chair', 'Furniture', 'Chair', '/images/interior-products/blue-accent-chair.jpeg', ['living-room', 'bedroom', 'studio'], ['blue accent chair', 'compact lounge chair']),
  product('dining-round-table-set', 'Round Dining Set', 'Furniture', 'Dining', '/images/interior-products/dining-round-table-set.jpeg', ['dining-room', 'kitchen', 'living-room'], ['round marble dining table', 'woven dining chairs']),
  product('wire-coffee-table', 'Wire Base Coffee Table', 'Furniture', 'Table', '/images/interior-products/wire-coffee-table.jpeg', ['living-room', 'studio'], ['round coffee table', 'wire metal base']),
  product('round-side-table', 'Round Side Table', 'Furniture', 'Table', '/images/interior-products/round-side-table.jpeg', ['living-room', 'bedroom'], ['round side table', 'small accent table']),
  product('slim-console-table', 'Slim Console Table', 'Furniture', 'Console', '/images/interior-products/slim-console-table.jpeg', ['living-room', 'entry', 'dining-room'], ['slim console table', 'hairpin legs', 'wood console']),
  product('media-console', 'Low Media Console', 'Furniture', 'Console', '/images/interior-products/media-console.jpeg', ['living-room', 'studio'], ['low media console', 'modern tv stand']),
  product('black-storage-cabinet', 'Black Storage Cabinet', 'Furniture', 'Storage', '/images/interior-products/black-storage-cabinet.jpeg', ['living-room', 'dining-room', 'bedroom'], ['black storage cabinet', 'modern cabinet']),
  product('linen-platform-bed', 'Linen Platform Bed', 'Furniture', 'Bed', '/images/interior-products/linen-platform-bed.jpeg', ['bedroom'], ['linen platform bed', 'cream bedding']),
  product('marble-kitchen-island', 'Marble Kitchen Island', 'Furniture', 'Kitchen', '/images/interior-products/marble-kitchen-island.jpeg', ['kitchen'], ['marble kitchen island', 'waterfall stone counter']),
  product('wood-kitchen-island', 'Wood Kitchen Island', 'Furniture', 'Kitchen', '/images/interior-products/wood-kitchen-island.jpeg', ['kitchen'], ['wood kitchen island', 'warm kitchen storage']),
  product('white-counter-stools', 'White Counter Stools', 'Furniture', 'Seating', '/images/interior-products/white-counter-stools.jpeg', ['kitchen', 'dining-room'], ['white counter stools', 'bar seating']),
  product('linear-pendant-light', 'Linear Pendant Light', 'Lighting', 'Pendant', '/images/interior-products/linear-pendant-light.jpeg', ['living-room', 'dining-room', 'kitchen'], ['linear pendant light', 'modern suspended fixture']),
  product('bedside-table-lamp', 'Bedside Table Lamp', 'Lighting', 'Table Lamp', '/images/interior-products/bedside-table-lamp.jpeg', ['bedroom', 'living-room'], ['bedside table lamp', 'soft ambient light']),

  retailer('westelm-loring-sofa', 'West Elm', 'Loring Sofa', 'Furniture', 'Sofa', '/test-assets/sofas/sofa-01.png', 'https://www.westelm.com/products/loring-sofa-h12945/'),
  retailer('westelm-loring-sectional', 'West Elm', 'Build Your Own Loring Sectional', 'Furniture', 'Sectional', '/test-assets/sofas/sectional-01.png', 'https://www.westelm.com/products/build-your-own-loring-sectional-h13878/'),
  retailer('westelm-laurent-sofa', 'West Elm', 'Laurent Sofa', 'Furniture', 'Sofa', '/test-assets/sofas/sofa-02.png', 'https://www.westelm.com/products/laurent-sofa-h12182/'),
  retailer('westelm-mid-century-storage-coffee-table', 'West Elm', 'Mid-Century Storage Coffee Table', 'Furniture', 'Coffee Table', '/test-assets/tables/coffee-table-01.png', 'https://www.westelm.com/products/mid-century-storage-coffee-table-acorn-h4542/'),
  retailer('westelm-reeve-marble-coffee-table', 'West Elm', 'Reeve Marble Coffee Table', 'Furniture', 'Coffee Table', '/test-assets/tables/side-table-01.png', 'https://www.westelm.com/products/reeve-mid-century-rectangular-coffee-table-h1181/'),
  retailer('westelm-mid-century-pop-up-coffee-table', 'West Elm', 'Mid-Century Marble Pop-Up Coffee Table', 'Furniture', 'Coffee Table', '/test-assets/tables/coffee-table-01.png', 'https://www.westelm.com/products/mid-century-pop-up-storage-coffee-table-h1903/'),
  retailer('potterybarn-toscana-extendable-dining-table', 'Pottery Barn', 'Toscana Extendable Dining Table', 'Furniture', 'Dining Table', '/test-assets/tables/dining-table-01.png', 'https://www.potterybarn.com/products/toscana-extending-dining-table-seadrift/'),
  retailer('potterybarn-toscana-round-extendable-dining-table', 'Pottery Barn', 'Toscana Round Extendable Dining Table', 'Furniture', 'Dining Table', '/test-assets/tables/dining-table-01.png', 'https://www.potterybarn.com/products/toscana-extending-pedestal-table/'),
  retailer('potterybarn-toscana-fixed-dining-table', 'Pottery Barn', 'Toscana Dining Table', 'Furniture', 'Dining Table', '/test-assets/tables/dining-table-01.png', 'https://www.potterybarn.com/products/toscana-fixed-table-seadrift/'),
  retailer('potterybarn-hayden-articulating-floor-lamp', 'Pottery Barn', 'Hayden Articulating Floor Lamp', 'Lighting', 'Floor Lamp', '/test-assets/lighting/floor-lamp-01.png', 'https://www.potterybarn.com/products/hayden-metal-articulating-task-floor-lamp/'),
  retailer('potterybarn-sherman-dome-floor-lamp', 'Pottery Barn', 'Sherman Dome Floor Lamp', 'Lighting', 'Floor Lamp', '/test-assets/lighting/floor-lamp-01.png', 'https://www.potterybarn.com/products/sherman-dome-articulating-task-floor-lamp/'),
  retailer('potterybarn-hayden-table-lamp', 'Pottery Barn', 'Hayden Console Table Lamp', 'Lighting', 'Table Lamp', '/test-assets/lighting/table-lamp-01.png', 'https://www.potterybarn.com/products/hayden-metal-table-lamp/'),

  austin('lo-luna-nightstand', 'Living Oak Home', 'Luna Charging Nightstand', 'Furniture', 'Nightstand', '/test-assets/tables/side-table-01.png', 'https://livingoakhome.com/products/luna-charging-nightstand-brown', '$1,499.00', '28.5 W x 24.5 D x 27.75 H', ['modern-austin', 'bedroom']),
  austin('lo-willow-dresser', 'Living Oak Home', 'Willow Dresser Vintage Brown', 'Furniture', 'Dresser', '/test-assets/tables/side-table-01.png', 'https://livingoakhome.com/products/willow-dresser-vintage-brown', '$2,299.00', '63 W x 19 D x 30 H', ['transitional-luxury', 'storage']),
  austin('lo-marble-salt-pepper', 'Living Oak Home', 'Marble Salt & Pepper Shakers', 'Decor', 'Kitchen/Tabletop', '/test-assets/decor/vase-01.png', 'https://livingoakhome.com/products/chocolate-marble-salt-pepper-shakers', '$46.00', '', ['kitchen-staging', 'marble']),
  austin('lo-living-oak-candle', 'Living Oak Home', 'Living Oak Candle', 'Decor', 'Candle', '/test-assets/decor/vase-01.png', 'https://livingoakhome.com/', '$36.00', '', ['shelf-styling', 'warm-neutral']),
  austin('lo-marble-trivet-riser', 'Living Oak Home', 'Marble Trivet Riser', 'Decor', 'Object / Riser', '/test-assets/decor/vase-01.png', 'https://livingoakhome.com/', '$56.00', '', ['kitchen-styling', 'marble']),
  austin('lo-handblown-glass-pitcher', 'Living Oak Home', 'Handblown Glass Pitcher', 'Decor', 'Tabletop', '/test-assets/decor/vase-01.png', 'https://livingoakhome.com/', '$60.00', '', ['dining', 'organic']),
  austin('th-brass-coffee-spoon', 'Take Heart', 'Brass Coffee Spoon', 'Decor', 'Kitchen Prop', '/test-assets/kitchen/espresso-machine-01.png', 'https://www.takeheartshop.com/collections/home', '$15.00', '', ['brass', 'small-object']),
  austin('th-brass-scoop', 'Take Heart', 'Brass Scoop', 'Decor', 'Kitchen Prop', '/test-assets/kitchen/espresso-machine-01.png', 'https://www.takeheartshop.com/collections/home', '$14.00', '', ['brass', 'detail-styling']),
  austin('th-wooden-measuring-spoons', 'Take Heart', 'Wooden Measuring Spoons', 'Decor', 'Kitchen Prop', '/test-assets/kitchen/espresso-machine-01.png', 'https://www.takeheartshop.com/collections/home', '$32.00', '', ['natural-wood', 'kitchen']),
  austin('th-brass-trays', 'Take Heart', 'Brass Trays', 'Decor', 'Tray', '/test-assets/decor/vase-01.png', 'https://www.takeheartshop.com/collections/home', 'From $20.00', '', ['brass', 'coffee-table']),
  austin('th-ceramic-oil-dispenser', 'Take Heart', 'Ceramic Oil Dispenser', 'Decor', 'Ceramic / Kitchen', '/test-assets/kitchen/espresso-machine-01.png', 'https://www.takeheartshop.com/collections/home', '', '', ['ceramic', 'kitchen']),
  austin('th-set-gingham-napkins', 'Take Heart', 'Two-Tone Gingham Napkins', 'Textiles', 'Table Linen', '/test-assets/rugs/runner-rug-01.png', 'https://www.takeheartshop.com/collections/home', '', '', ['table-linen', 'textiles']),
  austin('th-hot-spring-candle', 'Take Heart', 'Hot Spring Candle', 'Decor', 'Candle', '/test-assets/decor/vase-01.png', 'https://www.takeheartshop.com/collections/home', '', '', ['scent', 'moodboard']),
  austin('th-horikawa-incense', 'Take Heart', 'Horikawa River Path Incense', 'Decor', 'Scent / Incense', '/test-assets/decor/vase-01.png', 'https://www.takeheartshop.com/collections/home', '', '', ['incense', 'shelf-styling']),
  austin('th-kinto-teapot', 'Take Heart', 'Kinto Glass Unitea Teapot', 'Decor', 'Tea/Coffee', '/test-assets/kitchen/espresso-machine-01.png', 'https://www.takeheartshop.com/collections/home', '', '', ['tea', 'tabletop']),
  austin('supply-pelargonium-garnet', 'SUPPLY Showroom', 'Pelargonium Wallpaper Garnet', 'Materials', 'Wallpaper', '/test-assets/decor/wall-art-01.png', 'https://www.supplyshowroom.com/', '', '', ['wallpaper', 'garnet']),
  austin('supply-pelargonium-lapis', 'SUPPLY Showroom', 'Pelargonium Wallpaper Lapis', 'Materials', 'Wallpaper', '/test-assets/decor/wall-art-01.png', 'https://www.supplyshowroom.com/', '', '', ['wallpaper', 'lapis']),
  austin('supply-pelargonium-malachite', 'SUPPLY Showroom', 'Pelargonium Wallpaper Malachite', 'Materials', 'Wallpaper', '/test-assets/decor/wall-art-01.png', 'https://www.supplyshowroom.com/', '', '', ['wallpaper', 'malachite']),
  austin('supply-acacia-stone-blue', 'SUPPLY Showroom', 'Acacia Star Wallpaper Stone and Blue', 'Materials', 'Wallpaper', '/test-assets/decor/wall-art-01.png', 'https://www.supplyshowroom.com/', '', '', ['wallpaper', 'blue']),
  austin('supply-acacia-blue', 'SUPPLY Showroom', 'Acacia Star Wallpaper Blue', 'Materials', 'Wallpaper', '/test-assets/decor/wall-art-01.png', 'https://www.supplyshowroom.com/', '', '', ['wallpaper', 'blue']),
  austin('sc-sofas', 'Scott + Cooner Austin', 'Luxury Modern Sofas Category', 'Furniture', 'Sofas', '/test-assets/sofas/sofa-02.png', 'https://scottcooner.com/products/', '', '', ['luxury-modern', 'sofas']),
  austin('sc-armchairs', 'Scott + Cooner Austin', 'Luxury Modern Armchairs Category', 'Furniture', 'Armchairs', '/test-assets/chairs/lounge-chair-01.png', 'https://scottcooner.com/products/', '', '', ['luxury-modern', 'armchairs']),
  austin('sc-lighting', 'Scott + Cooner Austin', 'Lighting Systems Category', 'Lighting', 'Lighting Systems', '/test-assets/lighting/pendant-light-01.png', 'https://scottcooner.com/products/', '', '', ['lighting', 'modern']),
  austin('fourhands-core-sofas', 'Four Hands', 'Modern Sofas and Sectionals', 'Furniture', 'Sofas/Sectionals', '/test-assets/sofas/sectional-01.png', 'https://fourhands.com/', '', '', ['modern-luxury', 'sectionals']),
  austin('fourhands-core-dining', 'Four Hands', 'Dining Tables and Chairs', 'Furniture', 'Dining', '/test-assets/tables/dining-table-01.png', 'https://fourhands.com/', '', '', ['dining', 'hospitality']),
  austin('roomservice-midcentury', 'Room Service Vintage', 'Mid-Century Rotating Inventory', 'Vintage', 'Rotating Inventory', '/test-assets/chairs/accent-chair-01.png', 'https://roomservicevintage.com/', '', '', ['vintage', 'mid-century']),
];
