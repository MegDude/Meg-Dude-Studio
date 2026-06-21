/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export const triggerHaptic = (duration = 20) => {
    if (typeof window !== 'undefined' && window.navigator && window.navigator.vibrate) {
        try {
            window.navigator.vibrate(duration);
        } catch (e) {
            // Ignore errors if vibration is not supported or blocked
        }
    }
};
