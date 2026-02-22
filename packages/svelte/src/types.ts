import type {
  BaseBlock,
  BlockIndex,
  BlockTreeCallbacks,
  BlockRendererProps as CoreBlockRendererProps,
  ContainerRendererProps as CoreContainerRendererProps,
  BlockRenderers as CoreBlockRenderers,
  InternalRenderers as CoreInternalRenderers,
  RendererPropsFor as CoreRendererPropsFor,
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
  CoreCollisionDetection,
} from '@dnd-block-tree/core'
import type { Snippet } from 'svelte'

// Svelte TNode = Snippet
export type BlockRendererProps<T extends BaseBlock = BaseBlock> = CoreBlockRendererProps<T, Snippet>
export type ContainerRendererProps<T extends BaseBlock = BaseBlock> = CoreContainerRendererProps<T, Snippet>
export type RendererPropsFor<
  T extends BaseBlock,
  K extends T['type'],
  C extends readonly string[]
> = CoreRendererPropsFor<T, K, C, Snippet>
export type BlockRenderers<
  T extends BaseBlock = BaseBlock,
  C extends readonly string[] = readonly string[]
> = CoreBlockRenderers<T, C, Snippet>
export type InternalRenderers<T extends BaseBlock = BaseBlock> = CoreInternalRenderers<T, Snippet>

/** Block state provider options */
export interface BlockStateOptions<T extends BaseBlock = BaseBlock> {
  initialBlocks?: T[]
  containerTypes?: readonly string[]
  onChange?: (blocks: T[]) => void
  orderingStrategy?: OrderingStrategy
  maxDepth?: number
  onBlockAdd?: (event: BlockAddEvent<T>) => void
  onBlockDelete?: (event: BlockDeleteEvent<T>) => void
}

/** Tree state context value (UI state) */
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

/** Full customization options for BlockTree (Svelte version) */
export interface BlockTreeCustomization<T extends BaseBlock = BaseBlock> {
  canDrag?: CanDragFn<T>
  canDrop?: CanDropFn<T>
  collisionDetection?: CoreCollisionDetection
  sensors?: SensorConfig
  dropZones?: DropZoneConfig
  animation?: AnimationConfig
  autoExpand?: AutoExpandConfig
  idGenerator?: IdGeneratorFn
  initialExpanded?: string[] | 'all' | 'none'
  orderingStrategy?: OrderingStrategy
  maxDepth?: number
}
