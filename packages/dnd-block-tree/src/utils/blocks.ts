import type { UniqueIdentifier } from '@dnd-kit/core'
import type { BaseBlock, BlockIndex } from '../core/types'
import { extractUUID } from './helper'

/**
 * Clone a Map
 */
export function cloneMap<K, V>(map: Map<K, V>): Map<K, V> {
  return new Map(map)
}

/**
 * Clone a parent map with arrays
 */
export function cloneParentMap(map: Map<string | null, string[]>): Map<string | null, string[]> {
  const newMap = new Map<string | null, string[]>()
  for (const [k, v] of map.entries()) {
    newMap.set(k, [...v])
  }
  return newMap
}

/**
 * Compute normalized index from flat block array
 */
export function computeNormalizedIndex<T extends BaseBlock>(blocks: T[]): BlockIndex<T> {
  const byId = new Map<string, T>()
  const byParent = new Map<string | null, string[]>()

  for (const block of blocks) {
    byId.set(block.id, block)
    const key = block.parentId ?? null
    const list = byParent.get(key) ?? []
    byParent.set(key, [...list, block.id])
  }

  return { byId, byParent }
}

/**
 * Build ordered flat array from BlockIndex
 */
export function buildOrderedBlocks<T extends BaseBlock>(
  index: BlockIndex<T>,
  containerTypes: readonly string[] = []
): T[] {
  const result: T[] = []

  const walk = (parentId: string | null) => {
    const children = index.byParent.get(parentId) ?? []
    for (let i = 0; i < children.length; i++) {
      const id = children[i]
      const block = index.byId.get(id)
      if (block) {
        result.push({ ...block, order: i })
        // Recursively walk children if this is a container type
        if (containerTypes.includes(block.type)) {
          walk(block.id)
        }
      }
    }
  }

  walk(null)
  return result
}

/**
 * Reparent a block based on drop zone ID
 *
 * @param state - Current block index
 * @param activeId - ID of the dragged block
 * @param targetZone - Drop zone ID (e.g., "after-uuid", "before-uuid", "into-uuid")
 * @param containerTypes - Block types that can have children
 */
export function reparentBlockIndex<T extends BaseBlock>(
  state: BlockIndex<T>,
  activeId: UniqueIdentifier,
  targetZone: string,
  containerTypes: readonly string[] = []
): BlockIndex<T> {
  const byId = cloneMap(state.byId)
  const byParent = cloneParentMap(state.byParent)

  const dragged = byId.get(String(activeId))
  if (!dragged) return state

  const isRootStart = targetZone === 'root-start'
  const isRootEnd = targetZone === 'root-end'
  const isEnd = targetZone.startsWith('end-') || isRootEnd
  const zoneTargetId = extractUUID(targetZone)
  const isAfter = targetZone.startsWith('after-')
  const isInto = targetZone.startsWith('into-') || isRootStart
  const target = byId.get(zoneTargetId)

  const oldParentId = dragged.parentId ?? null
  const newParentId = isRootStart || isRootEnd ? null : (isInto || isEnd) ? zoneTargetId : target?.parentId ?? null

  // Prevent containers from being nested if they shouldn't be
  if (containerTypes.includes(dragged.type) && newParentId !== null) {
    const newParent = byId.get(newParentId)
    // Only allow nesting if the parent is also a container type
    // For now, prevent top-level containers from being nested
    if (newParent && !containerTypes.includes(newParent.type)) {
      return state
    }
  }

  // Cannot drop on itself
  if (dragged.id === zoneTargetId) return state

  // Remove dragged from old parent
  const oldList = byParent.get(oldParentId) ?? []
  const filtered = oldList.filter(id => id !== dragged.id)
  byParent.set(oldParentId, filtered)

  // Insert dragged into new parent
  const newList = [...(byParent.get(newParentId) ?? [])]
  let insertIndex: number

  if (isInto) {
    // into-{parentId} or root-start means insert at position 0
    insertIndex = 0
  } else if (isEnd) {
    // end-{parentId} or root-end means insert at the end
    insertIndex = newList.length
  } else {
    const idx = newList.indexOf(zoneTargetId)
    insertIndex = idx === -1 ? newList.length : isAfter ? idx + 1 : idx
  }

  // Check if already at correct position
  const currentIndex = newList.indexOf(dragged.id)
  if (dragged.parentId === newParentId && currentIndex === insertIndex) {
    return state
  }

  newList.splice(insertIndex, 0, dragged.id)
  byParent.set(newParentId, newList)

  // Update dragged block's parentId
  byId.set(dragged.id, {
    ...dragged,
    parentId: newParentId,
  })

  return { byId, byParent }
}

/**
 * Get all descendant IDs of a block
 */
export function getDescendantIds<T extends BaseBlock>(
  state: BlockIndex<T>,
  parentId: string
): Set<string> {
  const toDelete = new Set<string>()
  const stack = [parentId]

  while (stack.length > 0) {
    const current = stack.pop()!
    toDelete.add(current)
    const children = state.byParent.get(current) ?? []
    stack.push(...children)
  }

  return toDelete
}

/**
 * Delete a block and all its descendants
 */
export function deleteBlockAndDescendants<T extends BaseBlock>(
  state: BlockIndex<T>,
  id: string
): BlockIndex<T> {
  const byId = cloneMap(state.byId)
  const byParent = cloneParentMap(state.byParent)

  const idsToDelete = getDescendantIds(state, id)

  for (const deleteId of idsToDelete) {
    byId.delete(deleteId)
    byParent.delete(deleteId)
  }

  for (const [parent, list] of byParent.entries()) {
    byParent.set(parent, list.filter(itemId => !idsToDelete.has(itemId)))
  }

  return { byId, byParent }
}
