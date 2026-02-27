import type { BaseBlock } from '@dnd-block-tree/core'
import { mergeBlockVersions } from '@dnd-block-tree/core'
import type { MergeBlockVersionsOptions } from '@dnd-block-tree/core'

export interface DeferredSyncOptions<T extends BaseBlock> {
  /** Called when remote data is applied (only when not busy) */
  onResolve?: (blocks: T[]) => void
  /** Options passed to mergeBlockVersions when using 'merge' strategy */
  mergeOptions?: MergeBlockVersionsOptions
}

export interface DeferredSync<T extends BaseBlock> {
  /** Whether sync is currently deferred */
  isBusy(): boolean
  /** Apply remote blocks — queues if busy, calls onResolve if idle */
  apply(remoteBlocks: T[]): void
  /** Enter busy state (call before editing or dragging) */
  enterBusy(): void
  /**
   * Exit busy state and resolve any queued remote changes.
   * Returns the merged result if a queue existed, null otherwise.
   */
  exitBusy(localBlocks: T[], strategy: 'merge' | 'lww'): T[] | null
}

/**
 * Imperative deferred sync factory for vanilla JS.
 * Queues remote updates during blocking actions and resolves
 * on exit using merge or last-write-wins strategy.
 *
 * @param options - Configuration including onResolve callback and merge options
 * @returns DeferredSync instance with busy/queue/flush methods
 *
 * @example
 * ```ts
 * const sync = createDeferredSync<MyBlock>({
 *   onResolve: (blocks) => controller.setBlocks(blocks),
 * })
 *
 * // In your realtime subscription:
 * socket.on('blocks', (blocks) => sync.apply(blocks))
 *
 * // Drag lifecycle:
 * controller.on('drag:statechange', ({ isDragging }) => {
 *   if (isDragging) sync.enterBusy()
 *   else {
 *     const result = sync.exitBusy(controller.getBlocks(), 'lww')
 *     if (result) socket.emit('blocks', result)
 *   }
 * })
 * ```
 */
export function createDeferredSync<T extends BaseBlock>(
  options?: DeferredSyncOptions<T>
): DeferredSync<T> {
  let busy = false
  let queue: T[] | null = null

  return {
    isBusy: () => busy,

    apply(remoteBlocks: T[]) {
      if (busy) {
        queue = remoteBlocks
      } else {
        options?.onResolve?.(remoteBlocks)
      }
    },

    enterBusy() {
      busy = true
    },

    exitBusy(localBlocks: T[], strategy: 'merge' | 'lww'): T[] | null {
      busy = false
      const queued = queue
      queue = null

      if (!queued) return null

      if (strategy === 'lww') {
        return localBlocks
      }

      return mergeBlockVersions(localBlocks, queued, options?.mergeOptions)
    },
  }
}
