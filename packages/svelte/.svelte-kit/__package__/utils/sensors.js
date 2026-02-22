/**
 * Get sensor configuration with defaults applied.
 */
export function getSensorConfig(config) {
    return {
        activationDistance: config?.activationDistance ?? 8,
        longPressDelay: config?.longPressDelay ?? 200,
        hapticFeedback: config?.hapticFeedback ?? false,
    };
}
