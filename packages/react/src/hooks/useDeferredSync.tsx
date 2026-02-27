'use client'

import { useRef, useCallback } from 'react'
import type { BaseBlock } from '@dnd-block-tree/core'
import { mergeBlockVersions } from '@dnd-block-tree/core'
import type { MergeBlockVersionsOptions } from '@dnd-block-tree/core'

export interface UseDeferredSyncOptions<T extends BaseBlock> {
  /** Called when remote data is applied (only when not busy) */
  onResolve?: (blocks: T[]) => void
  /** Options passed to mergeBlockVersions when using 'merge' strategy */
  mergeOptions?: MergeBlockVersionsOptions
}

export interface UseDeferredSyncResult<T extends BaseBlock> {
  /** Whether sync is currently deferred (editing or dragging) */
  readonly isBusy: boolean
  /** Apply remote blocks — queues if busy, calls onResolve if idle */
  apply: (remoteBlocks: T[]) => void
  /** Enter busy state (call before editing or dragging) */
  enterBusy: () => void
  /**
   * Exit busy state and resolve any queued remote changes.
   * Returns the merged result if a queue existed, null otherwise.
   *
   * @param localBlocks - Current local blocks to merge with queued remote
   * @param strategy - 'merge' uses mergeBlockVersions (content + structure),
   *                   'lww' discards queued remote changes (last write wins)
   */
  exitBusy: (localBlocks: T[], strategy: 'merge' | 'lww') => T[] | null
}

/**
 * Hook for deferring remote sync updates during blocking actions
 * like editing or dragging. Remote changes queue while busy and
 * resolve on exit using either merge or last-write-wins strategy.
 *
 * @example
 * ```tsx
 * const history = useBlockHistory(initialBlocks)
 * const sync = useDeferredSync<MyBlock>({
 *   onResolve: (blocks) => history.set(blocks),
 * })
 *
 * // In your realtime subscription:
 * sync.apply(remoteBlocks)
 *
 * // Drag handlers:
 * onDragStart: () => sync.enterBusy()
 * onDragEnd: () => {
 *   const result = sync.exitBusy(currentBlocks, 'lww')
 *   if (result) publish(result)
 * }
 *
 * // Edit handlers:
 * onStartEdit: () => sync.enterBusy()
 * onCommitEdit: () => {
 *   const result = sync.exitBusy(editedBlocks, 'merge')
 *   if (result) publish(result)
 * }
 * ```
 */
export function useDeferredSync<T extends BaseBlock>(
  options?: UseDeferredSyncOptions<T>
): UseDeferredSyncResult<T> {
  const busyRef = useRef(false)
  const queueRef = useRef<T[] | null>(null)
  const optionsRef = useRef(options)
  optionsRef.current = options

  const apply = useCallback((remoteBlocks: T[]) => {
    if (busyRef.current) {
      queueRef.current = remoteBlocks
    } else {
      optionsRef.current?.onResolve?.(remoteBlocks)
    }
  }, [])

  const enterBusy = useCallback(() => {
    busyRef.current = true
  }, [])

  const exitBusy = useCallback((localBlocks: T[], strategy: 'merge' | 'lww'): T[] | null => {
    busyRef.current = false
    const queued = queueRef.current
    queueRef.current = null

    if (!queued) return null

    if (strategy === 'lww') {
      return localBlocks
    }

    return mergeBlockVersions(localBlocks, queued, optionsRef.current?.mergeOptions)
  }, [])

  return {
    get isBusy() { return busyRef.current },
    apply,
    enterBusy,
    exitBusy,
  }
}
