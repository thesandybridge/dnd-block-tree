// Re-export core types and functions
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
  BlockTreeCustomization,
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
} from '@dnd-block-tree/core'

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
} from '@dnd-block-tree/core'

// Vanilla-specific types
export type {
  BlockTreeControllerOptions,
  VanillaSensorConfig,
  DragState,
  ControllerEvents,
  RenderBlockContext,
  DefaultRendererOptions,
  Unsubscribe,
  Disposable,
  BlockRendererProps,
  ContainerRendererProps,
  RendererPropsFor,
  BlockRenderers,
  InternalRenderers,
} from './types'

// Controller (Layer 1)
export { createBlockTreeController } from './controller'
export type { BlockTreeController } from './controller'

// Collision bridge
export { measureDropZoneRects, buildCandidates, pointerToRect, detectCollision } from './collision-bridge'

// Overlay
export { DragOverlay } from './drag-overlay'
export type { DragOverlayOptions } from './drag-overlay'

// History
export { createBlockHistory } from './history'
export type { BlockHistory, BlockHistoryOptions } from './history'

// Layout animation
export { LayoutAnimation } from './layout-animation'
export type { LayoutAnimationOptions } from './layout-animation'

// Virtual scroller
export { VirtualScroller } from './virtual-scroller'
export type { VirtualScrollerOptions, VirtualRange } from './virtual-scroller'

// Sensors
export { PointerSensor } from './sensors/pointer-sensor'
export type { PointerSensorOptions } from './sensors/pointer-sensor'
export { TouchSensor } from './sensors/touch-sensor'
export type { TouchSensorOptions } from './sensors/touch-sensor'
export { KeyboardSensor } from './sensors/keyboard-sensor'
export type { KeyboardSensorCallbacks } from './sensors/keyboard-sensor'
export type { Sensor, SensorCallbacks } from './sensors/types'

// Renderer (Layer 2)
export { createDefaultRenderer } from './renderer/default-renderer'
export type { DefaultRenderer } from './renderer/default-renderer'
export { renderTree } from './renderer/tree-renderer'
export type { TreeRendererOptions } from './renderer/tree-renderer'
export { createDropZoneElement, setDropZoneActive } from './renderer/drop-zone'
export { createGhostPreview } from './renderer/ghost-preview'

// Utils
export { createElement, setDataAttributes, closestWithData } from './utils/dom'
export { triggerHaptic } from './utils/haptic'
export { createDisposable } from './utils/disposable'
