import { describe, it, expect } from 'vitest'
import {
  cloneMap,
  cloneParentMap,
  computeNormalizedIndex,
  buildOrderedBlocks,
  reparentBlockIndex,
  reparentMultipleBlocks,
  getDescendantIds,
  deleteBlockAndDescendants,
} from './blocks'
import type { BaseBlock } from '../core/types'
import { generateNKeysBetween, compareFractionalKeys } from './fractional'

interface TestBlock extends BaseBlock {
  type: 'container' | 'item'
  title: string
}

const createBlock = (
  id: string,
  type: TestBlock['type'],
  parentId: string | null,
  order: number | string
): TestBlock => ({
  id,
  type,
  parentId,
  order,
  title: `Block ${id}`,
})

describe('cloneMap', () => {
  it('creates a shallow copy of a Map', () => {
    const original = new Map([['a', 1], ['b', 2]])
    const cloned = cloneMap(original)

    expect(cloned).toEqual(original)
    expect(cloned).not.toBe(original)

    // Modifying clone should not affect original
    cloned.set('c', 3)
    expect(original.has('c')).toBe(false)
  })
})

describe('cloneParentMap', () => {
  it('creates a deep copy of parent map with arrays', () => {
    const original = new Map<string | null, string[]>([
      [null, ['1', '2']],
      ['1', ['3', '4']],
    ])
    const cloned = cloneParentMap(original)

    expect(cloned).toEqual(original)
    expect(cloned).not.toBe(original)

    // Arrays should also be cloned
    cloned.get(null)!.push('5')
    expect(original.get(null)).toEqual(['1', '2'])
  })
})

describe('computeNormalizedIndex', () => {
  it('creates byId map from blocks array', () => {
    const blocks: TestBlock[] = [
      createBlock('1', 'container', null, 0),
      createBlock('2', 'item', '1', 0),
    ]

    const index = computeNormalizedIndex(blocks)

    expect(index.byId.size).toBe(2)
    expect(index.byId.get('1')).toEqual(blocks[0])
    expect(index.byId.get('2')).toEqual(blocks[1])
  })

  it('creates byParent map from blocks array', () => {
    const blocks: TestBlock[] = [
      createBlock('1', 'container', null, 0),
      createBlock('2', 'item', '1', 0),
      createBlock('3', 'item', '1', 1),
      createBlock('4', 'container', null, 1),
    ]

    const index = computeNormalizedIndex(blocks)

    expect(index.byParent.get(null)).toEqual(['1', '4'])
    expect(index.byParent.get('1')).toEqual(['2', '3'])
  })

  it('handles empty blocks array', () => {
    const index = computeNormalizedIndex([])

    expect(index.byId.size).toBe(0)
    expect(index.byParent.size).toBe(0)
  })
})

describe('buildOrderedBlocks', () => {
  it('builds flat array from index with correct order', () => {
    const blocks: TestBlock[] = [
      createBlock('1', 'container', null, 0),
      createBlock('2', 'item', '1', 0),
      createBlock('3', 'item', '1', 1),
    ]
    const index = computeNormalizedIndex(blocks)

    const ordered = buildOrderedBlocks(index, ['container'])

    expect(ordered.map(b => b.id)).toEqual(['1', '2', '3'])
  })

  it('recursively walks container children', () => {
    const blocks: TestBlock[] = [
      createBlock('1', 'container', null, 0),
      createBlock('2', 'container', '1', 0),
      createBlock('3', 'item', '2', 0),
      createBlock('4', 'item', null, 1),
    ]
    const index = computeNormalizedIndex(blocks)

    const ordered = buildOrderedBlocks(index, ['container'])

    expect(ordered.map(b => b.id)).toEqual(['1', '2', '3', '4'])
  })

  it('updates order property based on position', () => {
    const blocks: TestBlock[] = [
      createBlock('1', 'item', null, 5),
      createBlock('2', 'item', null, 10),
    ]
    const index = computeNormalizedIndex(blocks)

    const ordered = buildOrderedBlocks(index, [])

    expect(ordered[0].order).toBe(0)
    expect(ordered[1].order).toBe(1)
  })
})

