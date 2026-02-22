/**
 * Trigger haptic feedback (vibration) on supported devices.
 * Safe to call in any environment -- no-ops when `navigator.vibrate` is unavailable.
 */
export function triggerHaptic(durationMs = 10) {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
        navigator.vibrate(durationMs);
    }
}
