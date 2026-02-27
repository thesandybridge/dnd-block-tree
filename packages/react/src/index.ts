// ============================================================================
// Re-export core types (excluding ones overridden by React-bound versions)
// ============================================================================

export type {
  BaseBlock,
  BlockIndex,
  BlockAction,
  DragOverlayProps as CoreDragOverlayProps,
  BlockTreeConfig,
  BlockStateContextValue,
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
  // Customization types (core versions with CoreCollisionDetection)
  CanDragFn,
  CanDropFn,
  IdGeneratorFn,
  SensorConfig,
  DropZoneConfig,
  AnimationConfig,
  AutoExpandConfig,
  BlockTreeCustomization as CoreBlockTreeCustomization,
  OrderingStrategy,
  // Collision types
  Rect,
  CollisionCandidate,
  CollisionResult,
  CoreCollisionDetection,
  SnapshotRectsRef,
  // Reducer types
  ExpandAction,
  HistoryState,
  HistoryAction,
  // Tree factory types
  BlockTreeOptions,
  BlockTreeEvents,
  BlockTreeInstance,
  // Util types
  TreeValidationResult,
  NestedBlock,
  // Merge types
  MergeBlockVersionsOptions,
} from '@dnd-block-tree/core'

// Re-export core functions
export {
  getDropZoneType,
  extractBlockId,
  // Collision
  weightedVerticalCollision,
  closestCenterCollision,
  createStickyCollision,
  // Event emitter
  EventEmitter,
  // Reducers
  blockReducer,
  expandReducer,
  historyReducer,
  // Tree factory
  createBlockTree,
  // Utils
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
  validateBlockTree,
  extractUUID,
  debounce,
  generateId,
  // Serialization
  flatToNested,
  nestedToFlat,
  // Fractional indexing
  generateKeyBetween,
  generateNKeysBetween,
  generateInitialKeys,
  initFractionalOrder,
  compareFractionalKeys,
  // Merge
  mergeBlockVersions,
} from '@dnd-block-tree/core'

// ============================================================================
// React-bound type aliases and React-specific types
// ============================================================================

export type {
  BlockRendererProps,
  ContainerRendererProps,
  RendererPropsFor,
  BlockRenderers,
  InternalRenderers,
  BlockStateProviderProps,
  TreeStateProviderProps,
  TreeStateContextValue,
  BlockTreeCustomization,
} from './types'

// ============================================================================
// Bridge
// ============================================================================

export { adaptCollisionDetection } from './bridge'

// ============================================================================
// Utils
// ============================================================================

export { triggerHaptic } from './utils/haptic'

// ============================================================================
// Sensors
// ============================================================================

export { useConfiguredSensors, getSensorConfig } from './hooks/useConfiguredSensors'
export type { SensorConfigResult } from './hooks/useConfiguredSensors'

// ============================================================================
// Components
// ============================================================================

export { BlockTree } from './components/BlockTree'
export type { BlockTreeProps } from './components/BlockTree'

export { TreeRenderer } from './components/TreeRenderer'
export type { TreeRendererProps } from './components/TreeRenderer'

export { DropZone } from './components/DropZone'
export type { DropZoneProps } from './components/DropZone'

export { DragOverlay } from './components/DragOverlay'
export type { DragOverlayProps } from './components/DragOverlay'

export { BlockTreeSSR } from './components/BlockTreeSSR'
export type { BlockTreeSSRProps } from './components/BlockTreeSSR'

// ============================================================================
// Hooks
// ============================================================================

export { createBlockState } from './hooks/useBlockState'
export { createTreeState } from './hooks/useTreeState'
export { useBlockHistory } from './hooks/useBlockHistory'
export type { UseBlockHistoryOptions, UseBlockHistoryResult } from './hooks/useBlockHistory'

export { useDeferredSync } from './hooks/useDeferredSync'
export type { UseDeferredSyncOptions, UseDeferredSyncResult } from './hooks/useDeferredSync'

export { useLayoutAnimation } from './hooks/useLayoutAnimation'
export type { UseLayoutAnimationOptions } from './hooks/useLayoutAnimation'

export { useVirtualTree } from './hooks/useVirtualTree'
export type { UseVirtualTreeOptions, UseVirtualTreeResult } from './hooks/useVirtualTree'

// ============================================================================
// DevTools
// ============================================================================

export { BlockTreeDevTools, useDevToolsCallbacks } from './components/BlockTreeDevTools'
export type { BlockTreeDevToolsProps, DevToolsCallbacks, DevToolsEventEntry } from './components/BlockTreeDevTools'