describe('reparentBlockIndex', () => {
  it('moves block after another block', () => {
    const blocks: TestBlock[] = [
      createBlock('1', 'item', null, 0),
      createBlock('2', 'item', null, 1),
      createBlock('3', 'item', null, 2),
    ]
    const index = computeNormalizedIndex(blocks)

    const result = reparentBlockIndex(index, '1', 'after-3', [])

    expect(result.byParent.get(null)).toEqual(['2', '3', '1'])
  })

  it('moves block before another block', () => {
    const blocks: TestBlock[] = [
      createBlock('1', 'item', null, 0),
      createBlock('2', 'item', null, 1),
      createBlock('3', 'item', null, 2),
    ]
    const index = computeNormalizedIndex(blocks)

    const result = reparentBlockIndex(index, '3', 'before-1', [])

    expect(result.byParent.get(null)).toEqual(['3', '1', '2'])
  })

  it('moves block into a container', () => {
    const blocks: TestBlock[] = [
      createBlock('1', 'container', null, 0),
      createBlock('2', 'item', null, 1),
    ]
    const index = computeNormalizedIndex(blocks)

    const result = reparentBlockIndex(index, '2', 'into-1', ['container'])

    expect(result.byParent.get(null)).toEqual(['1'])
    expect(result.byParent.get('1')).toEqual(['2'])
    expect(result.byId.get('2')!.parentId).toBe('1')
  })

  it('returns unchanged state when dropping on self', () => {
    const blocks: TestBlock[] = [
      createBlock('1', 'item', null, 0),
      createBlock('2', 'item', null, 1),
    ]
    const index = computeNormalizedIndex(blocks)

    const result = reparentBlockIndex(index, '1', 'after-1', [])

    expect(result).toBe(index)
  })

  it('returns unchanged state when block not found', () => {
    const blocks: TestBlock[] = [
      createBlock('1', 'item', null, 0),
    ]
    const index = computeNormalizedIndex(blocks)

    const result = reparentBlockIndex(index, 'nonexistent', 'after-1', [])

    expect(result).toBe(index)
  })
})

describe('getDescendantIds', () => {
  it('returns all descendant IDs including the parent', () => {
    const blocks: TestBlock[] = [
      createBlock('1', 'container', null, 0),
      createBlock('2', 'container', '1', 0),
      createBlock('3', 'item', '2', 0),
      createBlock('4', 'item', '1', 1),
    ]
    const index = computeNormalizedIndex(blocks)

    const descendants = getDescendantIds(index, '1')

    expect(descendants).toContain('1')
    expect(descendants).toContain('2')
    expect(descendants).toContain('3')
    expect(descendants).toContain('4')
    expect(descendants.size).toBe(4)
  })

  it('returns single item for leaf nodes', () => {
    const blocks: TestBlock[] = [
      createBlock('1', 'container', null, 0),
      createBlock('2', 'item', '1', 0),
    ]
    const index = computeNormalizedIndex(blocks)

    const descendants = getDescendantIds(index, '2')

    expect(descendants.size).toBe(1)
    expect(descendants).toContain('2')
  })
})

describe('deleteBlockAndDescendants', () => {
  it('removes block and all descendants', () => {
    const blocks: TestBlock[] = [
      createBlock('1', 'container', null, 0),
      createBlock('2', 'item', '1', 0),
      createBlock('3', 'item', '1', 1),
      createBlock('4', 'item', null, 1),
    ]
    const index = computeNormalizedIndex(blocks)

    const result = deleteBlockAndDescendants(index, '1')

    expect(result.byId.has('1')).toBe(false)
    expect(result.byId.has('2')).toBe(false)
    expect(result.byId.has('3')).toBe(false)
    expect(result.byId.has('4')).toBe(true)
    expect(result.byParent.get(null)).toEqual(['4'])
  })

  it('removes nested descendants', () => {
    const blocks: TestBlock[] = [
      createBlock('1', 'container', null, 0),
      createBlock('2', 'container', '1', 0),
      createBlock('3', 'item', '2', 0),
    ]
    const index = computeNormalizedIndex(blocks)

    const result = deleteBlockAndDescendants(index, '1')

    expect(result.byId.size).toBe(0)
    expect(result.byParent.get(null)).toEqual([])
  })
})

