import type { BaseBlock } from '../types'

/**
 * A nested/tree representation of a block.
 * Omits `parentId` and `order` since they are reconstructed during flattening.
 */
export type NestedBlock<T extends BaseBlock> = Omit<T, 'parentId' | 'order'> & {
  children: NestedBlock<T>[]
}

/**
 * Convert a flat block array into a nested tree structure.
 */
export function flatToNested<T extends BaseBlock>(blocks: T[]): NestedBlock<T>[] {
  const byParent = new Map<string | null, T[]>()
  for (const block of blocks) {
    const key = block.parentId ?? null
    const list = byParent.get(key)
    if (list) {
      list.push(block)
    } else {
      byParent.set(key, [block])
    }
  }

  // Sort each group by order
  for (const list of byParent.values()) {
    list.sort((a, b) => {
      if (typeof a.order === 'string' && typeof b.order === 'string') {
        return a.order < b.order ? -1 : a.order > b.order ? 1 : 0
      }
      return Number(a.order) - Number(b.order)
    })
  }

  function buildChildren(parentId: string | null): NestedBlock<T>[] {
    const siblings = byParent.get(parentId) ?? []
    return siblings.map(block => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { parentId: _p, order: _o, ...rest } = block
      return {
        ...rest,
        children: buildChildren(block.id),
      } as NestedBlock<T>
    })
  }

  return buildChildren(null)
}

/**
 * Convert a nested tree structure back to a flat block array.
 */
export function nestedToFlat<T extends BaseBlock>(nested: NestedBlock<T>[]): T[] {
  const result: T[] = []

  function walk(nodes: NestedBlock<T>[], parentId: string | null) {
    for (let i = 0; i < nodes.length; i++) {
      const { children, ...rest } = nodes[i]
      result.push({
        ...rest,
        parentId,
        order: i,
      } as unknown as T)
      walk(children, (rest as { id: string }).id)
    }
  }

  walk(nested, null)
  return result
}
