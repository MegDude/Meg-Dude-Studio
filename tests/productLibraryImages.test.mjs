import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = fs.readFileSync('src/data/productLibrary.ts', 'utf8');
const productCount = (source.match(/\n\s*(product|retailer|austin)\('/g) || []).length;
const imagePaths = [...source.matchAll(/'([^']+\.(?:png|jpe?g|webp))'/g)]
  .map((match) => match[1])
  .filter((path) => path.startsWith('/'));
const uniqueImagePaths = [...new Set(imagePaths)];
const missing = uniqueImagePaths.filter((path) => !fs.existsSync(`public${path}`));

assert.ok(productCount >= 50, `Expected at least 50 product records, found ${productCount}.`);
assert.equal(missing.length, 0, `Missing product images:\n${missing.join('\n')}`);

console.log(`product library image tests passed: ${productCount} products, ${uniqueImagePaths.length} local image paths`);
