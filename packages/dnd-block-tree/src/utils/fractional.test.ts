import { describe, it, expect } from 'vitest'
import {
  generateKeyBetween,
  generateNKeysBetween,
  generateInitialKeys,
  initFractionalOrder,
  compareFractionalKeys,
} from './fractional'

describe('generateKeyBetween', () => {
  it('returns middle key when both bounds are null', () => {
    const key = generateKeyBetween(null, null)
    expect(typeof key).toBe('string')
    expect(key.length).toBeGreaterThan(0)
  })

  it('returns key strictly less than hi when lo is null', () => {
    const hi = 'i'
    const key = generateKeyBetween(null, hi)
    expect(compareFractionalKeys(key, hi)).toBe(-1)
  })

  it('returns key strictly greater than lo when hi is null', () => {
    const lo = 'i'
    const key = generateKeyBetween(lo, null)
    expect(compareFractionalKeys(lo, key)).toBe(-1)
  })

  it('returns key strictly between lo and hi', () => {
    const lo = 'b'
    const hi = 'f'
    const key = generateKeyBetween(lo, hi)
    expect(compareFractionalKeys(lo, key)).toBe(-1)
    expect(compareFractionalKeys(key, hi)).toBe(-1)
  })

  it('throws when lo >= hi', () => {
    expect(() => generateKeyBetween('f', 'b')).toThrow()
    expect(() => generateKeyBetween('a', 'a')).toThrow()
  })

  it('handles keys near lower alphabet boundary ("0...")', () => {
    const hi = '1'
    const key = generateKeyBetween(null, hi)
    expect(compareFractionalKeys(key, hi)).toBe(-1)

    // Can generate key before that one too
    const key2 = generateKeyBetween(null, key)
    expect(compareFractionalKeys(key2, key)).toBe(-1)
  })

  it('handles keys near upper alphabet boundary ("z...")', () => {
    const lo = 'z'
    const key = generateKeyBetween(lo, null)
    expect(compareFractionalKeys(lo, key)).toBe(-1)

    // Can generate key after that one too
    const key2 = generateKeyBetween(key, null)
    expect(compareFractionalKeys(key, key2)).toBe(-1)
  })

  it('handles very close keys', () => {
    const lo = 'ia'
    const hi = 'ib'
    const key = generateKeyBetween(lo, hi)
    expect(compareFractionalKeys(lo, key)).toBe(-1)
    expect(compareFractionalKeys(key, hi)).toBe(-1)
  })
})

describe('generateNKeysBetween', () => {
  it('returns empty array for n=0', () => {
    expect(generateNKeysBetween(null, null, 0)).toEqual([])
  })

  it('returns single key for n=1', () => {
    const keys = generateNKeysBetween(null, null, 1)
    expect(keys).toHaveLength(1)
  })

  it('returns N sorted keys', () => {
    const keys = generateNKeysBetween(null, null, 10)
    expect(keys).toHaveLength(10)
    for (let i = 0; i < keys.length - 1; i++) {
      expect(compareFractionalKeys(keys[i], keys[i + 1])).toBe(-1)
    }
  })

  it('returns keys between lo and hi', () => {
    const lo = 'b'
    const hi = 'y'
    const keys = generateNKeysBetween(lo, hi, 5)
    expect(compareFractionalKeys(lo, keys[0])).toBe(-1)
    expect(compareFractionalKeys(keys[keys.length - 1], hi)).toBe(-1)
    for (let i = 0; i < keys.length - 1; i++) {
      expect(compareFractionalKeys(keys[i], keys[i + 1])).toBe(-1)
    }
  })
})

describe('generateInitialKeys', () => {
  it('returns sorted keys', () => {
    const keys = generateInitialKeys(5)
    expect(keys).toHaveLength(5)
    for (let i = 0; i < keys.length - 1; i++) {
      expect(compareFractionalKeys(keys[i], keys[i + 1])).toBe(-1)
    }
  })

  it('returns empty array for n=0', () => {
    expect(generateInitialKeys(0)).toEqual([])
  })
})

describe('initFractionalOrder', () => {
  it('assigns valid sortable keys to blocks', () => {
    const blocks = [
      { id: '1', parentId: null, order: 0, type: 'item' },
      { id: '2', parentId: null, order: 1, type: 'item' },
      { id: '3', parentId: null, order: 2, type: 'item' },
    ]

    const result = initFractionalOrder(blocks)

    expect(result).toHaveLength(3)
    // Keys should be strings now
    for (const b of result) {
      expect(typeof b.order).toBe('string')
    }
    // Keys should sort correctly
    for (let i = 0; i < result.length - 1; i++) {
      expect(compareFractionalKeys(String(result[i].order), String(result[i + 1].order))).toBe(-1)
    }
  })

  it('groups siblings by parentId and assigns keys per group', () => {
    const blocks = [
      { id: '1', parentId: null, order: 0, type: 'container' },
      { id: '2', parentId: '1', order: 0, type: 'item' },
      { id: '3', parentId: '1', order: 1, type: 'item' },
      { id: '4', parentId: null, order: 1, type: 'item' },
    ]

    const result = initFractionalOrder(blocks)

    const rootBlocks = result.filter(b => b.parentId === null)
    const childBlocks = result.filter(b => b.parentId === '1')

    expect(compareFractionalKeys(String(rootBlocks[0].order), String(rootBlocks[1].order))).toBe(-1)
    expect(compareFractionalKeys(String(childBlocks[0].order), String(childBlocks[1].order))).toBe(-1)
  })

  it('preserves original block data', () => {
    const blocks = [
      { id: '1', parentId: null, order: 5, type: 'item', extra: 'data' },
    ]

    const result = initFractionalOrder(blocks)

    expect(result[0].id).toBe('1')
    expect(result[0].parentId).toBeNull()
    expect(result[0].type).toBe('item')
    expect((result[0] as typeof blocks[0]).extra).toBe('data')
  })
})

describe('compareFractionalKeys', () => {
  it('returns negative when a < b', () => {
    expect(compareFractionalKeys('a', 'b')).toBe(-1)
  })

  it('returns positive when a > b', () => {
    expect(compareFractionalKeys('b', 'a')).toBe(1)
  })

  it('returns 0 when equal', () => {
    expect(compareFractionalKeys('abc', 'abc')).toBe(0)
  })

  it('ordering is consistent with sort', () => {
    const keys = ['z', 'a', 'm', '0', '9']
    const sorted = [...keys].sort(compareFractionalKeys)
    expect(sorted).toEqual(['0', '9', 'a', 'm', 'z'])
  })
})
