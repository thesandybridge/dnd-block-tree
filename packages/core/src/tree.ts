import type {
  BaseBlock,
  BlockIndex,
  BlockPosition,
  OrderingStrategy,
  DragStartEvent,
  DragMoveEvent,
  DragEndEvent,
  BlockMoveEvent,
  ExpandChangeEvent,
  HoverChangeEvent,
  BlockAddEvent,
  BlockDeleteEvent,
  CanDragFn,
  CanDropFn,
  IdGeneratorFn,
  DropZoneType,
} from './types'
import { getDropZoneType, extractBlockId } from './types'
import type { CoreCollisionDetection } from './collision'
import { EventEmitter } from './event-emitter'
import { blockReducer, expandReducer } from './reducers'
import {
  computeNormalizedIndex,
  buildOrderedBlocks,
  reparentBlockIndex,
  reparentMultipleBlocks,
  getDescendantIds,
} from './utils/blocks'
import { debounce, generateId } from './utils/helper'
import { generateKeyBetween } from './utils/fractional'

export interface BlockTreeOptions<T extends BaseBlock> {
  initialBlocks?: T[]
  containerTypes?: readonly string[]
  orderingStrategy?: OrderingStrategy
  maxDepth?: number
  collisionDetection?: CoreCollisionDetection
  initialExpanded?: string[] | 'all' | 'none'
  previewDebounce?: number
  canDrag?: CanDragFn<T>
  canDrop?: CanDropFn<T>
  idGenerator?: IdGeneratorFn
}

export interface BlockTreeEvents<T extends BaseBlock> {
  'blocks:change': (blocks: T[]) => void
  'drag:start': (event: DragStartEvent<T>) => void
  'drag:move': (event: DragMoveEvent<T>) => void
  'drag:end': (event: DragEndEvent<T>) => void
  'drag:cancel': () => void
  'expand:change': (event: ExpandChangeEvent<T>) => void
  'hover:change': (event: HoverChangeEvent<T>) => void
  'block:add': (event: BlockAddEvent<T>) => void
  'block:delete': (event: BlockDeleteEvent<T>) => void
}

export interface BlockTreeInstance<T extends BaseBlock> {
  // State reads
  getBlocks(): T[]
  getBlockIndex(): BlockIndex<T>
  getBlock(id: string): T | undefined
  getChildren(parentId: string | null): T[]
  getAncestors(id: string): T[]
  getExpandedMap(): Record<string, boolean>
  getActiveId(): string | null
  getHoverZone(): string | null
  getEffectiveBlocks(): T[]

  // Block mutations
  addBlock(type: T['type'], parentId?: string | null): T
  insertBlock(type: T['type'], referenceId: string, position: 'before' | 'after'): T
  deleteBlock(id: string): void
  moveBlock(activeId: string, targetZone: string): void
  setBlocks(blocks: T[]): void

  // Expand/collapse
  toggleExpand(id: string): void
  setExpandAll(expanded: boolean): void
  isExpanded(id: string): boolean

  // Drag lifecycle (called by framework adapters)
  startDrag(id: string, draggedIds?: string[]): boolean
  updateDrag(targetZone: string): void
  endDrag(): { blocks: T[]; targetZone: string } | null
  cancelDrag(): void

  // Collision
  getCollisionDetection(): CoreCollisionDetection | undefined

  // Events
  on: EventEmitter<BlockTreeEvents<T>>['on']
  off: EventEmitter<BlockTreeEvents<T>>['off']

  // Cleanup
  destroy(): void
}

/**
 * Get block position in the tree
 */
function getBlockPosition<T extends BaseBlock>(
  blocks: T[],
  blockId: string
): BlockPosition {
  const block = blocks.find(b => b.id === blockId)
  if (!block) return { parentId: null, index: 0 }
  const siblings = blocks.filter(b => b.parentId === block.parentId)
  const index = siblings.findIndex(b => b.id === blockId)
  return { parentId: block.parentId, index }
}

/**
 * Create a stateful block tree instance with event-based notifications.
 */
