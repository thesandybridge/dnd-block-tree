'use client'

import { useReducer, useCallback } from 'react'
import type { BaseBlock } from '../core/types'

export interface UseBlockHistoryOptions {
  /** Maximum number of undo steps to retain (default: 50) */
  maxSteps?: number
}

export interface UseBlockHistoryResult<T extends BaseBlock> {
  /** Current blocks state */
  blocks: T[]
  /** Set new blocks state (pushes current to undo stack) */
  set: (blocks: T[]) => void
  /** Undo the last change */
  undo: () => void
  /** Redo the last undone change */
  redo: () => void
  /** Whether undo is available */
  canUndo: boolean
  /** Whether redo is available */
  canRedo: boolean
}

interface HistoryState<T extends BaseBlock> {
  past: T[][]
  present: T[]
  future: T[][]
}

type HistoryAction<T extends BaseBlock> =
  | { type: 'SET'; payload: T[]; maxSteps: number }
  | { type: 'UNDO' }
  | { type: 'REDO' }

function historyReducer<T extends BaseBlock>(
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

/**
 * Composable hook for undo/redo support with BlockTree.
 *
 * Usage:
 * ```tsx
 * const { blocks, set, undo, redo, canUndo, canRedo } = useBlockHistory(initialBlocks)
 * <BlockTree blocks={blocks} onChange={set} />
 * <button onClick={undo} disabled={!canUndo}>Undo</button>
 * <button onClick={redo} disabled={!canRedo}>Redo</button>
 * ```
 */
export function useBlockHistory<T extends BaseBlock>(
  initialBlocks: T[],
  options: UseBlockHistoryOptions = {}
): UseBlockHistoryResult<T> {
  const { maxSteps = 50 } = options

  const [state, dispatch] = useReducer(historyReducer<T>, {
    past: [],
    present: initialBlocks,
    future: [],
  })

  const set = useCallback(
    (blocks: T[]) => dispatch({ type: 'SET', payload: blocks, maxSteps }),
    [maxSteps]
  )
  const undo = useCallback(() => dispatch({ type: 'UNDO' }), [])
  const redo = useCallback(() => dispatch({ type: 'REDO' }), [])

  return {
    blocks: state.present,
    set,
    undo,
    redo,
    canUndo: state.past.length > 0,
    canRedo: state.future.length > 0,
  }
}
