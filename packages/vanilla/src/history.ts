import type { BaseBlock, HistoryState, HistoryAction } from '@dnd-block-tree/core'
import { historyReducer } from '@dnd-block-tree/core'

export interface BlockHistoryOptions {
  maxSteps?: number
}

export interface BlockHistory<T extends BaseBlock> {
  push(blocks: T[]): void
  undo(): T[] | null
  redo(): T[] | null
  canUndo(): boolean
  canRedo(): boolean
  getPresent(): T[]
  clear(blocks: T[]): void
}

/**
 * Imperative undo/redo history wrapping core's historyReducer.
 */
export function createBlockHistory<T extends BaseBlock>(
  initialBlocks: T[],
  options: BlockHistoryOptions = {}
): BlockHistory<T> {
  const { maxSteps = 50 } = options

  let state: HistoryState<T> = {
    past: [],
    present: initialBlocks,
    future: [],
  }

  return {
    push(blocks: T[]) {
      state = historyReducer(state, { type: 'SET', payload: blocks, maxSteps })
    },

    undo(): T[] | null {
      if (state.past.length === 0) return null
      state = historyReducer(state, { type: 'UNDO' })
      return state.present
    },

    redo(): T[] | null {
      if (state.future.length === 0) return null
      state = historyReducer(state, { type: 'REDO' })
      return state.present
    },

    canUndo: () => state.past.length > 0,
    canRedo: () => state.future.length > 0,
    getPresent: () => state.present,

    clear(blocks: T[]) {
      state = { past: [], present: blocks, future: [] }
    },
  }
}
