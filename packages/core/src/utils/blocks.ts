import type { BaseBlock, BlockIndex, OrderingStrategy } from '../types'
import { extractUUID } from './helper'
import { generateKeyBetween, compareFractionalKeys } from './fractional'

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
 * Compute normalized index from flat block array.
 *
 * With `orderingStrategy: 'fractional'`, siblings are sorted by their `order`
 * field (lexicographic). With `'integer'` (default), the input order is preserved.
 */
export function computeNormalizedIndex<T extends BaseBlock>(
  blocks: T[],
  orderingStrategy: OrderingStrategy = 'integer'
): BlockIndex<T> {
  const byId = new Map<string, T>()
  const byParent = new Map<string | null, string[]>()

  for (const block of blocks) {
    byId.set(block.id, block)
    const key = block.parentId ?? null
    const list = byParent.get(key) ?? []
    byParent.set(key, [...list, block.id])
  }

  if (orderingStrategy === 'fractional') {
    for (const [parentId, ids] of byParent.entries()) {
      ids.sort((a, b) => {
        const orderA = String(byId.get(a)!.order)
        const orderB = String(byId.get(b)!.order)
        return compareFractionalKeys(orderA, orderB)
      })
      byParent.set(parentId, ids)
    }
  }

  return { byId, byParent }
}

/**
 * Build ordered flat array from BlockIndex.
 *
 * With `'integer'` ordering (default), assigns sequential `order: 0, 1, 2, ...`.
 * With `'fractional'` ordering, preserves existing `order` values.
 */
