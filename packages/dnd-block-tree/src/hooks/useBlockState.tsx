'use client'

import {
  createContext,
  useContext,
  useReducer,
  useMemo,
  useCallback,
  type ReactNode,
} from 'react'
import type { UniqueIdentifier } from '@dnd-kit/core'
import type { BaseBlock, BlockIndex, BlockAction, BlockStateContextValue, BlockStateProviderProps, BlockAddEvent, BlockDeleteEvent, OrderingStrategy } from '../core/types'
import {
  cloneMap,
  cloneParentMap,
  computeNormalizedIndex,
  reparentBlockIndex,
  deleteBlockAndDescendants,
  getDescendantIds,
} from '../utils/blocks'
import { generateId } from '../utils/helper'
import { generateKeyBetween } from '../utils/fractional'

/**
 * Block reducer for state management
 */
function blockReducer<T extends BaseBlock>(
  state: BlockIndex<T>,
  action: BlockAction<T>,
  containerTypes: readonly string[] = [],
  orderingStrategy: OrderingStrategy = 'integer',
  maxDepth?: number
): BlockIndex<T> {
  switch (action.type) {
    case 'ADD_ITEM': {
      const byId = cloneMap(state.byId)
      const byParent = cloneParentMap(state.byParent)
      const item = action.payload

      byId.set(item.id, item)

      const parentKey = item.parentId ?? null
      const list = byParent.get(parentKey) ?? []

      const insertAt =
        typeof item.order === 'number' && item.order <= list.length
          ? item.order
          : list.length

      const newList = [...list]
      newList.splice(insertAt, 0, item.id)
      byParent.set(parentKey, newList)

      return { byId, byParent }
    }

    case 'INSERT_ITEM': {
      const { item, parentId, index } = action.payload
      const updated = new Map(state.byParent)
      const siblings = [...(updated.get(parentId) ?? [])]
      siblings.splice(index, 0, item.id)
      updated.set(parentId, siblings)

      return {
        byId: new Map(state.byId).set(item.id, item),
        byParent: updated,
      }
    }

    case 'DELETE_ITEM': {
      return deleteBlockAndDescendants(state, action.payload.id)
    }

    case 'SET_ALL': {
      return computeNormalizedIndex(action.payload)
    }

    case 'MOVE_ITEM': {
      return reparentBlockIndex(
        state,
        action.payload.activeId,
        action.payload.targetZone,
        containerTypes,
        orderingStrategy,
        maxDepth
      )
    }

    default:
      return state
  }
}

/**
 * Create block state context and hooks
 */
