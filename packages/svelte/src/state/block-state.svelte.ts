import type {
  BaseBlock,
  BlockIndex,
  BlockAction,
  BlockStateContextValue,
  OrderingStrategy,
  BlockAddEvent,
  BlockDeleteEvent,
} from '@dnd-block-tree/core'
import {
  blockReducer,
  computeNormalizedIndex,
  buildOrderedBlocks,
  getDescendantIds,
  generateId,
  generateKeyBetween,
} from '@dnd-block-tree/core'
import { getContext, setContext } from 'svelte'

const BLOCK_STATE_KEY = Symbol('block-state')

export interface BlockStateOptions<T extends BaseBlock> {
  initialBlocks?: T[]
  containerTypes?: readonly string[]
  orderingStrategy?: OrderingStrategy
  maxDepth?: number
  onChange?: (blocks: T[]) => void
  onBlockAdd?: (event: BlockAddEvent<T>) => void
  onBlockDelete?: (event: BlockDeleteEvent<T>) => void
}

export interface BlockState<T extends BaseBlock> {
  readonly blocks: T[]
  readonly blockMap: Map<string, T>
  readonly childrenMap: Map<string | null, T[]>
  readonly normalizedIndex: BlockIndex<T>
  createItem(type: T['type'], parentId?: string | null): T
  insertItem(type: T['type'], referenceId: string, position: 'before' | 'after'): T
  deleteItem(id: string): void
  moveItem(activeId: string, targetZone: string): void
  setAll(blocks: T[]): void
}

export function createBlockState<T extends BaseBlock>(
  options: BlockStateOptions<T> = {}
): BlockState<T> {
  const {
    initialBlocks = [],
    containerTypes = [],
    orderingStrategy = 'integer',
    maxDepth,
    onChange,
    onBlockAdd,
    onBlockDelete,
  } = options

  let index = $state<BlockIndex<T>>(computeNormalizedIndex(initialBlocks as T[], orderingStrategy))

  function dispatch(action: BlockAction<T>) {
    index = blockReducer(index, action, containerTypes, orderingStrategy, maxDepth)
  }

  const blocks = $derived.by(() => {
    return buildOrderedBlocks(index, containerTypes, orderingStrategy)
  })

  const blockMap = $derived(index.byId)

  const childrenMap = $derived.by(() => {
    const map = new Map<string | null, T[]>()
    for (const [parentId, ids] of index.byParent.entries()) {
      map.set(parentId, ids.map(id => index.byId.get(id)!).filter(Boolean))
    }
    return map
  })

  // Notify onChange when blocks change
  $effect(() => {
    onChange?.(blocks)
  })

  const state: BlockState<T> = {
    get blocks() { return blocks },
    get blockMap() { return blockMap },
    get childrenMap() { return childrenMap },
    get normalizedIndex() { return index },

    createItem(type: T['type'], parentId: string | null = null): T {
      const siblings = index.byParent.get(parentId) ?? []
      let order: number | string = siblings.length
      if (orderingStrategy === 'fractional') {
        const lastId = siblings[siblings.length - 1]
        const lastOrder = lastId ? String(index.byId.get(lastId)!.order) : null
        order = generateKeyBetween(lastOrder, null)
      }

      const newItem = { id: generateId(), type, parentId, order } as T
      dispatch({ type: 'ADD_ITEM', payload: newItem })
      onBlockAdd?.({ block: newItem, parentId, index: siblings.length })
      return newItem
    },

    insertItem(type: T['type'], referenceId: string, position: 'before' | 'after'): T {
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

      const newItem = { id: generateId(), type, parentId, order } as T
      dispatch({ type: 'INSERT_ITEM', payload: { item: newItem, parentId, index: insertIdx } })
      onBlockAdd?.({ block: newItem, parentId, index: insertIdx })
      return newItem
    },

    deleteItem(id: string) {
      const block = index.byId.get(id)
      if (block && onBlockDelete) {
        const deletedIds = [...getDescendantIds(index, id)]
        onBlockDelete({ block, deletedIds, parentId: block.parentId })
      }
      dispatch({ type: 'DELETE_ITEM', payload: { id } })
    },

    moveItem(activeId: string, targetZone: string) {
      dispatch({ type: 'MOVE_ITEM', payload: { activeId, targetZone } })
    },

    setAll(allBlocks: T[]) {
      dispatch({ type: 'SET_ALL', payload: allBlocks })
    },
  }

  return state
}

/** Set block state in context */
export function setBlockStateContext<T extends BaseBlock>(state: BlockState<T>): void {
  setContext(BLOCK_STATE_KEY, state)
}

/** Get block state from context */
export function getBlockStateContext<T extends BaseBlock>(): BlockState<T> {
  const ctx = getContext<BlockState<T>>(BLOCK_STATE_KEY)
  if (!ctx) throw new Error('getBlockStateContext must be called inside a component that called setBlockStateContext')
  return ctx
}
