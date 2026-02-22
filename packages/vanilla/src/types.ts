import type {
  BaseBlock,
  BlockIndex,
  BlockTreeCallbacks,
  BlockTreeCustomization as CoreBlockTreeCustomization,
  BlockRendererProps as CoreBlockRendererProps,
  ContainerRendererProps as CoreContainerRendererProps,
  BlockRenderers as CoreBlockRenderers,
  InternalRenderers as CoreInternalRenderers,
  RendererPropsFor as CoreRendererPropsFor,
  Rect,
  OrderingStrategy,
  CanDragFn,
  CanDropFn,
  IdGeneratorFn,
  SensorConfig,
  DropZoneConfig,
  AnimationConfig,
  AutoExpandConfig,
  HistoryState,
} from '@dnd-block-tree/core'

// Vanilla TNode = HTMLElement
export type BlockRendererProps<T extends BaseBlock = BaseBlock> = CoreBlockRendererProps<T, HTMLElement>
export type ContainerRendererProps<T extends BaseBlock = BaseBlock> = CoreContainerRendererProps<T, HTMLElement>
export type RendererPropsFor<
  T extends BaseBlock,
  K extends T['type'],
  C extends readonly string[]
> = CoreRendererPropsFor<T, K, C, HTMLElement>
export type BlockRenderers<
  T extends BaseBlock = BaseBlock,
  C extends readonly string[] = readonly string[]
> = CoreBlockRenderers<T, C, HTMLElement>
export type InternalRenderers<T extends BaseBlock = BaseBlock> = CoreInternalRenderers<T, HTMLElement>

/** Controller configuration */
export interface BlockTreeControllerOptions<T extends BaseBlock = BaseBlock> {
  initialBlocks?: T[]
  containerTypes?: readonly string[]
  orderingStrategy?: OrderingStrategy
  maxDepth?: number
  previewDebounce?: number
  canDrag?: CanDragFn<T>
  canDrop?: CanDropFn<T>
  idGenerator?: IdGeneratorFn
  initialExpanded?: string[] | 'all' | 'none'
  sensors?: VanillaSensorConfig
  onChange?: (blocks: T[]) => void
  callbacks?: Partial<BlockTreeCallbacks<T>>
}

/** Vanilla sensor configuration */
export interface VanillaSensorConfig extends SensorConfig {
  /** Enable pointer sensor (default: true) */
  pointer?: boolean
  /** Enable touch sensor (default: true) */
  touch?: boolean
  /** Enable keyboard sensor (default: false) */
  keyboard?: boolean
}

/** Drag state exposed to consumers */
export interface DragState {
  isDragging: boolean
  activeId: string | null
  hoverZone: string | null
}

/** Controller event types */
export interface ControllerEvents<T extends BaseBlock = BaseBlock> {
  render: (blocks: T[], expandedMap: Record<string, boolean>) => void
  'drag:statechange': (state: DragState) => void
  'selection:change': (selectedIds: Set<string>) => void
}

/** Render context passed to renderBlock in DefaultRenderer */
export interface RenderBlockContext {
  children: HTMLElement | null
  depth: number
  isExpanded: boolean
  isDragging: boolean
  isSelected: boolean
  onToggleExpand: (() => void) | null
}

/** DefaultRenderer options */
export interface DefaultRendererOptions<T extends BaseBlock = BaseBlock> {
  container: HTMLElement
  renderBlock: (block: T, ctx: RenderBlockContext) => HTMLElement
  dropZoneHeight?: number
  animateExpand?: boolean
}

/** Cleanup function */
export type Unsubscribe = () => void

/** Disposable resource */
export interface Disposable {
  dispose(): void
}
