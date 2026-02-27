// Core types
export type {
  BaseBlock,
  BlockIndex,
  BlockRendererProps,
  ContainerRendererProps,
  RendererPropsFor,
  BlockRenderers,
  InternalRenderers,
  BlockAction,
  DragOverlayProps,
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
} from './types'

export { getDropZoneType, extractBlockId } from './types'

// Collision detection
export {
  weightedVerticalCollision,
  closestCenterCollision,
  createStickyCollision,
} from './collision'
export type {
  Rect,
  CollisionCandidate,
  CollisionResult,
  CoreCollisionDetection,
  SnapshotRectsRef,
} from './collision'

// Event emitter
export { EventEmitter } from './event-emitter'

// Reducers
export { blockReducer, expandReducer, historyReducer } from './reducers'
export type { ExpandAction, HistoryState, HistoryAction } from './reducers'

// Tree factory
export { createBlockTree } from './tree'
export type { BlockTreeOptions, BlockTreeEvents, BlockTreeInstance } from './tree'

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
  validateBlockTree,
} from './utils/blocks'
export type { TreeValidationResult } from './utils/blocks'

export { extractUUID, debounce, generateId } from './utils/helper'

// Serialization
export { flatToNested, nestedToFlat } from './utils/serialization'
export type { NestedBlock } from './utils/serialization'

// Fractional indexing
export {
  generateKeyBetween,
  generateNKeysBetween,
  generateInitialKeys,
  initFractionalOrder,
  compareFractionalKeys,
} from './utils/fractional'

// Merge
export { mergeBlockVersions } from './utils/merge'
export type { MergeBlockVersionsOptions } from './utils/merge'
