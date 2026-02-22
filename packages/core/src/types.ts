import type { CoreCollisionDetection } from './collision'

/**
 * Base block interface - extend this for your custom block types
 */
export interface BaseBlock {
  id: string
  type: string
  parentId: string | null
  /** Ordering value. Number for integer ordering (default), string for fractional ordering. */
  order: number | string
}

/**
 * Normalized index structure for efficient tree operations
 */
export interface BlockIndex<T extends BaseBlock = BaseBlock> {
  byId: Map<string, T>
  byParent: Map<string | null, string[]>
}

/**
 * Props passed to non-container block renderers.
 * TNode is the framework's node type (e.g. ReactNode for React).
 */
export interface BlockRendererProps<T extends BaseBlock = BaseBlock, TNode = unknown> {
  block: T
  children?: TNode
  isDragging?: boolean
  isOver?: boolean
  depth: number
}

/**
 * Props passed to container block renderers (blocks that can have children).
 * TNode is the framework's node type (e.g. ReactNode for React).
 */
export interface ContainerRendererProps<T extends BaseBlock = BaseBlock, TNode = unknown>
  extends BlockRendererProps<T, TNode> {
  children: TNode
  isExpanded: boolean
  onToggleExpand: () => void
}

/**
 * Get the appropriate props type for a renderer based on whether it's a container type
 */
export type RendererPropsFor<
  T extends BaseBlock,
  K extends T['type'],
  C extends readonly string[],
  TNode = unknown
> = K extends C[number]
  ? ContainerRendererProps<T & { type: K }, TNode>
  : BlockRendererProps<T & { type: K }, TNode>

/**
 * Map of block types to their renderers with automatic container detection
 */
export type BlockRenderers<
  T extends BaseBlock = BaseBlock,
  C extends readonly string[] = readonly string[],
  TNode = unknown
> = {
  [K in T['type']]: (props: RendererPropsFor<T, K, C, TNode>) => TNode
}

/**
 * Internal renderer type used by TreeRenderer (less strict for flexibility)
 */
export type InternalRenderers<T extends BaseBlock = BaseBlock, TNode = unknown> = {
  [K in T['type']]: (props: BlockRendererProps<T, TNode> | ContainerRendererProps<T, TNode>) => TNode
}

// ============================================================================
// Event Types for Callbacks
// ============================================================================

/**
 * Position info for a block
 */
export interface BlockPosition {
  parentId: string | null
  index: number
}

/**
 * Event fired when drag starts
 */
export interface DragStartEvent<T extends BaseBlock = BaseBlock> {
  block: T
  blockId: string
}

/**
 * Event fired during drag movement
 */
export interface DragMoveEvent<T extends BaseBlock = BaseBlock> {
  block: T
  blockId: string
  /** Current hover zone ID, if any */
  overZone: string | null
  /** Pointer coordinates */
  coordinates: { x: number; y: number }
}

/**
 * Event fired when drag ends
 */
export interface DragEndEvent<T extends BaseBlock = BaseBlock> {
  block: T
  blockId: string
  /** Target zone where block was dropped */
  targetZone: string | null
  /** Whether the drag was cancelled */
  cancelled: boolean
}

/**
 * Event fired when a block is moved
 */
export interface BlockMoveEvent<T extends BaseBlock = BaseBlock> {
  block: T
  from: BlockPosition
  to: BlockPosition
  /** All blocks after the move */
  blocks: T[]
  /** IDs of all blocks that were moved (for multi-select) */
  movedIds: string[]
}

/**
 * A pending move operation passed through the onBeforeMove middleware pipeline.
 * Return a modified operation to transform the move, or return false to cancel.
 */
export interface MoveOperation<T extends BaseBlock = BaseBlock> {
  /** The block being moved */
  block: T
  /** Position before the move */
  from: BlockPosition
  /** Target drop zone ID */
  targetZone: string
}

/**
 * Event fired when expand state changes
 */
