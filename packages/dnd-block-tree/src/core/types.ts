import type { ReactNode } from 'react'
import type { UniqueIdentifier, CollisionDetection } from '@dnd-kit/core'

/**
 * Base block interface - extend this for your custom block types
 */
export interface BaseBlock {
  id: string
  type: string
  parentId: string | null
  order: number
}

/**
 * Normalized index structure for efficient tree operations
 */
export interface BlockIndex<T extends BaseBlock = BaseBlock> {
  byId: Map<string, T>
  byParent: Map<string | null, string[]>
}

/**
 * Props passed to non-container block renderers
 */
export interface BlockRendererProps<T extends BaseBlock = BaseBlock> {
  block: T
  children?: ReactNode
  isDragging?: boolean
  isOver?: boolean
  depth: number
}

/**
 * Props passed to container block renderers (blocks that can have children)
 */
export interface ContainerRendererProps<T extends BaseBlock = BaseBlock>
  extends BlockRendererProps<T> {
  children: ReactNode
  isExpanded: boolean
  onToggleExpand: () => void
}

/**
 * Get the appropriate props type for a renderer based on whether it's a container type
 */
export type RendererPropsFor<
  T extends BaseBlock,
  K extends T['type'],
  C extends readonly string[]
> = K extends C[number]
  ? ContainerRendererProps<T & { type: K }>
  : BlockRendererProps<T & { type: K }>

/**
 * Map of block types to their renderers with automatic container detection
 */
export type BlockRenderers<
  T extends BaseBlock = BaseBlock,
  C extends readonly string[] = readonly string[]
> = {
  [K in T['type']]: (props: RendererPropsFor<T, K, C>) => ReactNode
}

/**
 * Internal renderer type used by TreeRenderer (less strict for flexibility)
 */
export type InternalRenderers<T extends BaseBlock = BaseBlock> = {
  [K in T['type']]: (props: BlockRendererProps<T> | ContainerRendererProps<T>) => ReactNode
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
  /** Called after a block is moved to a new position */
  onBlockMove?: (event: BlockMoveEvent<T>) => void
  /** Called when expand/collapse state changes */
  onExpandChange?: (event: ExpandChangeEvent<T>) => void
  /** Called when hover zone changes during drag */
  onHoverChange?: (event: HoverChangeEvent<T>) => void
}

// ============================================================================
// Customization Types
// ============================================================================

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
  collisionDetection?: CollisionDetection
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
  | { type: 'MOVE_ITEM'; payload: { activeId: UniqueIdentifier; targetZone: string } }
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
  moveItem: (activeId: UniqueIdentifier, targetZone: string) => void
  setAll: (blocks: T[]) => void
}

/**
 * Tree state context value (UI state)
 */
export interface TreeStateContextValue<T extends BaseBlock = BaseBlock> {
  activeId: string | null
  activeBlock: T | null
  hoverZone: string | null
  expandedMap: Record<string, boolean>
  effectiveBlocks: T[]
  blocksByParent: Map<string | null, T[]>
  setActiveId: (id: string | null) => void
  setHoverZone: (zone: string | null) => void
  toggleExpand: (id: string) => void
  setExpandAll: (expanded: boolean) => void
  handleHover: (zoneId: string, parentId: string | null) => void
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

/**
 * Block state provider props
 */
export interface BlockStateProviderProps<T extends BaseBlock = BaseBlock> {
  children: ReactNode
  initialBlocks?: T[]
  containerTypes?: readonly string[]
  onChange?: (blocks: T[]) => void
}

/**
 * Tree state provider props
 */
export interface TreeStateProviderProps<T extends BaseBlock = BaseBlock> {
  children: ReactNode
  blocks: T[]
  blockMap: Map<string, T>
}
