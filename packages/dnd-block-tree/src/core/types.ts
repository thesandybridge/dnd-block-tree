import type { ReactNode } from 'react'
import type { UniqueIdentifier } from '@dnd-kit/core'

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
 *
 * @example
 * type SectionProps = RendererPropsFor<MyBlock, 'section', typeof CONTAINER_TYPES>
 * // If CONTAINER_TYPES includes 'section', this is ContainerRendererProps
 * // Otherwise, it's BlockRendererProps
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
 *
 * @example
 * const CONTAINER_TYPES = ['section'] as const
 *
 * const renderers: BlockRenderers<MyBlock, typeof CONTAINER_TYPES> = {
 *   section: (props) => <Section {...props} />,  // props includes isExpanded, onToggleExpand
 *   task: (props) => <Task {...props} />,        // props is BlockRendererProps
 * }
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

/**
 * Block action types for the reducer
 */
export type BlockAction<T extends BaseBlock> =
  | { type: 'ADD_ITEM'; payload: T }
  | { type: 'DELETE_ITEM'; payload: { id: string } }
  | { type: 'SET_ALL'; payload: T[] }
  | { type: 'MOVE_ITEM'; payload: { activeId: UniqueIdentifier; targetZone: string } }
  | { type: 'INSERT_ITEM'; payload: { item: T; parentId: string | null; index: number } }

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
