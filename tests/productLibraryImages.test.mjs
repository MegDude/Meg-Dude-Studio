import assert from 'node:assert/strict';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const source = fs.readFileSync('src/data/productLibrary.ts', 'utf8');
const productCount = (source.match(/\n\s*(product|retailer|austin)\('/g) || []).length;
const imagePaths = [...source.matchAll(/'([^']+\.(?:png|jpe?g|webp))'/g)]
  .map((match) => match[1])
  .filter((path) => path.startsWith('/'));
const uniqueImagePaths = [...new Set(imagePaths)];
const missing = uniqueImagePaths.filter((path) => !fs.existsSync(`public${path}`));
const nonCutoutPaths = uniqueImagePaths.filter((path) => !path.startsWith('/product-cutouts/'));
const alphaReport = execFileSync(
  '/Users/megdude/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3',
  ['-c', `
from PIL import Image
from pathlib import Path
import sys
opaque=[]
for path in sys.argv[1:]:
    im=Image.open(Path('public'+path))
    has_alpha = im.mode in ('RGBA','LA') and im.getextrema()[-1][0] < 255
    if not has_alpha:
        opaque.append(path)
print('\\n'.join(opaque))
`, ...uniqueImagePaths],
  { encoding: 'utf8' }
).trim();
const requiredAttachedIds = [
  'westelm-loring-sofa',
  'potterybarn-hayden-table-lamp',
  'lo-luna-nightstand',
  'th-brass-trays',
  'supply-pelargonium-lapis',
  'fourhands-core-sofas',
  'roomservice-midcentury',
];
const missingAttachedIds = requiredAttachedIds.filter((id) => !source.includes(`'${id}'`));

assert.ok(productCount >= 50, `Expected at least 50 product records, found ${productCount}.`);
assert.equal(missing.length, 0, `Missing product images:\n${missing.join('\n')}`);
assert.equal(nonCutoutPaths.length, 0, `Product library must use clean transparent cutouts only:\n${nonCutoutPaths.join('\n')}`);
assert.equal(missingAttachedIds.length, 0, `Missing attached catalog products:\n${missingAttachedIds.join('\n')}`);
assert.equal(alphaReport, '', `Product images must have transparent alpha:\n${alphaReport}`);

console.log(`product library image tests passed: ${productCount} products, ${uniqueImagePaths.length} local image paths`);
