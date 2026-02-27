import type { BaseBlock } from '@dnd-block-tree/core';
import type { MergeBlockVersionsOptions } from '@dnd-block-tree/core';
export interface DeferredSyncOptions<T extends BaseBlock> {
    /** Called when remote data is applied (only when not busy) */
    onResolve?: (blocks: T[]) => void;
    /** Options passed to mergeBlockVersions when using 'merge' strategy */
    mergeOptions?: MergeBlockVersionsOptions;
}
export interface DeferredSyncState<T extends BaseBlock> {
    /** Whether sync is currently deferred (reactive via $derived) */
    readonly isBusy: boolean;
    /** Apply remote blocks — queues if busy, calls onResolve if idle */
    apply(remoteBlocks: T[]): void;
    /** Enter busy state (call before editing or dragging) */
    enterBusy(): void;
    /**
     * Exit busy state and resolve any queued remote changes.
     * Returns the merged result if a queue existed, null otherwise.
     */
    exitBusy(localBlocks: T[], strategy: 'merge' | 'lww'): T[] | null;
}
/**
 * Reactive deferred sync using Svelte 5 $state runes.
 * Queues remote updates during blocking actions and resolves
 * on exit using merge or last-write-wins strategy.
 *
 * @param options - Configuration including onResolve callback and merge options
 * @returns DeferredSyncState with reactive isBusy getter
 *
 * @example
 * ```svelte
 * <script>
 *   import { createDeferredSync } from '@dnd-block-tree/svelte'
 *
 *   const sync = createDeferredSync({
 *     onResolve: (blocks) => history.set(blocks),
 *   })
 * </script>
 *
 * {#if sync.isBusy}
 *   <span>Syncing paused...</span>
 * {/if}
 * ```
 */
export declare function createDeferredSync<T extends BaseBlock>(options?: DeferredSyncOptions<T>): DeferredSyncState<T>;
//# sourceMappingURL=deferred-sync.svelte.d.ts.map