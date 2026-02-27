import { mergeBlockVersions } from '@dnd-block-tree/core';
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
export function createDeferredSync(options) {
    let busy = $state(false);
    let queue = $state(null);
    const isBusy = $derived(busy);
    return {
        get isBusy() { return isBusy; },
        apply(remoteBlocks) {
            if (busy) {
                queue = remoteBlocks;
            }
            else {
                options?.onResolve?.(remoteBlocks);
            }
        },
        enterBusy() {
            busy = true;
        },
        exitBusy(localBlocks, strategy) {
            busy = false;
            const queued = queue;
            queue = null;
            if (!queued)
                return null;
            if (strategy === 'lww') {
                return localBlocks;
            }
            return mergeBlockVersions(localBlocks, queued, options?.mergeOptions);
        },
    };
}
