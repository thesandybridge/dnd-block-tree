import type { OrderingStrategy } from '@dnd-block-tree/react'

export interface BaseSettings {
  showDropPreview: boolean
  activationDistance: number
  previewDebounce: number
  multiSelect: boolean
  orderingStrategy: OrderingStrategy
  maxDepth: number
  initialExpanded: 'all' | 'none'
  keyboardNavigation: boolean
  expandDuration: number
  easing: string
  longPressDelay: number
  tolerance: number
  hapticFeedback: boolean
}

export interface ProductivitySettings extends BaseSettings {
  lockCompletedTasks: boolean
}

export const DEFAULT_SETTINGS: BaseSettings = {
  showDropPreview: true,
  activationDistance: 8,
  previewDebounce: 150,
  multiSelect: false,
  orderingStrategy: 'integer',
  maxDepth: 0,
  initialExpanded: 'all',
  keyboardNavigation: false,
  expandDuration: 0,
  easing: 'ease',
  longPressDelay: 200,
  tolerance: 5,
  hapticFeedback: false,
}

export const DEFAULT_PRODUCTIVITY_SETTINGS: ProductivitySettings = {
  ...DEFAULT_SETTINGS,
  lockCompletedTasks: false,
}
