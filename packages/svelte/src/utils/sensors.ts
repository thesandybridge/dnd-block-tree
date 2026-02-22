import type { SensorConfig } from '@dnd-block-tree/core'

export interface SensorConfigResult {
  activationDistance: number
  longPressDelay: number
  hapticFeedback: boolean
}

/**
 * Get sensor configuration with defaults applied.
 */
export function getSensorConfig(config?: SensorConfig): SensorConfigResult {
  return {
    activationDistance: config?.activationDistance ?? 8,
    longPressDelay: config?.longPressDelay ?? 200,
    hapticFeedback: config?.hapticFeedback ?? false,
  }
}
