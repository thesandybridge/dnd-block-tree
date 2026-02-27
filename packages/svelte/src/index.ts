// Re-export core types
export type {
  BaseBlock,
  BlockIndex,
  BlockAction,
  BlockTreeConfig,
  BlockStateContextValue,
  DropZoneType,
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
  BlockTreeCallbacks,
  CanDragFn,
  CanDropFn,
  IdGeneratorFn,
  SensorConfig,
  DropZoneConfig,
  AnimationConfig,
  AutoExpandConfig,
  BlockTreeCustomization as CoreBlockTreeCustomization,
  OrderingStrategy,
  Rect,
  CollisionCandidate,
  CollisionResult,
  CoreCollisionDetection,
  SnapshotRectsRef,
  ExpandAction,
  HistoryState,
  HistoryAction,
  BlockTreeOptions,
  BlockTreeEvents,
  BlockTreeInstance,
  TreeValidationResult,
  NestedBlock,
  MergeBlockVersionsOptions,
} from '@dnd-block-tree/core'

// Re-export core functions
export {
  getDropZoneType,
  extractBlockId,
  weightedVerticalCollision,
  closestCenterCollision,
  createStickyCollision,
  EventEmitter,
  blockReducer,
  expandReducer,
  historyReducer,
  createBlockTree,
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
  flatToNested,
  nestedToFlat,
  generateKeyBetween,
  generateNKeysBetween,
  generateInitialKeys,
  initFractionalOrder,
  compareFractionalKeys,
  mergeBlockVersions,
} from '@dnd-block-tree/core'

// Svelte-specific types
export type {
  BlockRendererProps,
  ContainerRendererProps,
  RendererPropsFor,
  BlockRenderers,
  InternalRenderers,
  BlockStateOptions,
  TreeStateContextValue,
  BlockTreeCustomization,
} from './types'

// Bridge
export { adaptCollisionDetection } from './bridge'

// Utils
export { triggerHaptic } from './utils/haptic'
export { getSensorConfig } from './utils/sensors'
export type { SensorConfigResult } from './utils/sensors'

// State (rune-based .svelte.ts modules)
export {
  createBlockState,
  setBlockStateContext,
  getBlockStateContext,
} from './state/block-state.svelte'
export type { BlockState } from './state/block-state.svelte'

export {
  createTreeState,
  setTreeStateContext,
  getTreeStateContext,
} from './state/tree-state.svelte'
export type { TreeState, TreeStateOptions } from './state/tree-state.svelte'

export { createBlockHistory } from './state/block-history.svelte'
export type { BlockHistoryOptions, BlockHistoryState } from './state/block-history.svelte'

export { createDeferredSync } from './state/deferred-sync.svelte'
export type { DeferredSyncOptions, DeferredSyncState } from './state/deferred-sync.svelte'

// Components
export { default as BlockTree } from './components/BlockTree.svelte'
export { default as TreeRenderer } from './components/TreeRenderer.svelte'
export { default as DropZone } from './components/DropZone.svelte'
export { default as DraggableBlock } from './components/DraggableBlock.svelte'
export { default as DragOverlay } from './components/DragOverlay.svelte'
export { default as GhostPreview } from './components/GhostPreview.svelte'
export { default as BlockTreeSSR } from './components/BlockTreeSSR.svelte'
export { default as BlockTreeDevTools } from './components/BlockTreeDevTools.svelte'
