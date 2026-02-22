import type { BaseBlock, BlockIndex, BlockAction, OrderingStrategy } from './types'
import {
  cloneMap,
  cloneParentMap,
  computeNormalizedIndex,
  reparentBlockIndex,
  deleteBlockAndDescendants,
} from './utils/blocks'

// ============================================================================
// Block Reducer
// ============================================================================

/**
 * Pure block state reducer: (state, action) => state
 * Extracted from the React useBlockState hook for framework-agnostic use.
 */
export function blockReducer<T extends BaseBlock>(
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

// ============================================================================
// Expand Reducer
// ============================================================================

export type ExpandAction =
  | { type: 'TOGGLE'; id: string }
  | { type: 'SET_ALL'; expanded: boolean; ids: string[] }

/**
 * Pure expand/collapse state reducer.
 * Extracted from the React useTreeState hook.
 */
export function expandReducer(
  state: Record<string, boolean>,
  action: ExpandAction
): Record<string, boolean> {
  switch (action.type) {
    case 'TOGGLE':
      return { ...state, [action.id]: !state[action.id] }
    case 'SET_ALL': {
      const newState: Record<string, boolean> = {}
      for (const id of action.ids) {
        newState[id] = action.expanded
      }
      return newState
    }
    default:
      return state
  }
}

// ============================================================================
// History Reducer
// ============================================================================

export interface HistoryState<T extends BaseBlock> {
  past: T[][]
  present: T[]
  future: T[][]
}

export type HistoryAction<T extends BaseBlock> =
  | { type: 'SET'; payload: T[]; maxSteps: number }
  | { type: 'UNDO' }
  | { type: 'REDO' }

/**
 * Pure undo/redo history reducer.
 * Extracted from the React useBlockHistory hook.
 */
export function historyReducer<T extends BaseBlock>(
  state: HistoryState<T>,
  action: HistoryAction<T>
): HistoryState<T> {
  switch (action.type) {
    case 'SET': {
      const past = [...state.past, state.present]
      if (past.length > action.maxSteps) {
        past.shift()
      }
      return {
        past,
        present: action.payload,
        future: [],
      }
    }
    case 'UNDO': {
      if (state.past.length === 0) return state
      const previous = state.past[state.past.length - 1]
      return {
        past: state.past.slice(0, -1),
        present: previous,
        future: [state.present, ...state.future],
      }
    }
    case 'REDO': {
      if (state.future.length === 0) return state
      const next = state.future[0]
      return {
        past: [...state.past, state.present],
        present: next,
        future: state.future.slice(1),
      }
    }
    default:
      return state
  }
}
