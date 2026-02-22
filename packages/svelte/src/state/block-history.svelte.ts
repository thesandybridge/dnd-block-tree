import type { BaseBlock, HistoryState } from '@dnd-block-tree/core'
import { historyReducer } from '@dnd-block-tree/core'

export interface BlockHistoryOptions {
  maxSteps?: number
}

export interface BlockHistoryState<T extends BaseBlock> {
  readonly blocks: T[]
  readonly canUndo: boolean
  readonly canRedo: boolean
  set(blocks: T[]): void
  undo(): void
  redo(): void
}

/**
 * Reactive undo/redo history using $state runes.
 * Wraps core's historyReducer.
 */
export function createBlockHistory<T extends BaseBlock>(
  initialBlocks: T[],
  options: BlockHistoryOptions = {}
): BlockHistoryState<T> {
  const { maxSteps = 50 } = options

  let state = $state<HistoryState<T>>({
    past: [],
    present: initialBlocks,
    future: [],
  })

  const blocks = $derived(state.present)
  const canUndo = $derived(state.past.length > 0)
  const canRedo = $derived(state.future.length > 0)

  return {
    get blocks() { return blocks },
    get canUndo() { return canUndo },
    get canRedo() { return canRedo },

    set(newBlocks: T[]) {
      state = historyReducer(state, { type: 'SET', payload: newBlocks, maxSteps })
    },

    undo() {
      state = historyReducer(state, { type: 'UNDO' })
    },

    redo() {
      state = historyReducer(state, { type: 'REDO' })
    },
  }
}
