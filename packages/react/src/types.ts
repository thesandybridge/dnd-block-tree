import type { ReactNode } from 'react'
import type { CollisionDetection } from '@dnd-kit/core'
import type {
  BaseBlock,
  BlockRendererProps as CoreBlockRendererProps,
  ContainerRendererProps as CoreContainerRendererProps,
  BlockRenderers as CoreBlockRenderers,
  InternalRenderers as CoreInternalRenderers,
  RendererPropsFor as CoreRendererPropsFor,
  BlockIndex,
  OrderingStrategy,
  BlockAddEvent,
  BlockDeleteEvent,
  CanDragFn,
  CanDropFn,
  IdGeneratorFn,
  SensorConfig,
  DropZoneConfig,
  AnimationConfig,
  AutoExpandConfig,
} from '@dnd-block-tree/core'

// ============================================================================
// React-bound type aliases (TNode = ReactNode)
// ============================================================================

export type BlockRendererProps<T extends BaseBlock = BaseBlock> = CoreBlockRendererProps<T, ReactNode>

export type ContainerRendererProps<T extends BaseBlock = BaseBlock> = CoreContainerRendererProps<T, ReactNode>

export type RendererPropsFor<
  T extends BaseBlock,
  K extends T['type'],
  C extends readonly string[]
> = CoreRendererPropsFor<T, K, C, ReactNode>

export type BlockRenderers<
  T extends BaseBlock = BaseBlock,
  C extends readonly string[] = readonly string[]
> = CoreBlockRenderers<T, C, ReactNode>

export type InternalRenderers<T extends BaseBlock = BaseBlock> = CoreInternalRenderers<T, ReactNode>

// ============================================================================
// React-specific types (not in core)
// ============================================================================

/**
 * Block state provider props
 */
export interface BlockStateProviderProps<T extends BaseBlock = BaseBlock> {
  children: ReactNode
  initialBlocks?: T[]
  containerTypes?: readonly string[]
  onChange?: (blocks: T[]) => void
  orderingStrategy?: OrderingStrategy
  maxDepth?: number
  onBlockAdd?: (event: BlockAddEvent<T>) => void
  onBlockDelete?: (event: BlockDeleteEvent<T>) => void
}

/**
 * Tree state provider props
 */
export interface TreeStateProviderProps<T extends BaseBlock = BaseBlock> {
  children: ReactNode
  blocks: T[]
  blockMap: Map<string, T>
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
 * Full customization options for BlockTree (React version).
 * Uses dnd-kit's CollisionDetection instead of core's CoreCollisionDetection.
 */
export interface BlockTreeCustomization<T extends BaseBlock = BaseBlock> {
  canDrag?: CanDragFn<T>
  canDrop?: CanDropFn<T>
  collisionDetection?: CollisionDetection
  sensors?: SensorConfig
  dropZones?: DropZoneConfig
  animation?: AnimationConfig
  autoExpand?: AutoExpandConfig
  idGenerator?: IdGeneratorFn
  initialExpanded?: string[] | 'all' | 'none'
  orderingStrategy?: OrderingStrategy
  maxDepth?: number
}