export function buildOrderedBlocks<T extends BaseBlock>(
  index: BlockIndex<T>,
  containerTypes: readonly string[] = [],
  orderingStrategy: OrderingStrategy = 'integer'
): T[] {
  const result: T[] = []

  const walk = (parentId: string | null) => {
    const children = index.byParent.get(parentId) ?? []
    for (let i = 0; i < children.length; i++) {
      const id = children[i]
      const block = index.byId.get(id)
      if (block) {
        result.push(orderingStrategy === 'fractional' ? block : { ...block, order: i })
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
 * Reparent a block based on drop zone ID.
 *
 * @param state - Current block index
 * @param activeId - ID of the dragged block
 * @param targetZone - Drop zone ID (e.g., "after-uuid", "before-uuid", "into-uuid")
 * @param containerTypes - Block types that can have children
 * @param orderingStrategy - Whether to assign a fractional key to the moved block
 */
export function reparentBlockIndex<T extends BaseBlock>(
  state: BlockIndex<T>,
  activeId: string,
  targetZone: string,
  containerTypes: readonly string[] = [],
  orderingStrategy: OrderingStrategy = 'integer',
  maxDepth?: number
): BlockIndex<T> {
  const byId = cloneMap(state.byId)
  const byParent = cloneParentMap(state.byParent)

  const dragged = byId.get(activeId)
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
    if (newParent && !containerTypes.includes(newParent.type)) {
      return state
    }
  }

  // Enforce maxDepth
  if (maxDepth != null) {
    const parentDepth = newParentId !== null ? getBlockDepth(state, newParentId) : 0
    const subtreeDepth = getSubtreeDepth(state, dragged.id)
    if (parentDepth + subtreeDepth > maxDepth) return state
  }

  // Cannot drop on itself
  if (dragged.id === zoneTargetId) return state

  // Cannot move a block into its own descendants
  if (newParentId !== null && getDescendantIds(state, dragged.id).has(newParentId)) {
    return state
  }

  // Compute target insert index (before any mutation) for no-op detection
  const oldList = byParent.get(oldParentId) ?? []
  const currentIndexInOldParent = oldList.indexOf(dragged.id)

  const preNewList = byParent.get(newParentId) ?? []
  let targetIndex: number
  if (isInto) {
    targetIndex = 0
  } else if (isEnd) {
    targetIndex = preNewList.length
  } else {
    const idx = preNewList.indexOf(zoneTargetId)
    targetIndex = idx === -1 ? preNewList.length : isAfter ? idx + 1 : idx
  }

  // No-op detection: if same parent, adjust target for removal
  if (oldParentId === newParentId && currentIndexInOldParent !== -1) {
    const adjustedTarget = targetIndex > currentIndexInOldParent
      ? targetIndex - 1
      : targetIndex
    if (adjustedTarget === currentIndexInOldParent) {
      return state
    }
  }

  // Remove dragged from old parent
  const filtered = oldList.filter(id => id !== dragged.id)
  byParent.set(oldParentId, filtered)

  // Insert dragged into new parent
  const newList = [...(byParent.get(newParentId) ?? [])]
  let insertIndex: number

  if (isInto) {
    insertIndex = 0
  } else if (isEnd) {
    insertIndex = newList.length
  } else {
    const idx = newList.indexOf(zoneTargetId)
    insertIndex = idx === -1 ? newList.length : isAfter ? idx + 1 : idx
  }

  newList.splice(insertIndex, 0, dragged.id)
  byParent.set(newParentId, newList)

  // Compute new order value
  let newOrder: number | string = dragged.order
  if (orderingStrategy === 'fractional') {
    const siblings = newList
    const movedIdx = siblings.indexOf(dragged.id)
    const prevId = movedIdx > 0 ? siblings[movedIdx - 1] : null
    const nextId = movedIdx < siblings.length - 1 ? siblings[movedIdx + 1] : null
    const prevOrder = prevId ? String(byId.get(prevId)!.order) : null
    const nextOrder = nextId ? String(byId.get(nextId)!.order) : null
    newOrder = generateKeyBetween(prevOrder, nextOrder)
  }

  byId.set(dragged.id, {
    ...dragged,
    parentId: newParentId,
    order: newOrder,
  })

  return { byId, byParent }
}

/**
 * Compute the depth of a block by walking its parentId chain.
 * Root-level blocks have depth 1.
 */
export function getBlockDepth<T extends BaseBlock>(
  index: BlockIndex<T>,
  blockId: string
): number {
  let depth = 0
  let current: string | null = blockId
  const visited = new Set<string>()
  while (current !== null) {
    if (visited.has(current)) break
    visited.add(current)
    depth++
    const block = index.byId.get(current)
    current = block?.parentId ?? null
  }
  return depth
}

/**
 * Compute the maximum depth of a subtree rooted at blockId (inclusive).
 * A leaf block returns 1.
 */
export function getSubtreeDepth<T extends BaseBlock>(
  index: BlockIndex<T>,
  blockId: string,
  visited = new Set<string>()
): number {
  if (visited.has(blockId)) return 0
  visited.add(blockId)
  const children = index.byParent.get(blockId) ?? []
  if (children.length === 0) return 1
  let max = 0
  for (const childId of children) {
    max = Math.max(max, getSubtreeDepth(index, childId, visited))
  }
  return 1 + max
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
 * Reparent multiple blocks to a target zone, preserving their relative order.
 * The first block in `blockIds` is treated as the primary (anchor) block.
 */
export function reparentMultipleBlocks<T extends BaseBlock>(
  state: BlockIndex<T>,
  blockIds: string[],
  targetZone: string,
  containerTypes: readonly string[] = [],
  orderingStrategy: OrderingStrategy = 'integer',
  maxDepth?: number
): BlockIndex<T> {
  if (blockIds.length === 0) return state
  if (blockIds.length === 1) {
    return reparentBlockIndex(state, blockIds[0], targetZone, containerTypes, orderingStrategy, maxDepth)
  }

  // Move the primary block first
  let result = reparentBlockIndex(state, blockIds[0], targetZone, containerTypes, orderingStrategy, maxDepth)
  if (result === state) return state // move was rejected

  // Move remaining blocks after the primary, preserving relative order
  for (let i = 1; i < blockIds.length; i++) {
    result = reparentBlockIndex(result, blockIds[i], `after-${blockIds[i - 1]}`, containerTypes, orderingStrategy, maxDepth)
  }

  return result
}

/**
 * Result of validating a block tree
 */
export interface TreeValidationResult {
  valid: boolean
  issues: string[]
}

/**
 * Validate a block tree index for structural integrity.
 */
export function validateBlockTree<T extends BaseBlock>(
  index: BlockIndex<T>
): TreeValidationResult {
  const issues: string[] = []

  // Check for cycles
  for (const [id] of index.byId) {
    const visited = new Set<string>()
    let current: string | null = id
    while (current !== null) {
      if (visited.has(current)) {
        issues.push(`Cycle detected: block "${id}" has a circular parentId chain`)
        break
      }
      visited.add(current)
      const block = index.byId.get(current)
      current = block?.parentId ?? null
    }
  }

  // Check for orphans
  for (const [id, block] of index.byId) {
    if (block.parentId !== null && !index.byId.has(block.parentId)) {
      issues.push(`Orphan: block "${id}" references non-existent parent "${block.parentId}"`)
    }
  }

  // Check for stale refs
  for (const [parentId, childIds] of index.byParent) {
    for (const childId of childIds) {
      if (!index.byId.has(childId)) {
        issues.push(`Stale ref: byParent key "${parentId}" lists non-existent block "${childId}"`)
      }
    }
  }

  if (issues.length > 0) {
    for (const issue of issues) {
      console.warn(`[dnd-block-tree] ${issue}`)
    }
  }

  return { valid: issues.length === 0, issues }
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