export interface ExpandChangeEvent<T extends BaseBlock = BaseBlock> {
  block: T
  blockId: string
  expanded: boolean
}

/**
 * Event fired when a block is added
 */
export interface BlockAddEvent<T extends BaseBlock = BaseBlock> {
  block: T
  parentId: string | null
  index: number
}

/**
 * Event fired when a block (and optionally its descendants) is deleted
 */
export interface BlockDeleteEvent<T extends BaseBlock = BaseBlock> {
  block: T
  deletedIds: string[]
  parentId: string | null
}

/**
 * Event fired when hover zone changes
 */
export interface HoverChangeEvent<T extends BaseBlock = BaseBlock> {
  zoneId: string | null
  zoneType: DropZoneType | null
  /** Block being hovered over (if any) */
  targetBlock: T | null
}

// ============================================================================
// Callback Types
// ============================================================================

/**
 * All available callback handlers for BlockTree
 */
export interface BlockTreeCallbacks<T extends BaseBlock = BaseBlock> {
  /** Called when drag starts. Return false to prevent drag. */
  onDragStart?: (event: DragStartEvent<T>) => boolean | void
  /** Called during drag movement (debounced) */
  onDragMove?: (event: DragMoveEvent<T>) => void
  /** Called when drag ends (success or cancel) */
  onDragEnd?: (event: DragEndEvent<T>) => void
  /** Called when drag is cancelled */
  onDragCancel?: (event: DragEndEvent<T>) => void
  /**
   * Called before a block move is committed. Return a modified MoveOperation to
   * transform the move (e.g. change the target zone), or return false to cancel.
   * Return void / undefined to allow the move as-is.
   */
  onBeforeMove?: (operation: MoveOperation<T>) => MoveOperation<T> | false | void
  /** Called after a block is moved to a new position */
  onBlockMove?: (event: BlockMoveEvent<T>) => void
  /** Called when expand/collapse state changes */
  onExpandChange?: (event: ExpandChangeEvent<T>) => void
  /** Called when hover zone changes during drag */
  onHoverChange?: (event: HoverChangeEvent<T>) => void
  /** Called after a block is added */
  onBlockAdd?: (event: BlockAddEvent<T>) => void
  /** Called after a block (and its descendants) is deleted */
  onBlockDelete?: (event: BlockDeleteEvent<T>) => void
}

// ============================================================================
// Customization Types
// ============================================================================

/**
 * Ordering strategy for block siblings.
 *
 * - `'integer'` (default): siblings are reindexed 0, 1, 2, ... after every move.
 *   Simple and efficient; not suitable for collaborative/CRDT scenarios.
 * - `'fractional'`: each move only updates the moved block's `order` with a
 *   lexicographically sortable string key (fractional index). Siblings are never
 *   reindexed, making it conflict-free for concurrent edits.
 */
export type OrderingStrategy = 'integer' | 'fractional'

/**
 * Filter function to determine if a block can be dragged
 */
export type CanDragFn<T extends BaseBlock = BaseBlock> = (block: T) => boolean

/**
 * Filter function to determine if a block can be dropped at a location
 */
export type CanDropFn<T extends BaseBlock = BaseBlock> = (
  draggedBlock: T,
  targetZone: string,
  targetBlock: T | null
) => boolean

/**
 * Custom ID generator function
 */
export type IdGeneratorFn = () => string

/**
 * Sensor configuration
 */
export interface SensorConfig {
  activationDistance?: number
  activationDelay?: number
  tolerance?: number
  /** Override the default long-press delay (200ms) for touch sensors */
  longPressDelay?: number
  /** Trigger haptic feedback (vibration) on drag start for touch devices */
  hapticFeedback?: boolean
}

/**
 * Drop zone configuration
 */
export interface DropZoneConfig {
  /** Height of drop zones in pixels */
  height?: number
  /** Gap between drop zones */
  gap?: number
  /** Show drop zones inside empty containers */
  showInEmptyContainers?: boolean
}

