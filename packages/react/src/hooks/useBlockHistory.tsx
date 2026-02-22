'use client'

import { useReducer, useCallback } from 'react'
import type { BaseBlock } from '@dnd-block-tree/core'
import { historyReducer } from '@dnd-block-tree/core'

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
