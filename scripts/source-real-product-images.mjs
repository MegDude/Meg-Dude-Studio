import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const OUTPUT_DIR = path.resolve('public/images/product-library');

const PRODUCTS = [
  {
    id: 'lo-luna-nightstand',
    name: 'Luna Charging Nightstand',
    brand: 'Living Oak Home',
    category: 'Furniture',
    subCategory: 'Nightstand',
    roomTypes: ['bedroom', 'living-room', 'moodboard'],
    sourceUrl: 'https://livingoakhome.com/products/luna-charging-nightstand-brown',
    price: '$1,499.00',
    dimensions: '28.5 W x 24.5 D x 27.75 H',
  },
  {
    id: 'lo-willow-dresser',
    name: 'Willow Dresser',
    brand: 'Living Oak Home',
    category: 'Furniture',
    subCategory: 'Dresser',
    roomTypes: ['bedroom', 'moodboard'],
    sourceUrl: 'https://livingoakhome.com/products/willow-dresser-vintage-brown',
    price: '$2,299.00',
    dimensions: '63 W x 19 D x 30 H',
  },
  {
    id: 'lo-marble-salt-pepper',
    name: 'Marble Salt & Pepper',
    brand: 'Living Oak Home',
    category: 'Decor',
    subCategory: 'Kitchen',
    roomTypes: ['kitchen', 'dining-room', 'moodboard'],
    sourceUrl: 'https://livingoakhome.com/products/chocolate-marble-salt-pepper-shakers',
    price: '$46.00',
  },
  {
    id: 'supply-pelargonium-garnet',
    name: 'Pelargonium Wallpaper',
    brand: 'SUPPLY Showroom',
    category: 'Materials',
    subCategory: 'Wallpaper',
    roomTypes: ['moodboard', 'living-room', 'bedroom'],
    sourceUrl: 'https://www.supplyshowroom.com/collections/wall-paper/products/pelargonium-garnet-wallpaper',
  },
  {
    id: 'supply-acacia-stone-blue',
    name: 'Acacia Star Wallpaper',
    brand: 'SUPPLY Showroom',
    category: 'Materials',
    subCategory: 'Wallpaper',
    roomTypes: ['moodboard', 'living-room', 'bedroom'],
    sourceUrl: 'https://www.supplyshowroom.com/collections/wall-paper/products/acacia-star-stone-blue-wallpaper',
  },
];

function shopifyJsonUrl(sourceUrl) {
  const url = new URL(sourceUrl);
  return `${url.origin}${url.pathname.replace(/\/$/, '')}.js`;
}

function absolutizeImageUrl(imageUrl, sourceUrl) {
  if (!imageUrl) return null;
  if (imageUrl.startsWith('//')) return `https:${imageUrl}`;
  return new URL(imageUrl, sourceUrl).toString();
}

async function fetchProductImageUrls(product) {
  const jsonUrl = shopifyJsonUrl(product.sourceUrl);
  const response = await fetch(jsonUrl, {
    headers: {
      accept: 'application/json,text/javascript,*/*',
      'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120 Safari/537.36',
    },
  });
  if (!response.ok) {
    throw new Error(`${product.id} product JSON returned ${response.status}`);
  }
  const data = await response.json();
  const candidates = [...new Set([data.featured_image, ...(data.images || [])])]
    .map((candidate) => absolutizeImageUrl(candidate, product.sourceUrl))
    .filter(Boolean);
  if (candidates.length === 0) {
    throw new Error(`${product.id} did not expose a product image`);
  }
  return candidates;
}

async function downloadProduct(product) {
  const imageUrls = await fetchProductImageUrls(product);
  const downloaded = [];
  for (const [index, imageUrl] of imageUrls.slice(0, 12).entries()) {
    const response = await fetch(imageUrl, {
      headers: {
        accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
        'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120 Safari/537.36',
      },
    });
    if (!response.ok) {
      console.warn(`${product.id} candidate ${index + 1} returned ${response.status}`);
      continue;
    }
    const contentType = response.headers.get('content-type') || '';
    const ext = contentType.includes('png') ? 'png' : contentType.includes('webp') ? 'webp' : 'jpg';
    const buffer = Buffer.from(await response.arrayBuffer());
    const rawPath = path.join(OUTPUT_DIR, `${product.id}.candidate-${String(index + 1).padStart(2, '0')}.${ext}`);
    await writeFile(rawPath, buffer);
    downloaded.push({ imageUrl, rawPath });
  }
  if (downloaded.length === 0) {
    throw new Error(`${product.id} had no downloadable product images`);
  }
  return { ...product, imageUrl: downloaded[0].imageUrl, rawPath: downloaded[0].rawPath, candidates: downloaded };
}

await mkdir(OUTPUT_DIR, { recursive: true });
const results = [];
for (const product of PRODUCTS) {
  try {
    const result = await downloadProduct(product);
    results.push(result);
    console.log(`downloaded ${product.id}`);
  } catch (error) {
    console.warn(`failed ${product.id}: ${error.message}`);
  }
}

await writeFile(
  path.join(OUTPUT_DIR, 'sourced-products.json'),
  JSON.stringify(results, null, 2),
);

if (results.length === 0) {
  throw new Error('No real product images were sourced.');
}
