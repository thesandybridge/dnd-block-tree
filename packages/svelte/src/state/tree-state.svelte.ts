import type {
  BaseBlock,
  BlockIndex,
  OrderingStrategy,
  DropZoneType,
  HoverChangeEvent,
  ExpandChangeEvent,
  Rect,
  SnapshotRectsRef,
} from '@dnd-block-tree/core'
import {
  expandReducer,
  computeNormalizedIndex,
  reparentBlockIndex,
  reparentMultipleBlocks,
  buildOrderedBlocks,
  debounce,
  getDropZoneType,
  extractBlockId,
} from '@dnd-block-tree/core'
import { getContext, setContext } from 'svelte'

const TREE_STATE_KEY = Symbol('tree-state')

export interface TreeStateOptions {
  previewDebounce?: number
  containerTypes?: readonly string[]
  orderingStrategy?: OrderingStrategy
}

export interface TreeState<T extends BaseBlock> {
  readonly activeId: string | null
  readonly activeBlock: T | null
  readonly hoverZone: string | null
  readonly expandedMap: Record<string, boolean>
  readonly effectiveBlocks: T[]
  readonly blocksByParent: Map<string | null, T[]>
  readonly isDragging: boolean
  setActiveId(id: string | null): void
  setHoverZone(zone: string | null): void
  toggleExpand(id: string): void
  setExpandAll(expanded: boolean): void
  handleHover(zoneId: string, parentId: string | null): void
  handleDragStart(id: string, blocks: T[], draggedIds?: string[]): void
  handleDragOver(targetZone: string): void
  handleDragEnd(): { targetId: string; reorderedBlocks: T[] } | null
  cancelDrag(): void
  getInitialBlocks(): T[]
  getCachedReorder(): { targetId: string; reorderedBlocks: T[] } | null
  getDraggedIds(): string[]
}

export function createTreeState<T extends BaseBlock>(
  blocks: () => T[],
  blockMap: () => Map<string, T>,
  options: TreeStateOptions = {}
): TreeState<T> {
  const {
    previewDebounce = 150,
    containerTypes = [],
    orderingStrategy = 'integer',
  } = options

  let activeId = $state<string | null>(null)
  let hoverZone = $state<string | null>(null)
  let expandedMap = $state<Record<string, boolean>>({})
  let virtualState = $state<BlockIndex<T> | null>(null)
  let isDragging = $state(false)

  // Non-reactive refs (snapshots)
  let initialBlocks: T[] = []
  let cachedReorder: { targetId: string; reorderedBlocks: T[] } | null = null
  let draggedIds: string[] = []

  const activeBlock = $derived(activeId ? blockMap().get(activeId) ?? null : null)

  const debouncedSetVirtual = debounce((newBlocks: T[] | null) => {
    if (newBlocks) {
      virtualState = computeNormalizedIndex(newBlocks)
    } else {
      virtualState = null
    }
  }, previewDebounce)

  const effectiveState = $derived(
    virtualState ?? computeNormalizedIndex(blocks(), orderingStrategy)
  )

  const effectiveBlocks = $derived(
    buildOrderedBlocks(effectiveState, containerTypes, orderingStrategy)
  )

  const blocksByParent = $derived.by(() => {
    const map = new Map<string | null, T[]>()
    for (const [parentId, ids] of effectiveState.byParent.entries()) {
      map.set(parentId, ids.map(id => effectiveState.byId.get(id)!).filter(Boolean))
    }
    return map
  })

  const state: TreeState<T> = {
    get activeId() { return activeId },
    get activeBlock() { return activeBlock },
    get hoverZone() { return hoverZone },
    get expandedMap() { return expandedMap },
    get effectiveBlocks() { return effectiveBlocks },
    get blocksByParent() { return blocksByParent },
    get isDragging() { return isDragging },

    setActiveId(id: string | null) {
      activeId = id
    },

    setHoverZone(zone: string | null) {
      hoverZone = zone
    },

    toggleExpand(id: string) {
      expandedMap = expandReducer(expandedMap, { type: 'TOGGLE', id })
    },

    setExpandAll(expanded: boolean) {
      const containerIds = blocks()
        .filter(b => containerTypes.includes(b.type))
        .map(b => b.id)
      expandedMap = expandReducer(expandedMap, { type: 'SET_ALL', expanded, ids: containerIds })
    },

    handleHover(zoneId: string, _parentId: string | null) {
      if (!activeId) return
      state.handleDragOver(zoneId)
    },

    handleDragStart(id: string, currentBlocks: T[], ids?: string[]) {
      activeId = id
      isDragging = true
      initialBlocks = [...currentBlocks]
      cachedReorder = null
      draggedIds = ids ?? [id]
    },

    handleDragOver(targetZone: string) {
      if (!activeId) return

      hoverZone = targetZone

      const baseIndex = computeNormalizedIndex(initialBlocks, orderingStrategy)
      const updatedIndex = draggedIds.length > 1
        ? reparentMultipleBlocks(baseIndex, draggedIds, targetZone, containerTypes, orderingStrategy)
        : reparentBlockIndex(baseIndex, activeId, targetZone, containerTypes, orderingStrategy)
      const orderedBlocks = buildOrderedBlocks(updatedIndex, containerTypes, orderingStrategy)

      cachedReorder = { targetId: targetZone, reorderedBlocks: orderedBlocks }
      debouncedSetVirtual(orderedBlocks)
    },

    handleDragEnd() {
      debouncedSetVirtual.cancel()
      virtualState = null

      const result = cachedReorder
      activeId = null
      hoverZone = null
      isDragging = false
      cachedReorder = null
      initialBlocks = []
      draggedIds = []

      return result
    },

    cancelDrag() {
      debouncedSetVirtual.cancel()
      virtualState = null
      activeId = null
      hoverZone = null
      isDragging = false
      cachedReorder = null
      initialBlocks = []
      draggedIds = []
    },

    getInitialBlocks: () => initialBlocks,
    getCachedReorder: () => cachedReorder,
    getDraggedIds: () => draggedIds,
  }

  return state
}

/** Set tree state in context */
export function setTreeStateContext<T extends BaseBlock>(state: TreeState<T>): void {
  setContext(TREE_STATE_KEY, state)
}

/** Get tree state from context */
export function getTreeStateContext<T extends BaseBlock>(): TreeState<T> {
  const ctx = getContext<TreeState<T>>(TREE_STATE_KEY)
  if (!ctx) throw new Error('getTreeStateContext must be called inside a component that called setTreeStateContext')
  return ctx
}
