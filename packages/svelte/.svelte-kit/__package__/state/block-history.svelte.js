import { historyReducer } from '@dnd-block-tree/core';
/**
 * Reactive undo/redo history using $state runes.
 * Wraps core's historyReducer.
 */
export function createBlockHistory(initialBlocks, options = {}) {
    const { maxSteps = 50 } = options;
    let state = $state({
        past: [],
        present: initialBlocks,
        future: [],
    });
    const blocks = $derived(state.present);
    const canUndo = $derived(state.past.length > 0);
    const canRedo = $derived(state.future.length > 0);
    return {
        get blocks() { return blocks; },
        get canUndo() { return canUndo; },
        get canRedo() { return canRedo; },
        set(newBlocks) {
            state = historyReducer(state, { type: 'SET', payload: newBlocks, maxSteps });
        },
        undo() {
            state = historyReducer(state, { type: 'UNDO' });
        },
        redo() {
            state = historyReducer(state, { type: 'REDO' });
        },
    };
}
