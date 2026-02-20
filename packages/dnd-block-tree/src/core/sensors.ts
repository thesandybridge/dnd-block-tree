import {
  useSensor,
  useSensors,
  PointerSensor,
  TouchSensor,
  KeyboardSensor,
  type PointerActivationConstraint,
} from '@dnd-kit/core'
import type { SensorConfig } from './types'

const DEFAULT_ACTIVATION_DISTANCE = 8

/**
 * Return type for getSensorConfig
 */
export interface SensorConfigResult {
  pointer: { activationConstraint: PointerActivationConstraint }
  touch: { activationConstraint: PointerActivationConstraint }
}

/**
 * Create configured sensors with activation constraints.
 * The activation distance prevents accidental drags while still allowing clicks.
 *
 * @param config - Sensor configuration
 * @returns Configured sensors for DndContext
 */
export function useConfiguredSensors(config: SensorConfig = {}) {
  const {
    activationDistance = DEFAULT_ACTIVATION_DISTANCE,
    activationDelay,
    tolerance,
  } = config

  // Build activation constraint based on provided options
  let pointerConstraint: PointerActivationConstraint
  let touchConstraint: PointerActivationConstraint

  if (activationDelay !== undefined) {
    pointerConstraint = {
      delay: activationDelay,
      tolerance: tolerance ?? 5,
    }
    touchConstraint = pointerConstraint
  } else {
    // For pointer (mouse), use distance-based activation
    pointerConstraint = {
      distance: activationDistance,
    }
    // For touch, use delay-based activation to not interfere with scrolling
    touchConstraint = {
      delay: 200,
      tolerance: 5,
    }
  }

  return useSensors(
    useSensor(PointerSensor, {
      activationConstraint: pointerConstraint,
    }),
    useSensor(TouchSensor, {
      activationConstraint: touchConstraint,
    }),
    useSensor(KeyboardSensor)
  )
}

/**
 * Get sensor configuration for manual setup
 */
export function getSensorConfig(config: SensorConfig = {}): SensorConfigResult {
  const {
    activationDistance = DEFAULT_ACTIVATION_DISTANCE,
    activationDelay,
    tolerance,
  } = config

  let activationConstraint: PointerActivationConstraint

  if (activationDelay !== undefined) {
    activationConstraint = {
      delay: activationDelay,
      tolerance: tolerance ?? 5,
    }
  } else {
    activationConstraint = {
      distance: activationDistance,
    }
  }

  return {
    pointer: { activationConstraint },
    touch: { activationConstraint },
  }
}
