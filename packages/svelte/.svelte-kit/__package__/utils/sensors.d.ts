import type { SensorConfig } from '@dnd-block-tree/core';
export interface SensorConfigResult {
    activationDistance: number;
    longPressDelay: number;
    hapticFeedback: boolean;
}
/**
 * Get sensor configuration with defaults applied.
 */
export declare function getSensorConfig(config?: SensorConfig): SensorConfigResult;
//# sourceMappingURL=sensors.d.ts.map