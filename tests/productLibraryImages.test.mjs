import assert from 'node:assert/strict';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const source = fs.readFileSync('src/data/productLibrary.ts', 'utf8');
const productIds = [
  ...source.matchAll(/\n\s*(?:product|realProduct)\(\s*'([^']+)'/g),
  ...source.matchAll(/\n\s*id:\s*'([^']+)'/g),
].map((match) => match[1]);
const productCount = productIds.length;
const explicitImagePaths = [...source.matchAll(/'([^']+\.(?:png|jpe?g|webp))'/g)]
  .map((match) => match[1])
  .filter((path) => path.startsWith('/'));
const imagePaths = [
  ...explicitImagePaths,
  ...productIds.map((id) => `/images/product-library/${id}.png`),
];
const uniqueImagePaths = [...new Set(imagePaths)];
const missing = uniqueImagePaths.filter((path) => !fs.existsSync(`public${path}`));
const nonProductLibraryPaths = uniqueImagePaths.filter((path) => !path.startsWith('/images/product-library/'));
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
const requiredProductIds = [
  'lo-luna-nightstand',
  'lo-willow-dresser',
  'lo-marble-salt-pepper',
  'real-black-task-lamp',
];
const removedInSituIds = [
  'sectional-01',
  'sofa-01',
  'sofa-02',
  'accent-chair-01',
  'lounge-chair-01',
  'dining-chair-01',
  'bar-stool-01',
  'coffee-table-01',
  'side-table-01',
  'dining-table-01',
  'floor-lamp-01',
  'table-lamp-01',
  'pendant-light-01',
  'area-rug-01',
  'runner-rug-01',
  'monstera-01',
  'olive-tree-01',
  'potted-plant-01',
  'vase-01',
  'wall-art-01',
  'mirror-01',
  'espresso-machine-01',
  'cream-track-sofa',
  'green-tufted-sofa',
  'muse-sofa',
  'womb-chair',
  'dining-round-table-set',
  'linear-pendant-light',
  'bedside-table-lamp',
];
const missingProductIds = requiredProductIds.filter((id) => !source.includes(`'${id}'`));
const staleInSituIds = removedInSituIds.filter((id) => source.includes(`'${id}'`));

assert.equal(productCount, 4, `Expected the cleaned real-photo product library, found ${productCount}.`);
assert.equal(missing.length, 0, `Missing product images:\n${missing.join('\n')}`);
assert.equal(nonProductLibraryPaths.length, 0, `Product library must use rebuilt local product images only:\n${nonProductLibraryPaths.join('\n')}`);
assert.equal(missingProductIds.length, 0, `Missing real-photo catalog products:\n${missingProductIds.join('\n')}`);
assert.equal(staleInSituIds.length, 0, `Old in-situ product IDs must not remain:\n${staleInSituIds.join('\n')}`);
assert.equal(alphaReport, '', `Product images must have transparent alpha:\n${alphaReport}`);

console.log(`product library image tests passed: ${productCount} real products, ${uniqueImagePaths.length} local image paths`);
