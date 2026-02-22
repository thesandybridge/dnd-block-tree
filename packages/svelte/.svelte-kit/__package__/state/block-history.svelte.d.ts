import type { BaseBlock } from '@dnd-block-tree/core';
export interface BlockHistoryOptions {
    maxSteps?: number;
}
export interface BlockHistoryState<T extends BaseBlock> {
    readonly blocks: T[];
    readonly canUndo: boolean;
    readonly canRedo: boolean;
    set(blocks: T[]): void;
    undo(): void;
    redo(): void;
}
/**
 * Reactive undo/redo history using $state runes.
 * Wraps core's historyReducer.
 */
export declare function createBlockHistory<T extends BaseBlock>(initialBlocks: T[], options?: BlockHistoryOptions): BlockHistoryState<T>;
//# sourceMappingURL=block-history.svelte.d.ts.map