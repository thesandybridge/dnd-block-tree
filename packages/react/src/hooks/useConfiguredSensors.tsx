'use client'

import {
  useSensor,
  useSensors,
  PointerSensor,
  TouchSensor,
  KeyboardSensor,
  type PointerActivationConstraint,
} from '@dnd-kit/core'
import type { SensorConfig } from '@dnd-block-tree/core'

const DEFAULT_ACTIVATION_DISTANCE = 8

export interface SensorConfigResult {
  pointer: { activationConstraint: PointerActivationConstraint }
  touch: { activationConstraint: PointerActivationConstraint }
}

export function useConfiguredSensors(config: SensorConfig = {}) {
  const {
    activationDistance = DEFAULT_ACTIVATION_DISTANCE,
    activationDelay,
    tolerance,
  } = config

  let pointerConstraint: PointerActivationConstraint
  let touchConstraint: PointerActivationConstraint

  if (activationDelay !== undefined) {
    pointerConstraint = {
      delay: activationDelay,
      tolerance: tolerance ?? 5,
    }
    touchConstraint = pointerConstraint
  } else {
    pointerConstraint = {
      distance: activationDistance,
    }
    touchConstraint = {
      delay: config.longPressDelay ?? 200,
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
