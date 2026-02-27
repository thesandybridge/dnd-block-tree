import { describe, it, expect } from 'vitest'
import { mergeBlockVersions } from './merge'
import type { BaseBlock } from '../types'

interface TestBlock extends BaseBlock {
  type: 'item'
  title: string
  completed?: boolean
}

const block = (id: string, title: string, order: number | string = 0, parentId: string | null = null): TestBlock => ({
  id,
  type: 'item',
  title,
  parentId,
  order,
})

describe('mergeBlockVersions', () => {
  it('merges content fields from content and structural fields from structure', () => {
    const content = [block('1', 'Edited Title', 0)]
    const structure = [block('1', 'Original Title', 'k')]

    const result = mergeBlockVersions(content, structure)

    expect(result).toEqual([{ id: '1', type: 'item', title: 'Edited Title', parentId: null, order: 'k' }])
  })

  it('preserves structure ordering', () => {
    const content = [block('1', 'A', 0), block('2', 'B', 1)]
    const structure = [block('2', 'B', 'b'), block('1', 'A', 'a')]

    const result = mergeBlockVersions(content, structure)

    expect(result[0].id).toBe('2')
    expect(result[1].id).toBe('1')
  })

  it('drops blocks only in content (deletions in structure)', () => {
    const content = [block('1', 'A'), block('2', 'B')]
    const structure = [block('1', 'A')]

    const result = mergeBlockVersions(content, structure)

    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('1')
  })

  it('keeps blocks only in structure as-is (additions in structure)', () => {
    const content = [block('1', 'A')]
    const structure = [block('1', 'A'), block('3', 'New', 1)]

    const result = mergeBlockVersions(content, structure)

    expect(result).toHaveLength(2)
    expect(result[1]).toEqual(block('3', 'New', 1))
  })

  it('merges parentId from structure', () => {
    const content = [block('1', 'A', 0, null)]
    const structure = [block('1', 'A', 0, 'parent-1')]

    const result = mergeBlockVersions(content, structure)

    expect(result[0].parentId).toBe('parent-1')
  })

  it('supports custom structural fields', () => {
    interface CustomBlock extends BaseBlock {
      type: 'item'
      title: string
      priority: number
    }

    const content: CustomBlock[] = [
      { id: '1', type: 'item', title: 'Edited', parentId: null, order: 0, priority: 5 },
    ]
    const structure: CustomBlock[] = [
      { id: '1', type: 'item', title: 'Original', parentId: 'p', order: 'k', priority: 1 },
    ]

    const result = mergeBlockVersions(content, structure, {
      structuralFields: ['parentId', 'order', 'priority'],
    })

    expect(result[0].title).toBe('Edited')
    expect(result[0].priority).toBe(1)
    expect(result[0].order).toBe('k')
  })

  it('handles fractional keys', () => {
    const content = [block('1', 'A', 'a'), block('2', 'B', 'b')]
    const structure = [block('2', 'B', 'an'), block('1', 'A', 'b')]

    const result = mergeBlockVersions(content, structure)

    expect(result[0].order).toBe('an')
    expect(result[1].order).toBe('b')
  })

  it('handles empty arrays', () => {
    expect(mergeBlockVersions([], [])).toEqual([])
    expect(mergeBlockVersions([block('1', 'A')], [])).toEqual([])
    expect(mergeBlockVersions([], [block('1', 'A')])).toEqual([block('1', 'A')])
  })
})