export function createBlockState<T extends BaseBlock>() {
  const BlockContext = createContext<BlockStateContextValue<T> | null>(null)

  function useBlockState() {
    const ctx = useContext(BlockContext)
    if (!ctx) throw new Error('useBlockState must be used inside BlockStateProvider')
    return ctx
  }

  function BlockStateProvider({
    children,
    initialBlocks = [],
    containerTypes = [],
    onChange,
    orderingStrategy = 'integer',
    maxDepth,
    onBlockAdd,
    onBlockDelete,
  }: BlockStateProviderProps<T>) {
    const reducerWithOptions = useCallback(
      (state: BlockIndex<T>, action: BlockAction<T>) =>
        blockReducer(state, action, containerTypes, orderingStrategy, maxDepth),
      [containerTypes, orderingStrategy, maxDepth]
    )

    const [state, dispatch] = useReducer(
      reducerWithOptions,
      computeNormalizedIndex(initialBlocks, orderingStrategy)
    )

    // Compute flat blocks array
    const blocks = useMemo(() => {
      const result: T[] = []
      const walk = (parentId: string | null) => {
        const children = state.byParent.get(parentId) ?? []
        for (let i = 0; i < children.length; i++) {
          const id = children[i]
          const b = state.byId.get(id)
          if (b) {
            result.push(orderingStrategy === 'fractional' ? b : { ...b, order: i })
            if (containerTypes.includes(b.type)) walk(b.id)
          }
        }
      }
      walk(null)
      return result
    }, [state, containerTypes, orderingStrategy])

    // Notify on change
    useMemo(() => {
      onChange?.(blocks)
    }, [blocks, onChange])

    const blockMap = useMemo(() => state.byId, [state])

    const childrenMap = useMemo(() => {
      const map = new Map<string | null, T[]>()
      for (const [parentId, ids] of state.byParent.entries()) {
        map.set(
          parentId,
          ids.map(id => state.byId.get(id)!).filter(Boolean)
        )
      }
      return map
    }, [state])

    const indexMap = useMemo(() => {
      const map = new Map<string, number>()
      for (const ids of state.byParent.values()) {
        ids.forEach((id, index) => {
          map.set(id, index)
        })
      }
      return map
    }, [state])

    const createItem = useCallback(
      (type: T['type'], parentId: string | null = null): T => {
        const siblings = state.byParent.get(parentId) ?? []
        let order: number | string = siblings.length
        if (orderingStrategy === 'fractional') {
          const lastId = siblings[siblings.length - 1]
          const lastOrder = lastId ? String(state.byId.get(lastId)!.order) : null
          order = generateKeyBetween(lastOrder, null)
        }

        const newItem = { id: generateId(), type, parentId, order } as T
        dispatch({ type: 'ADD_ITEM', payload: newItem })
        onBlockAdd?.({ block: newItem, parentId, index: siblings.length })
        return newItem
      },
      [state, orderingStrategy, onBlockAdd]
    )

    const insertItem = useCallback(
      (type: T['type'], referenceId: string, position: 'before' | 'after'): T => {
        const referenceBlock = state.byId.get(referenceId)
        if (!referenceBlock) throw new Error(`Reference block ${referenceId} not found`)

        const parentId = referenceBlock.parentId ?? null
        const siblings = state.byParent.get(parentId) ?? []
        const index = siblings.indexOf(referenceId)
        const insertIndex = position === 'before' ? index : index + 1

        let order: number | string = insertIndex
        if (orderingStrategy === 'fractional') {
          const prevId = insertIndex > 0 ? siblings[insertIndex - 1] : null
          const nextId = insertIndex < siblings.length ? siblings[insertIndex] : null
          const prevOrder = prevId ? String(state.byId.get(prevId)!.order) : null
          const nextOrder = nextId ? String(state.byId.get(nextId)!.order) : null
          order = generateKeyBetween(prevOrder, nextOrder)
        }

        const newItem = { id: generateId(), type, parentId, order } as T

        dispatch({
          type: 'INSERT_ITEM',
          payload: { item: newItem, parentId, index: insertIndex },
        })

        onBlockAdd?.({ block: newItem, parentId, index: insertIndex })
        return newItem
      },
      [state, orderingStrategy, onBlockAdd]
    )

    const deleteItem = useCallback((id: string) => {
      const block = state.byId.get(id)
      if (block && onBlockDelete) {
        const deletedIds = [...getDescendantIds(state, id)]
        onBlockDelete({ block, deletedIds, parentId: block.parentId })
      }
      dispatch({ type: 'DELETE_ITEM', payload: { id } })
    }, [state, onBlockDelete])

    const moveItem = useCallback((activeId: UniqueIdentifier, targetZone: string) => {
      dispatch({ type: 'MOVE_ITEM', payload: { activeId, targetZone } })
    }, [])

    const setAll = useCallback((all: T[]) => {
      dispatch({ type: 'SET_ALL', payload: all })
    }, [])

    const value: BlockStateContextValue<T> = useMemo(
      () => ({
        blocks,
        blockMap,
        childrenMap,
        indexMap,
        normalizedIndex: state,
        createItem,
        insertItem,
        deleteItem,
        moveItem,
        setAll,
      }),
      [
        blocks,
        blockMap,
        childrenMap,
        indexMap,
        state,
        createItem,
        insertItem,
        deleteItem,
        moveItem,
        setAll,
      ]
    )

    return <BlockContext.Provider value={value}>{children}</BlockContext.Provider>
  }

  return {
    BlockStateProvider,
    useBlockState,
  }
}
