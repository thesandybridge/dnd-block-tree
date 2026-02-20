import { describe, it, expect } from 'vitest'
import {
  cloneMap,
  cloneParentMap,
  computeNormalizedIndex,
  buildOrderedBlocks,
  reparentBlockIndex,
  getDescendantIds,
  deleteBlockAndDescendants,
} from './blocks'
import type { BaseBlock } from '../core/types'

interface TestBlock extends BaseBlock {
  type: 'container' | 'item'
  title: string
}

const createBlock = (
  id: string,
  type: TestBlock['type'],
  parentId: string | null,
  order: number
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
