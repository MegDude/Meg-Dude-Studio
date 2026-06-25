import assert from 'node:assert/strict';
import { canGenerateDesign, getDefaultImageRecoveryState } from '../src/lib/defaultImageFallback.js';

const successfulLoad = getDefaultImageRecoveryState(2, 0);
assert.equal(successfulLoad.warning, null);
assert.equal(successfulLoad.useFallback, false);
assert.equal(successfulLoad.canContinueBlank, false);

const partialFailure = getDefaultImageRecoveryState(1, 1);
assert.equal(partialFailure.useFallback, false);
assert.equal(partialFailure.canContinueBlank, true);
assert.match(partialFailure.warning || '', /Default images could not be loaded/);

const totalFailure = getDefaultImageRecoveryState(0, 2);
assert.equal(totalFailure.useFallback, true);
assert.equal(totalFailure.canContinueBlank, true);
assert.match(totalFailure.warning || '', /continue with a blank project/);

assert.equal(canGenerateDesign({
  hasScene: true,
  editMode: 'add',
  removePrompt: '',
  activeProductCount: 0,
  hasSelectedProduct: true,
  designBrief: 'Create a room preview',
}), true);

assert.equal(canGenerateDesign({
  hasScene: false,
  editMode: 'add',
  removePrompt: '',
  activeProductCount: 1,
  hasSelectedProduct: false,
  designBrief: 'Create a room preview',
}), false);

console.log('default image fallback tests passed');