/**
 * Animation configuration
 */
export interface AnimationConfig {
  /** Duration for expand/collapse animations in ms */
  expandDuration?: number
  /** Duration for drag overlay animation in ms */
  dragOverlayDuration?: number
  /** Easing function (CSS timing function) */
  easing?: string
}

/**
 * Auto-expand configuration for containers during drag
 */
export interface AutoExpandConfig {
  /** Enable auto-expand on hover */
  enabled?: boolean
  /** Delay before expanding in ms */
  delay?: number
  /** Auto-collapse when leaving */
  collapseOnLeave?: boolean
}

/**
 * Full customization options for BlockTree
 */
export interface BlockTreeCustomization<T extends BaseBlock = BaseBlock> {
  /** Filter which blocks can be dragged */
  canDrag?: CanDragFn<T>
  /** Filter valid drop targets */
  canDrop?: CanDropFn<T>
  /** Custom collision detection algorithm */
  collisionDetection?: CoreCollisionDetection
  /** Sensor configuration */
  sensors?: SensorConfig
  /** Drop zone configuration */
  dropZones?: DropZoneConfig
  /** Animation configuration */
  animation?: AnimationConfig
  /** Auto-expand containers during drag */
  autoExpand?: AutoExpandConfig
  /** Custom ID generator */
  idGenerator?: IdGeneratorFn
  /** Initially expanded block IDs */
  initialExpanded?: string[] | 'all' | 'none'
  /**
   * Ordering strategy for block siblings.
   * Defaults to `'integer'` (reindex all siblings on every move).
   * Use `'fractional'` for CRDT-compatible collaborative editing.
   */
  orderingStrategy?: OrderingStrategy
  /** Maximum nesting depth (1 = flat list, 2 = one level of nesting, etc.) */
  maxDepth?: number
}

// ============================================================================
// Action Types
// ============================================================================

/**
 * Block action types for the reducer
 */
export type BlockAction<T extends BaseBlock> =
  | { type: 'ADD_ITEM'; payload: T }
  | { type: 'DELETE_ITEM'; payload: { id: string } }
  | { type: 'SET_ALL'; payload: T[] }
  | { type: 'MOVE_ITEM'; payload: { activeId: string; targetZone: string } }
  | { type: 'INSERT_ITEM'; payload: { item: T; parentId: string | null; index: number } }

// ============================================================================
// Component Props Types
// ============================================================================

/**
 * Drag overlay renderer
 */
export interface DragOverlayProps<T extends BaseBlock = BaseBlock> {
  block: T
}

/**
 * BlockTree configuration options
 */
export interface BlockTreeConfig {
  activationDistance?: number
  previewDebounce?: number
  dropZoneHeight?: number
}

/**
 * Block state context value
 */
export interface BlockStateContextValue<T extends BaseBlock = BaseBlock> {
  blocks: T[]
  blockMap: Map<string, T>
  childrenMap: Map<string | null, T[]>
  indexMap: Map<string, number>
  normalizedIndex: BlockIndex<T>
  createItem: (type: T['type'], parentId?: string | null) => T
  insertItem: (type: T['type'], referenceId: string, position: 'before' | 'after') => T
  deleteItem: (id: string) => void
  moveItem: (activeId: string, targetZone: string) => void
  setAll: (blocks: T[]) => void
}

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Drop zone types
 */
export type DropZoneType = 'before' | 'after' | 'into'

/**
 * Extract zone type from zone ID
 */
export function getDropZoneType(zoneId: string): DropZoneType {
  if (zoneId.startsWith('before-')) return 'before'
  if (zoneId.startsWith('into-')) return 'into'
  return 'after'
}

/**
 * Extract block ID from zone ID
 */
export function extractBlockId(zoneId: string): string {
  return zoneId.replace(/^(before|after|into)-/, '')
}
