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
  product('cream-track-sofa', 'Cream Track Arm Sofa', 'Furniture', 'Sofa', '/product-cutouts/sofas/sofa-01.png', ['living-room', 'studio'], ['cream modern sofa', 'low track arms', 'linen upholstery']),
  product('green-tufted-sofa', 'Green Tufted Sofa', 'Furniture', 'Sofa', '/product-cutouts/sofas/sofa-02.png', ['living-room', 'studio'], ['green tufted sofa', 'editorial lounge seating']),
  product('woven-lounge-chair', 'Woven Lounge Chair', 'Furniture', 'Chair', '/product-cutouts/chairs/lounge-chair-01.png', ['living-room', 'bedroom', 'studio'], ['wood frame lounge chair', 'woven seat', 'accent chair']),
  product('blue-accent-chair', 'Blue Accent Chair', 'Furniture', 'Chair', '/product-cutouts/chairs/accent-chair-01.png', ['living-room', 'bedroom', 'studio'], ['blue accent chair', 'compact lounge chair']),
  product('dining-round-table-set', 'Round Dining Set', 'Furniture', 'Dining', '/product-cutouts/tables/dining-table-01.png', ['dining-room', 'kitchen', 'living-room'], ['round marble dining table', 'woven dining chairs']),
  product('wire-coffee-table', 'Wire Base Coffee Table', 'Furniture', 'Table', '/product-cutouts/tables/coffee-table-01.png', ['living-room', 'studio'], ['round coffee table', 'wire metal base']),
  product('round-side-table', 'Round Side Table', 'Furniture', 'Table', '/product-cutouts/tables/side-table-01.png', ['living-room', 'bedroom'], ['round side table', 'small accent table']),
  product('slim-console-table', 'Slim Console Table', 'Furniture', 'Console', '/product-cutouts/tables/side-table-01.png', ['living-room', 'entry', 'dining-room'], ['slim console table', 'hairpin legs', 'wood console']),
  product('media-console', 'Low Media Console', 'Furniture', 'Console', '/product-cutouts/tables/coffee-table-01.png', ['living-room', 'studio'], ['low media console', 'modern tv stand']),
  product('black-storage-cabinet', 'Black Storage Cabinet', 'Furniture', 'Storage', '/product-cutouts/tables/side-table-01.png', ['living-room', 'dining-room', 'bedroom'], ['black storage cabinet', 'modern cabinet']),
  product('linen-platform-bed', 'Linen Platform Bed', 'Furniture', 'Bed', '/product-cutouts/sofas/sectional-01.png', ['bedroom'], ['linen platform bed', 'cream bedding']),
  product('marble-kitchen-island', 'Marble Kitchen Island', 'Furniture', 'Kitchen', '/product-cutouts/tables/dining-table-01.png', ['kitchen'], ['marble kitchen island', 'waterfall stone counter']),
  product('wood-kitchen-island', 'Wood Kitchen Island', 'Furniture', 'Kitchen', '/product-cutouts/tables/dining-table-01.png', ['kitchen'], ['wood kitchen island', 'warm kitchen storage']),
  product('white-counter-stools', 'White Counter Stools', 'Furniture', 'Seating', '/product-cutouts/kitchen/bar-stool-01.png', ['kitchen', 'dining-room'], ['white counter stools', 'bar seating']),
  product('linear-pendant-light', 'Linear Pendant Light', 'Lighting', 'Pendant', '/product-cutouts/lighting/pendant-light-01.png', ['living-room', 'dining-room', 'kitchen'], ['linear pendant light', 'modern suspended fixture']),
  product('bedside-table-lamp', 'Bedside Table Lamp', 'Lighting', 'Table Lamp', '/product-cutouts/lighting/table-lamp-01.png', ['bedroom', 'living-room'], ['bedside table lamp', 'soft ambient light']),

  retailer('westelm-loring-sofa', 'West Elm', 'Loring Sofa', 'Furniture', 'Sofa', '/product-cutouts/sofas/sofa-01.png', 'https://www.westelm.com/products/loring-sofa-h12945/'),
  retailer('westelm-loring-sectional', 'West Elm', 'Build Your Own Loring Sectional', 'Furniture', 'Sectional', '/product-cutouts/sofas/sectional-01.png', 'https://www.westelm.com/products/build-your-own-loring-sectional-h13878/'),
  retailer('westelm-laurent-sofa', 'West Elm', 'Laurent Sofa', 'Furniture', 'Sofa', '/product-cutouts/sofas/sofa-02.png', 'https://www.westelm.com/products/laurent-sofa-h12182/'),
  retailer('westelm-mid-century-storage-coffee-table', 'West Elm', 'Mid-Century Storage Coffee Table', 'Furniture', 'Coffee Table', '/product-cutouts/tables/coffee-table-01.png', 'https://www.westelm.com/products/mid-century-storage-coffee-table-acorn-h4542/'),
  retailer('westelm-reeve-marble-coffee-table', 'West Elm', 'Reeve Marble Coffee Table', 'Furniture', 'Coffee Table', '/product-cutouts/tables/side-table-01.png', 'https://www.westelm.com/products/reeve-mid-century-rectangular-coffee-table-h1181/'),
  retailer('westelm-mid-century-pop-up-coffee-table', 'West Elm', 'Mid-Century Marble Pop-Up Coffee Table', 'Furniture', 'Coffee Table', '/product-cutouts/tables/coffee-table-01.png', 'https://www.westelm.com/products/mid-century-pop-up-storage-coffee-table-h1903/'),
  retailer('potterybarn-toscana-extendable-dining-table', 'Pottery Barn', 'Toscana Extendable Dining Table', 'Furniture', 'Dining Table', '/product-cutouts/tables/dining-table-01.png', 'https://www.potterybarn.com/products/toscana-extending-dining-table-seadrift/'),
  retailer('potterybarn-toscana-round-extendable-dining-table', 'Pottery Barn', 'Toscana Round Extendable Dining Table', 'Furniture', 'Dining Table', '/product-cutouts/tables/dining-table-01.png', 'https://www.potterybarn.com/products/toscana-extending-pedestal-table/'),
  retailer('potterybarn-toscana-fixed-dining-table', 'Pottery Barn', 'Toscana Dining Table', 'Furniture', 'Dining Table', '/product-cutouts/tables/dining-table-01.png', 'https://www.potterybarn.com/products/toscana-fixed-table-seadrift/'),
  retailer('potterybarn-hayden-articulating-floor-lamp', 'Pottery Barn', 'Hayden Articulating Floor Lamp', 'Lighting', 'Floor Lamp', '/product-cutouts/lighting/floor-lamp-01.png', 'https://www.potterybarn.com/products/hayden-metal-articulating-task-floor-lamp/'),
  retailer('potterybarn-sherman-dome-floor-lamp', 'Pottery Barn', 'Sherman Dome Floor Lamp', 'Lighting', 'Floor Lamp', '/product-cutouts/lighting/floor-lamp-01.png', 'https://www.potterybarn.com/products/sherman-dome-articulating-task-floor-lamp/'),
  retailer('potterybarn-hayden-table-lamp', 'Pottery Barn', 'Hayden Console Table Lamp', 'Lighting', 'Table Lamp', '/product-cutouts/lighting/table-lamp-01.png', 'https://www.potterybarn.com/products/hayden-metal-table-lamp/'),

  austin('lo-luna-nightstand', 'Living Oak Home', 'Luna Charging Nightstand', 'Furniture', 'Nightstand', '/product-cutouts/tables/side-table-01.png', 'https://livingoakhome.com/products/luna-charging-nightstand-brown', '$1,499.00', '28.5 W x 24.5 D x 27.75 H', ['modern-austin', 'bedroom']),
  austin('lo-willow-dresser', 'Living Oak Home', 'Willow Dresser Vintage Brown', 'Furniture', 'Dresser', '/product-cutouts/tables/side-table-01.png', 'https://livingoakhome.com/products/willow-dresser-vintage-brown', '$2,299.00', '63 W x 19 D x 30 H', ['transitional-luxury', 'storage']),
  austin('lo-marble-salt-pepper', 'Living Oak Home', 'Marble Salt & Pepper Shakers', 'Decor', 'Kitchen/Tabletop', '/product-cutouts/decor/vase-01.png', 'https://livingoakhome.com/products/chocolate-marble-salt-pepper-shakers', '$46.00', '', ['kitchen-staging', 'marble']),
  austin('lo-living-oak-candle', 'Living Oak Home', 'Living Oak Candle', 'Decor', 'Candle', '/product-cutouts/decor/vase-01.png', 'https://livingoakhome.com/', '$36.00', '', ['shelf-styling', 'warm-neutral']),
  austin('lo-marble-trivet-riser', 'Living Oak Home', 'Marble Trivet Riser', 'Decor', 'Object / Riser', '/product-cutouts/decor/vase-01.png', 'https://livingoakhome.com/', '$56.00', '', ['kitchen-styling', 'marble']),
  austin('lo-handblown-glass-pitcher', 'Living Oak Home', 'Handblown Glass Pitcher', 'Decor', 'Tabletop', '/product-cutouts/decor/vase-01.png', 'https://livingoakhome.com/', '$60.00', '', ['dining', 'organic']),
  austin('th-brass-coffee-spoon', 'Take Heart', 'Brass Coffee Spoon', 'Decor', 'Kitchen Prop', '/product-cutouts/kitchen/espresso-machine-01.png', 'https://www.takeheartshop.com/collections/home', '$15.00', '', ['brass', 'small-object']),
  austin('th-brass-scoop', 'Take Heart', 'Brass Scoop', 'Decor', 'Kitchen Prop', '/product-cutouts/kitchen/espresso-machine-01.png', 'https://www.takeheartshop.com/collections/home', '$14.00', '', ['brass', 'detail-styling']),
  austin('th-wooden-measuring-spoons', 'Take Heart', 'Wooden Measuring Spoons', 'Decor', 'Kitchen Prop', '/product-cutouts/kitchen/espresso-machine-01.png', 'https://www.takeheartshop.com/collections/home', '$32.00', '', ['natural-wood', 'kitchen']),
  austin('th-brass-trays', 'Take Heart', 'Brass Trays', 'Decor', 'Tray', '/product-cutouts/decor/vase-01.png', 'https://www.takeheartshop.com/collections/home', 'From $20.00', '', ['brass', 'coffee-table']),
  austin('th-ceramic-oil-dispenser', 'Take Heart', 'Ceramic Oil Dispenser', 'Decor', 'Ceramic / Kitchen', '/product-cutouts/kitchen/espresso-machine-01.png', 'https://www.takeheartshop.com/collections/home', '', '', ['ceramic', 'kitchen']),
  austin('th-set-gingham-napkins', 'Take Heart', 'Two-Tone Gingham Napkins', 'Textiles', 'Table Linen', '/product-cutouts/rugs/runner-rug-01.png', 'https://www.takeheartshop.com/collections/home', '', '', ['table-linen', 'textiles']),
  austin('th-hot-spring-candle', 'Take Heart', 'Hot Spring Candle', 'Decor', 'Candle', '/product-cutouts/decor/vase-01.png', 'https://www.takeheartshop.com/collections/home', '', '', ['scent', 'moodboard']),
  austin('th-horikawa-incense', 'Take Heart', 'Horikawa River Path Incense', 'Decor', 'Scent / Incense', '/product-cutouts/decor/vase-01.png', 'https://www.takeheartshop.com/collections/home', '', '', ['incense', 'shelf-styling']),
  austin('th-kinto-teapot', 'Take Heart', 'Kinto Glass Unitea Teapot', 'Decor', 'Tea/Coffee', '/product-cutouts/kitchen/espresso-machine-01.png', 'https://www.takeheartshop.com/collections/home', '', '', ['tea', 'tabletop']),
  austin('supply-pelargonium-garnet', 'SUPPLY Showroom', 'Pelargonium Wallpaper Garnet', 'Materials', 'Wallpaper', '/product-cutouts/decor/wall-art-01.png', 'https://www.supplyshowroom.com/', '', '', ['wallpaper', 'garnet']),
  austin('supply-pelargonium-lapis', 'SUPPLY Showroom', 'Pelargonium Wallpaper Lapis', 'Materials', 'Wallpaper', '/product-cutouts/decor/wall-art-01.png', 'https://www.supplyshowroom.com/', '', '', ['wallpaper', 'lapis']),
  austin('supply-pelargonium-malachite', 'SUPPLY Showroom', 'Pelargonium Wallpaper Malachite', 'Materials', 'Wallpaper', '/product-cutouts/decor/wall-art-01.png', 'https://www.supplyshowroom.com/', '', '', ['wallpaper', 'malachite']),
  austin('supply-acacia-stone-blue', 'SUPPLY Showroom', 'Acacia Star Wallpaper Stone and Blue', 'Materials', 'Wallpaper', '/product-cutouts/decor/wall-art-01.png', 'https://www.supplyshowroom.com/', '', '', ['wallpaper', 'blue']),
  austin('supply-acacia-blue', 'SUPPLY Showroom', 'Acacia Star Wallpaper Blue', 'Materials', 'Wallpaper', '/product-cutouts/decor/wall-art-01.png', 'https://www.supplyshowroom.com/', '', '', ['wallpaper', 'blue']),
  austin('sc-sofas', 'Scott + Cooner Austin', 'Luxury Modern Sofas Category', 'Furniture', 'Sofas', '/product-cutouts/sofas/sofa-02.png', 'https://scottcooner.com/products/', '', '', ['luxury-modern', 'sofas']),
  austin('sc-armchairs', 'Scott + Cooner Austin', 'Luxury Modern Armchairs Category', 'Furniture', 'Armchairs', '/product-cutouts/chairs/lounge-chair-01.png', 'https://scottcooner.com/products/', '', '', ['luxury-modern', 'armchairs']),
  austin('sc-lighting', 'Scott + Cooner Austin', 'Lighting Systems Category', 'Lighting', 'Lighting Systems', '/product-cutouts/lighting/pendant-light-01.png', 'https://scottcooner.com/products/', '', '', ['lighting', 'modern']),
  austin('fourhands-core-sofas', 'Four Hands', 'Modern Sofas and Sectionals', 'Furniture', 'Sofas/Sectionals', '/product-cutouts/sofas/sectional-01.png', 'https://fourhands.com/', '', '', ['modern-luxury', 'sectionals']),
  austin('fourhands-core-dining', 'Four Hands', 'Dining Tables and Chairs', 'Furniture', 'Dining', '/product-cutouts/tables/dining-table-01.png', 'https://fourhands.com/', '', '', ['dining', 'hospitality']),
  austin('roomservice-midcentury', 'Room Service Vintage', 'Mid-Century Rotating Inventory', 'Vintage', 'Rotating Inventory', '/product-cutouts/chairs/accent-chair-01.png', 'https://roomservicevintage.com/', '', '', ['vintage', 'mid-century']),
];
