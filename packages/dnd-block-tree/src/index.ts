// Core types
export type {
  BaseBlock,
  BlockIndex,
  BlockRenderers,
  BlockRendererProps,
  ContainerRendererProps,
  RendererPropsFor,
  BlockAction,
  DragOverlayProps,
  BlockTreeConfig,
  BlockStateContextValue,
  TreeStateContextValue,
  BlockStateProviderProps,
  TreeStateProviderProps,
  DropZoneType,
  // Event types
  BlockPosition,
  DragStartEvent,
  DragMoveEvent,
  DragEndEvent,
  BlockMoveEvent,
  BlockAddEvent,
  BlockDeleteEvent,
  MoveOperation,
  ExpandChangeEvent,
  HoverChangeEvent,
  // Callback types
  BlockTreeCallbacks,
  // Customization types
  CanDragFn,
  CanDropFn,
  IdGeneratorFn,
  SensorConfig,
  DropZoneConfig,
  AnimationConfig,
  AutoExpandConfig,
  BlockTreeCustomization,
  OrderingStrategy,
  InternalRenderers,
} from './core/types'

export { getDropZoneType, extractBlockId } from './core/types'

// Collision detection
export { weightedVerticalCollision, closestCenterCollision, createStickyCollision } from './core/collision'

// Sensors
export { useConfiguredSensors, getSensorConfig } from './core/sensors'

// Components
export { BlockTree } from './components/BlockTree'
export type { BlockTreeProps } from './components/BlockTree'

export { TreeRenderer } from './components/TreeRenderer'
export type { TreeRendererProps } from './components/TreeRenderer'

export { DropZone } from './components/DropZone'
export type { DropZoneProps } from './components/DropZone'

export { DragOverlay } from './components/DragOverlay'

// Hooks
export { createBlockState } from './hooks/useBlockState'
export { createTreeState } from './hooks/useTreeState'
export { useBlockHistory } from './hooks/useBlockHistory'
export type { UseBlockHistoryOptions, UseBlockHistoryResult } from './hooks/useBlockHistory'

// Utils
export {
  cloneMap,
  cloneParentMap,
  computeNormalizedIndex,
  buildOrderedBlocks,
  reparentBlockIndex,
  getDescendantIds,
  deleteBlockAndDescendants,
  getBlockDepth,
  getSubtreeDepth,
  reparentMultipleBlocks,
} from './utils/blocks'

export { extractUUID, debounce, generateId } from './utils/helper'

// Fractional indexing
export {
  generateKeyBetween,
  generateNKeysBetween,
  generateInitialKeys,
  initFractionalOrder,
  compareFractionalKeys,
} from './utils/fractional'