export function createBlockTree<T extends BaseBlock>(
  options: BlockTreeOptions<T> = {}
): BlockTreeInstance<T> {
  const {
    initialBlocks = [],
    containerTypes = [],
    orderingStrategy = 'integer',
    maxDepth,
    collisionDetection,
    initialExpanded,
    previewDebounce = 150,
    canDrag,
    canDrop,
    idGenerator = generateId,
  } = options

  const emitter = new EventEmitter<BlockTreeEvents<T>>()

  // State
  let index = computeNormalizedIndex(initialBlocks, orderingStrategy)
  let expandedMap = computeInitialExpanded(initialBlocks, containerTypes, initialExpanded)

  // Drag state
  let activeId: string | null = null
  let draggedIds: string[] = []
  let snapshotBlocks: T[] = []
  let fromPosition: BlockPosition | null = null
  let cachedReorder: { targetId: string; reorderedBlocks: T[] } | null = null
  let hoverZone: string | null = null
  let virtualState: BlockIndex<T> | null = null

  const debouncedSetVirtual = debounce((newBlocks: T[] | null) => {
    if (newBlocks) {
      virtualState = computeNormalizedIndex(newBlocks)
    } else {
      virtualState = null
    }
  }, previewDebounce)

  function getBlocks(): T[] {
    return buildOrderedBlocks(index, containerTypes, orderingStrategy)
  }

  function emitBlocksChange() {
    emitter.emit('blocks:change', getBlocks())
  }

  const instance: BlockTreeInstance<T> = {
    getBlocks,
    getBlockIndex: () => index,
    getBlock: (id) => index.byId.get(id),
    getChildren: (parentId) => {
      const ids = index.byParent.get(parentId) ?? []
      return ids.map(id => index.byId.get(id)!).filter(Boolean)
    },
    getAncestors: (id) => {
      const ancestors: T[] = []
      let current = index.byId.get(id)
      while (current?.parentId) {
        const parent = index.byId.get(current.parentId)
        if (!parent) break
        ancestors.push(parent)
        current = parent
      }
      return ancestors
    },
    getExpandedMap: () => ({ ...expandedMap }),
    getActiveId: () => activeId,
    getHoverZone: () => hoverZone,
    getEffectiveBlocks: () => {
      const effectiveIdx = virtualState ?? index
      return buildOrderedBlocks(effectiveIdx, containerTypes, orderingStrategy)
    },

    addBlock: (type, parentId = null) => {
      const siblings = index.byParent.get(parentId) ?? []
      let order: number | string = siblings.length
      if (orderingStrategy === 'fractional') {
        const lastId = siblings[siblings.length - 1]
        const lastOrder = lastId ? String(index.byId.get(lastId)!.order) : null
        order = generateKeyBetween(lastOrder, null)
      }

      const newItem = { id: idGenerator(), type, parentId, order } as T
      index = blockReducer(index, { type: 'ADD_ITEM', payload: newItem }, containerTypes, orderingStrategy, maxDepth)
      const addEvent: BlockAddEvent<T> = { block: newItem, parentId, index: siblings.length }
      emitter.emit('block:add', addEvent)
      emitBlocksChange()
      return newItem
    },

    insertBlock: (type, referenceId, position) => {
      const referenceBlock = index.byId.get(referenceId)
      if (!referenceBlock) throw new Error(`Reference block ${referenceId} not found`)

      const parentId = referenceBlock.parentId ?? null
      const siblings = index.byParent.get(parentId) ?? []
      const refIdx = siblings.indexOf(referenceId)
      const insertIdx = position === 'before' ? refIdx : refIdx + 1

      let order: number | string = insertIdx
      if (orderingStrategy === 'fractional') {
        const prevId = insertIdx > 0 ? siblings[insertIdx - 1] : null
        const nextId = insertIdx < siblings.length ? siblings[insertIdx] : null
        const prevOrder = prevId ? String(index.byId.get(prevId)!.order) : null
        const nextOrder = nextId ? String(index.byId.get(nextId)!.order) : null
        order = generateKeyBetween(prevOrder, nextOrder)
      }

      const newItem = { id: idGenerator(), type, parentId, order } as T
      index = blockReducer(index, { type: 'INSERT_ITEM', payload: { item: newItem, parentId, index: insertIdx } }, containerTypes, orderingStrategy, maxDepth)
      const addEvent: BlockAddEvent<T> = { block: newItem, parentId, index: insertIdx }
      emitter.emit('block:add', addEvent)
      emitBlocksChange()
      return newItem
    },

    deleteBlock: (id) => {
      const block = index.byId.get(id)
      if (!block) return
      const deletedIds = [...getDescendantIds(index, id)]
      index = blockReducer(index, { type: 'DELETE_ITEM', payload: { id } }, containerTypes, orderingStrategy, maxDepth)
      emitter.emit('block:delete', { block, deletedIds, parentId: block.parentId })
      emitBlocksChange()
    },

    moveBlock: (blockId, targetZone) => {
      const blocks = getBlocks()
      const from = getBlockPosition(blocks, blockId)
      index = blockReducer(index, { type: 'MOVE_ITEM', payload: { activeId: blockId, targetZone } }, containerTypes, orderingStrategy, maxDepth)
      const newBlocks = getBlocks()
      const to = getBlockPosition(newBlocks, blockId)
      const block = index.byId.get(blockId)
      if (block) {
        const moveEvent: BlockMoveEvent<T> = { block, from, to, blocks: newBlocks, movedIds: [blockId] }
        emitter.emit('drag:end', { block, blockId, targetZone, cancelled: false })
        emitBlocksChange()
      }
    },

    setBlocks: (blocks) => {
      index = computeNormalizedIndex(blocks, orderingStrategy)
      emitBlocksChange()
    },

    toggleExpand: (id) => {
      const newExpanded = expandedMap[id] === false
      expandedMap = expandReducer(expandedMap, { type: 'TOGGLE', id })
      const block = index.byId.get(id)
      if (block) {
        emitter.emit('expand:change', { block, blockId: id, expanded: newExpanded })
      }
    },

    setExpandAll: (expanded) => {
      const blocks = getBlocks()
      const containerIds = blocks.filter(b => containerTypes.includes(b.type)).map(b => b.id)
      expandedMap = expandReducer(expandedMap, { type: 'SET_ALL', expanded, ids: containerIds })
    },

    isExpanded: (id) => expandedMap[id] !== false,

    startDrag: (id, ids) => {
      const block = index.byId.get(id)
      if (!block) return false
      if (canDrag && !canDrag(block)) return false

      const blocks = getBlocks()
      activeId = id
      draggedIds = ids ?? [id]
      snapshotBlocks = [...blocks]
      fromPosition = getBlockPosition(blocks, id)
      cachedReorder = null
      hoverZone = null

      emitter.emit('drag:start', { block, blockId: id })
      return true
    },

    updateDrag: (targetZone) => {
      if (!activeId) return

      const activeBlock = index.byId.get(activeId)
      const targetBlockId = extractBlockId(targetZone)
      const targetBlock = index.byId.get(targetBlockId) ?? null

      // Check canDrop
      if (canDrop && activeBlock && !canDrop(activeBlock, targetZone, targetBlock)) {
        return
      }

      // Fire hover change
      if (hoverZone !== targetZone) {
        const zoneType: DropZoneType = getDropZoneType(targetZone)
        emitter.emit('hover:change', { zoneId: targetZone, zoneType, targetBlock })
      }
      hoverZone = targetZone

      // Compute preview from snapshot
      const baseIndex = computeNormalizedIndex(snapshotBlocks, orderingStrategy)
      const updatedIndex = draggedIds.length > 1
        ? reparentMultipleBlocks(baseIndex, draggedIds, targetZone, containerTypes, orderingStrategy, maxDepth)
        : reparentBlockIndex(baseIndex, activeId, targetZone, containerTypes, orderingStrategy, maxDepth)
      const orderedBlocks = buildOrderedBlocks(updatedIndex, containerTypes, orderingStrategy)

      cachedReorder = { targetId: targetZone, reorderedBlocks: orderedBlocks }
      debouncedSetVirtual(orderedBlocks)
    },

    endDrag: () => {
      debouncedSetVirtual.cancel()
      virtualState = null

      const cached = cachedReorder
      const dragId = activeId
      const block = dragId ? index.byId.get(dragId) : null

      // Fire drag end callback
      if (block && dragId) {
        emitter.emit('drag:end', {
          block,
          blockId: dragId,
          targetZone: cached?.targetId ?? null,
          cancelled: false,
        })
      }

      // Apply the reorder
      if (cached) {
        index = computeNormalizedIndex(cached.reorderedBlocks, orderingStrategy)

        if (block && dragId && fromPosition) {
          const to = getBlockPosition(cached.reorderedBlocks, dragId)
          emitter.emit('blocks:change', cached.reorderedBlocks)
        } else {
          emitBlocksChange()
        }
      }

      const result = cached ? { blocks: cached.reorderedBlocks, targetZone: cached.targetId } : null

      // Reset drag state
      activeId = null
      draggedIds = []
      snapshotBlocks = []
      fromPosition = null
      cachedReorder = null
      hoverZone = null

      return result
    },

    cancelDrag: () => {
      debouncedSetVirtual.cancel()
      virtualState = null

      const dragId = activeId
      const block = dragId ? index.byId.get(dragId) : null

      if (block && dragId) {
        emitter.emit('drag:end', {
          block,
          blockId: dragId,
          targetZone: null,
          cancelled: true,
        })
      }

      emitter.emit('drag:cancel')

      // Reset drag state
      activeId = null
      draggedIds = []
      snapshotBlocks = []
      fromPosition = null
      cachedReorder = null
      hoverZone = null
    },

    getCollisionDetection: () => collisionDetection,

    on: (event, handler) => emitter.on(event, handler),
    off: (event, handler) => emitter.off(event, handler),

    destroy: () => {
      debouncedSetVirtual.cancel()
      emitter.removeAllListeners()
    },
  }

  return instance
}

function computeInitialExpanded<T extends BaseBlock>(
  blocks: T[],
  containerTypes: readonly string[],
  initialExpanded: string[] | 'all' | 'none' | undefined
): Record<string, boolean> {
  if (initialExpanded === 'none') {
    const map: Record<string, boolean> = {}
    for (const b of blocks) {
      if (containerTypes.includes(b.type)) map[b.id] = false
    }
    return map
  }

  const map: Record<string, boolean> = {}
  if (initialExpanded === 'all' || initialExpanded === undefined) {
    for (const b of blocks) {
      if (containerTypes.includes(b.type)) map[b.id] = true
    }
  } else if (Array.isArray(initialExpanded)) {
    for (const id of initialExpanded) {
      map[id] = true
    }
  }

  return map
}
