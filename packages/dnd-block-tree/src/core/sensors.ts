import {
  useSensor,
  useSensors,
  PointerSensor,
  TouchSensor,
  KeyboardSensor,
} from '@dnd-kit/core'

export interface SensorConfig {
  activationDistance?: number
}

const DEFAULT_ACTIVATION_DISTANCE = 8

/**
 * Create configured sensors with activation distance constraint.
 * The activation distance prevents accidental drags while still allowing clicks.
 *
 * @param config - Sensor configuration
 * @returns Configured sensors for DndContext
 */
export function useConfiguredSensors(config: SensorConfig = {}) {
  const { activationDistance = DEFAULT_ACTIVATION_DISTANCE } = config

  return useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: activationDistance,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        distance: activationDistance,
      },
    }),
    useSensor(KeyboardSensor)
  )
}

/**
 * Get sensor configuration for manual setup
 */
export function getSensorConfig(activationDistance = DEFAULT_ACTIVATION_DISTANCE) {
  return {
    pointer: {
      activationConstraint: {
        distance: activationDistance,
      },
    },
    touch: {
      activationConstraint: {
        distance: activationDistance,
      },
    },
  }
}