describe('reparentBlockIndex -- end/after zones', () => {
  it('moves item to root-end with last item being a container', () => {
    const blocks: TestBlock[] = [
      createBlock('1', 'item', null, 0),
      createBlock('2', 'container', null, 1),
      createBlock('3', 'item', '2', 0),
    ]
    const index = computeNormalizedIndex(blocks)

    const result = reparentBlockIndex(index, '1', 'root-end', ['container'])

    expect(result.byParent.get(null)).toEqual(['2', '1'])
  })

  it('moves item to after-{lastContainer} at root level', () => {
    const blocks: TestBlock[] = [
      createBlock('1', 'item', null, 0),
      createBlock('2', 'container', null, 1),
      createBlock('3', 'item', '2', 0),
    ]
    const index = computeNormalizedIndex(blocks)

    const result = reparentBlockIndex(index, '1', 'after-2', ['container'])

    expect(result.byParent.get(null)).toEqual(['2', '1'])
  })

  it('moves item to end-{container} (into container at end)', () => {
    const blocks: TestBlock[] = [
      createBlock('1', 'container', null, 0),
      createBlock('2', 'item', '1', 0),
      createBlock('3', 'item', null, 1),
    ]
    const index = computeNormalizedIndex(blocks)

    const result = reparentBlockIndex(index, '3', 'end-1', ['container'])

    expect(result.byParent.get('1')).toEqual(['2', '3'])
    expect(result.byId.get('3')!.parentId).toBe('1')
  })

  it('moves item to into-{container} (empty container)', () => {
    const blocks: TestBlock[] = [
      createBlock('1', 'container', null, 0),
      createBlock('2', 'item', null, 1),
    ]
    const index = computeNormalizedIndex(blocks)

    const result = reparentBlockIndex(index, '2', 'into-1', ['container'])

    expect(result.byParent.get('1')).toEqual(['2'])
    expect(result.byId.get('2')!.parentId).toBe('1')
  })

  it('moves item to into-{container} (container has children)', () => {
    const blocks: TestBlock[] = [
      createBlock('1', 'container', null, 0),
      createBlock('2', 'item', '1', 0),
      createBlock('3', 'item', '1', 1),
      createBlock('4', 'item', null, 1),
    ]
    const index = computeNormalizedIndex(blocks)

    const result = reparentBlockIndex(index, '4', 'into-1', ['container'])

    expect(result.byParent.get('1')).toEqual(['4', '2', '3'])
    expect(result.byId.get('4')!.parentId).toBe('1')
  })
})

describe('reparentBlockIndex -- same-parent moves', () => {
  it('moves first to last within same parent', () => {
    const blocks: TestBlock[] = [
      createBlock('1', 'container', null, 0),
      createBlock('a', 'item', '1', 0),
      createBlock('b', 'item', '1', 1),
      createBlock('c', 'item', '1', 2),
    ]
    const index = computeNormalizedIndex(blocks)

    const result = reparentBlockIndex(index, 'a', 'after-c', ['container'])

    expect(result.byParent.get('1')).toEqual(['b', 'c', 'a'])
  })

  it('moves last to first within same parent', () => {
    const blocks: TestBlock[] = [
      createBlock('1', 'container', null, 0),
      createBlock('a', 'item', '1', 0),
      createBlock('b', 'item', '1', 1),
      createBlock('c', 'item', '1', 2),
    ]
    const index = computeNormalizedIndex(blocks)

    const result = reparentBlockIndex(index, 'c', 'into-1', ['container'])

    expect(result.byParent.get('1')).toEqual(['c', 'a', 'b'])
  })

  it('no-op: drop block back at current position (same ref)', () => {
    const blocks: TestBlock[] = [
      createBlock('1', 'item', null, 0),
      createBlock('2', 'item', null, 1),
      createBlock('3', 'item', null, 2),
    ]
    const index = computeNormalizedIndex(blocks)

    // Dropping '2' after '1' means it stays at index 1
    const result = reparentBlockIndex(index, '2', 'after-1', [])

    expect(result).toBe(index)
  })

  it('no-op: drop first block on into-{parent} (already first)', () => {
    const blocks: TestBlock[] = [
      createBlock('1', 'container', null, 0),
      createBlock('a', 'item', '1', 0),
      createBlock('b', 'item', '1', 1),
    ]
    const index = computeNormalizedIndex(blocks)

    const result = reparentBlockIndex(index, 'a', 'into-1', ['container'])

    expect(result).toBe(index)
  })

  it('no-op: drop last block on end-{parent} (already last)', () => {
    const blocks: TestBlock[] = [
      createBlock('1', 'container', null, 0),
      createBlock('a', 'item', '1', 0),
      createBlock('b', 'item', '1', 1),
    ]
    const index = computeNormalizedIndex(blocks)

    const result = reparentBlockIndex(index, 'b', 'end-1', ['container'])

    expect(result).toBe(index)
  })
})

