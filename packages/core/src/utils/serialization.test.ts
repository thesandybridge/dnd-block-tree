import { describe, it, expect } from 'vitest'
import type { BaseBlock } from '../types'
import { flatToNested, nestedToFlat, type NestedBlock } from './serialization'

interface TestBlock extends BaseBlock {
  type: 'section' | 'task'
  title: string
}

const sampleBlocks: TestBlock[] = [
  { id: '1', type: 'section', parentId: null, order: 0, title: 'Section A' },
  { id: '2', type: 'task', parentId: '1', order: 0, title: 'Task 1' },
  { id: '3', type: 'task', parentId: '1', order: 1, title: 'Task 2' },
  { id: '4', type: 'section', parentId: null, order: 1, title: 'Section B' },
  { id: '5', type: 'task', parentId: '4', order: 0, title: 'Task 3' },
]

describe('flatToNested', () => {
  it('converts flat array to nested tree', () => {
    const nested = flatToNested(sampleBlocks)

    expect(nested).toHaveLength(2)
    expect(nested[0].id).toBe('1')
    expect(nested[0].title).toBe('Section A')
    expect(nested[0].children).toHaveLength(2)
    expect(nested[0].children[0].id).toBe('2')
    expect(nested[0].children[1].id).toBe('3')
    expect(nested[1].id).toBe('4')
    expect(nested[1].children).toHaveLength(1)
    expect(nested[1].children[0].id).toBe('5')
  })

  it('omits parentId and order from nested blocks', () => {
    const nested = flatToNested(sampleBlocks)
    const node = nested[0] as Record<string, unknown>

    expect(node).not.toHaveProperty('parentId')
    expect(node).not.toHaveProperty('order')
  })

  it('preserves extra fields', () => {
    const nested = flatToNested(sampleBlocks)

    expect(nested[0].title).toBe('Section A')
    expect(nested[0].type).toBe('section')
  })

  it('sorts siblings by order', () => {
    const unordered: TestBlock[] = [
      { id: '1', type: 'section', parentId: null, order: 2, title: 'C' },
      { id: '2', type: 'section', parentId: null, order: 0, title: 'A' },
      { id: '3', type: 'section', parentId: null, order: 1, title: 'B' },
    ]
    const nested = flatToNested(unordered)

    expect(nested[0].title).toBe('A')
    expect(nested[1].title).toBe('B')
    expect(nested[2].title).toBe('C')
  })

  it('handles fractional string ordering', () => {
    const blocks: TestBlock[] = [
      { id: '1', type: 'task', parentId: null, order: 'b', title: 'Second' },
      { id: '2', type: 'task', parentId: null, order: 'a', title: 'First' },
      { id: '3', type: 'task', parentId: null, order: 'c', title: 'Third' },
    ]
    const nested = flatToNested(blocks)

    expect(nested[0].title).toBe('First')
    expect(nested[1].title).toBe('Second')
    expect(nested[2].title).toBe('Third')
  })

  it('returns empty array for empty input', () => {
    expect(flatToNested([])).toEqual([])
  })

  it('handles deeply nested structures', () => {
    const deep: TestBlock[] = [
      { id: '1', type: 'section', parentId: null, order: 0, title: 'Root' },
      { id: '2', type: 'section', parentId: '1', order: 0, title: 'Child' },
      { id: '3', type: 'task', parentId: '2', order: 0, title: 'Grandchild' },
    ]
    const nested = flatToNested(deep)

    expect(nested[0].children[0].children[0].id).toBe('3')
  })
})

describe('nestedToFlat', () => {
  it('converts nested tree back to flat array', () => {
    const nested = flatToNested(sampleBlocks)
    const flat = nestedToFlat<TestBlock>(nested)

    expect(flat).toHaveLength(5)
    expect(flat.every(b => typeof b.parentId !== 'undefined')).toBe(true)
    expect(flat.every(b => typeof b.order === 'number')).toBe(true)
  })

  it('assigns correct parentIds', () => {
    const nested = flatToNested(sampleBlocks)
    const flat = nestedToFlat<TestBlock>(nested)

    const byId = new Map(flat.map(b => [b.id, b]))
    expect(byId.get('1')!.parentId).toBeNull()
    expect(byId.get('2')!.parentId).toBe('1')
    expect(byId.get('3')!.parentId).toBe('1')
    expect(byId.get('4')!.parentId).toBeNull()
    expect(byId.get('5')!.parentId).toBe('4')
  })

  it('assigns correct integer order', () => {
    const nested = flatToNested(sampleBlocks)
    const flat = nestedToFlat<TestBlock>(nested)

    const byId = new Map(flat.map(b => [b.id, b]))
    expect(byId.get('1')!.order).toBe(0)
    expect(byId.get('4')!.order).toBe(1)
    expect(byId.get('2')!.order).toBe(0)
    expect(byId.get('3')!.order).toBe(1)
    expect(byId.get('5')!.order).toBe(0)
  })

  it('preserves extra fields through roundtrip', () => {
    const nested = flatToNested(sampleBlocks)
    const flat = nestedToFlat<TestBlock>(nested)

    const byId = new Map(flat.map(b => [b.id, b]))
    expect(byId.get('1')!.title).toBe('Section A')
    expect(byId.get('1')!.type).toBe('section')
    expect(byId.get('2')!.title).toBe('Task 1')
  })

  it('returns empty array for empty input', () => {
    expect(nestedToFlat([])).toEqual([])
  })

  it('roundtrip preserves structure', () => {
    const nested = flatToNested(sampleBlocks)
    const flat = nestedToFlat<TestBlock>(nested)
    const nested2 = flatToNested(flat)

    expect(nested2).toEqual(nested)
  })
})

describe('roundtrip: flatToNested -> nestedToFlat', () => {
  it('produces equivalent blocks after roundtrip', () => {
    const nested = flatToNested(sampleBlocks)
    const flat = nestedToFlat<TestBlock>(nested)

    // Should have same IDs
    const originalIds = sampleBlocks.map(b => b.id).sort()
    const roundtripIds = flat.map(b => b.id).sort()
    expect(roundtripIds).toEqual(originalIds)

    // Parent relationships should be preserved
    const origById = new Map(sampleBlocks.map(b => [b.id, b]))
    const flatById = new Map(flat.map(b => [b.id, b]))
    for (const id of originalIds) {
      expect(flatById.get(id)!.parentId).toBe(origById.get(id)!.parentId)
    }
  })
})