describe('reparentBlockIndex -- fractional ordering', () => {
  function createFractionalBlocks() {
    const keys = generateNKeysBetween(null, null, 3)
    return [
      createBlock('1', 'container', null, keys[0]),
      createBlock('2', 'item', null, keys[1]),
      createBlock('3', 'item', null, keys[2]),
    ]
  }

  function createFractionalContainerBlocks() {
    const rootKeys = generateNKeysBetween(null, null, 1)
    const childKeys = generateNKeysBetween(null, null, 3)
    return [
      createBlock('p', 'container', null, rootKeys[0]),
      createBlock('a', 'item', 'p', childKeys[0]),
      createBlock('b', 'item', 'p', childKeys[1]),
      createBlock('c', 'item', 'p', childKeys[2]),
    ]
  }

  it('move to first position: generated key < first child key', () => {
    const blocks = createFractionalBlocks()
    const index = computeNormalizedIndex(blocks, 'fractional')

    const result = reparentBlockIndex(index, '3', 'root-start', [], 'fractional')

    const order = result.byParent.get(null)!
    expect(order[0]).toBe('3')
    const movedKey = String(result.byId.get('3')!.order)
    const nextKey = String(result.byId.get(order[1])!.order)
    expect(compareFractionalKeys(movedKey, nextKey)).toBe(-1)
  })

  it('move to last position: generated key > last child key', () => {
    const blocks = createFractionalBlocks()
    const index = computeNormalizedIndex(blocks, 'fractional')

    const result = reparentBlockIndex(index, '1', 'root-end', [], 'fractional')

    const order = result.byParent.get(null)!
    expect(order[order.length - 1]).toBe('1')
    const movedKey = String(result.byId.get('1')!.order)
    const prevKey = String(result.byId.get(order[order.length - 2])!.order)
    expect(compareFractionalKeys(prevKey, movedKey)).toBe(-1)
  })

  it('move between two items: key is between neighbors', () => {
    const blocks = createFractionalBlocks()
    const index = computeNormalizedIndex(blocks, 'fractional')

    // Move '3' to after '1' (between '1' and '2')
    const result = reparentBlockIndex(index, '3', 'after-1', [], 'fractional')

    const order = result.byParent.get(null)!
    expect(order).toEqual(['1', '3', '2'])
    const key1 = String(result.byId.get('1')!.order)
    const key3 = String(result.byId.get('3')!.order)
    const key2 = String(result.byId.get('2')!.order)
    expect(compareFractionalKeys(key1, key3)).toBe(-1)
    expect(compareFractionalKeys(key3, key2)).toBe(-1)
  })

  it('same-parent no-op returns same ref with fractional ordering', () => {
    const blocks = createFractionalContainerBlocks()
    const index = computeNormalizedIndex(blocks, 'fractional')

    const result = reparentBlockIndex(index, 'a', 'into-p', ['container'], 'fractional')

    expect(result).toBe(index)
  })

  it('same-parent first-to-last with fractional ordering', () => {
    const blocks = createFractionalContainerBlocks()
    const index = computeNormalizedIndex(blocks, 'fractional')

    const result = reparentBlockIndex(index, 'a', 'end-p', ['container'], 'fractional')

    expect(result.byParent.get('p')).toEqual(['b', 'c', 'a'])
    const keyB = String(result.byId.get('b')!.order)
    const keyC = String(result.byId.get('c')!.order)
    const keyA = String(result.byId.get('a')!.order)
    expect(compareFractionalKeys(keyB, keyC)).toBe(-1)
    expect(compareFractionalKeys(keyC, keyA)).toBe(-1)
  })

  it('same-parent last-to-first with fractional ordering', () => {
    const blocks = createFractionalContainerBlocks()
    const index = computeNormalizedIndex(blocks, 'fractional')

    const result = reparentBlockIndex(index, 'c', 'into-p', ['container'], 'fractional')

    expect(result.byParent.get('p')).toEqual(['c', 'a', 'b'])
    const keyC = String(result.byId.get('c')!.order)
    const keyA = String(result.byId.get('a')!.order)
    const keyB = String(result.byId.get('b')!.order)
    expect(compareFractionalKeys(keyC, keyA)).toBe(-1)
    expect(compareFractionalKeys(keyA, keyB)).toBe(-1)
  })

  it('sequential moves maintain correct sort order', () => {
    const keys = generateNKeysBetween(null, null, 4)
    const blocks: TestBlock[] = [
      createBlock('a', 'item', null, keys[0]),
      createBlock('b', 'item', null, keys[1]),
      createBlock('c', 'item', null, keys[2]),
      createBlock('d', 'item', null, keys[3]),
    ]
    let index = computeNormalizedIndex(blocks, 'fractional')

    // Move 'd' to first
    index = reparentBlockIndex(index, 'd', 'root-start', [], 'fractional')
    // Move 'a' to after 'c'
    index = reparentBlockIndex(index, 'a', 'after-c', [], 'fractional')

    const order = index.byParent.get(null)!
    expect(order).toEqual(['d', 'b', 'c', 'a'])
    // Verify all keys sort correctly
    for (let i = 0; i < order.length - 1; i++) {
      const k1 = String(index.byId.get(order[i])!.order)
      const k2 = String(index.byId.get(order[i + 1])!.order)
      expect(compareFractionalKeys(k1, k2)).toBe(-1)
    }
  })
})

describe('reparentBlockIndex -- end/after zones with fractional ordering', () => {
  it('moves item to root-end with last item being a container (fractional)', () => {
    const keys = generateNKeysBetween(null, null, 2)
    const childKeys = generateNKeysBetween(null, null, 1)
    const blocks: TestBlock[] = [
      createBlock('1', 'item', null, keys[0]),
      createBlock('2', 'container', null, keys[1]),
      createBlock('3', 'item', '2', childKeys[0]),
    ]
    const index = computeNormalizedIndex(blocks, 'fractional')

    const result = reparentBlockIndex(index, '1', 'root-end', ['container'], 'fractional')

    expect(result.byParent.get(null)).toEqual(['2', '1'])
    const key2 = String(result.byId.get('2')!.order)
    const key1 = String(result.byId.get('1')!.order)
    expect(compareFractionalKeys(key2, key1)).toBe(-1)
  })

  it('moves item to end-{container} with fractional ordering', () => {
    const rootKeys = generateNKeysBetween(null, null, 2)
    const childKeys = generateNKeysBetween(null, null, 1)
    const blocks: TestBlock[] = [
      createBlock('1', 'container', null, rootKeys[0]),
      createBlock('2', 'item', '1', childKeys[0]),
      createBlock('3', 'item', null, rootKeys[1]),
    ]
    const index = computeNormalizedIndex(blocks, 'fractional')

    const result = reparentBlockIndex(index, '3', 'end-1', ['container'], 'fractional')

    expect(result.byParent.get('1')).toEqual(['2', '3'])
    const key2 = String(result.byId.get('2')!.order)
    const key3 = String(result.byId.get('3')!.order)
    expect(compareFractionalKeys(key2, key3)).toBe(-1)
  })

  it('moves item to into-{container} with fractional ordering (has children)', () => {
    const rootKeys = generateNKeysBetween(null, null, 2)
    const childKeys = generateNKeysBetween(null, null, 2)
    const blocks: TestBlock[] = [
      createBlock('1', 'container', null, rootKeys[0]),
      createBlock('a', 'item', '1', childKeys[0]),
      createBlock('b', 'item', '1', childKeys[1]),
      createBlock('3', 'item', null, rootKeys[1]),
    ]
    const index = computeNormalizedIndex(blocks, 'fractional')

    const result = reparentBlockIndex(index, '3', 'into-1', ['container'], 'fractional')

    expect(result.byParent.get('1')).toEqual(['3', 'a', 'b'])
    const key3 = String(result.byId.get('3')!.order)
    const keyA = String(result.byId.get('a')!.order)
    expect(compareFractionalKeys(key3, keyA)).toBe(-1)
  })
})

describe('reparentMultipleBlocks', () => {
  it('multi-block move preserves relative order', () => {
    const blocks: TestBlock[] = [
      createBlock('1', 'container', null, 0),
      createBlock('a', 'item', null, 1),
      createBlock('b', 'item', null, 2),
      createBlock('c', 'item', null, 3),
    ]
    const index = computeNormalizedIndex(blocks)

    const result = reparentMultipleBlocks(index, ['a', 'c'], 'into-1', ['container'])

    expect(result.byParent.get('1')).toEqual(['a', 'c'])
    expect(result.byParent.get(null)).toEqual(['1', 'b'])
  })

  it('multi-block move with fractional ordering produces correctly sorted keys', () => {
    const rootKeys = generateNKeysBetween(null, null, 4)
    const blocks: TestBlock[] = [
      createBlock('1', 'container', null, rootKeys[0]),
      createBlock('a', 'item', null, rootKeys[1]),
      createBlock('b', 'item', null, rootKeys[2]),
      createBlock('c', 'item', null, rootKeys[3]),
    ]
    const index = computeNormalizedIndex(blocks, 'fractional')

    const result = reparentMultipleBlocks(index, ['a', 'c'], 'into-1', ['container'], 'fractional')

    const childOrder = result.byParent.get('1')!
    expect(childOrder).toEqual(['a', 'c'])
    const keyA = String(result.byId.get('a')!.order)
    const keyC = String(result.byId.get('c')!.order)
    expect(compareFractionalKeys(keyA, keyC)).toBe(-1)
  })
})
