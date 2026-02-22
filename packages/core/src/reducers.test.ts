import { describe, it, expect } from 'vitest'
import { blockReducer, expandReducer, historyReducer } from './reducers'
import type { ExpandAction, HistoryState, HistoryAction } from './reducers'
import type { BaseBlock, BlockIndex, BlockAction } from './types'
import { computeNormalizedIndex, buildOrderedBlocks } from './utils/blocks'

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

function makeIndex(blocks: TestBlock[]): BlockIndex<TestBlock> {
  return computeNormalizedIndex(blocks)
}

// ============================================================================
// blockReducer
// ============================================================================

describe('blockReducer', () => {
  describe('ADD_ITEM', () => {
    it('adds a block to the index', () => {
      const state = makeIndex([])
      const newBlock = createBlock('1', 'item', null, 0)

      const result = blockReducer(state, { type: 'ADD_ITEM', payload: newBlock })

      expect(result.byId.get('1')).toEqual(newBlock)
      expect(result.byParent.get(null)).toContain('1')
    })

    it('adds block as child of a parent', () => {
      const parent = createBlock('p', 'container', null, 0)
      const state = makeIndex([parent])
      const child = createBlock('c', 'item', 'p', 0)

      const result = blockReducer(state, { type: 'ADD_ITEM', payload: child })

      expect(result.byId.get('c')).toEqual(child)
      expect(result.byParent.get('p')).toContain('c')
    })

    it('inserts block at correct position based on order', () => {
      const blocks = [
        createBlock('1', 'item', null, 0),
        createBlock('2', 'item', null, 1),
      ]
      const state = makeIndex(blocks)
      const newBlock = createBlock('3', 'item', null, 1)

      const result = blockReducer(state, { type: 'ADD_ITEM', payload: newBlock })

      const rootChildren = result.byParent.get(null)!
      expect(rootChildren[1]).toBe('3')
    })

    it('does not mutate the original state', () => {
      const state = makeIndex([createBlock('1', 'item', null, 0)])
      const newBlock = createBlock('2', 'item', null, 1)

      blockReducer(state, { type: 'ADD_ITEM', payload: newBlock })

      expect(state.byId.has('2')).toBe(false)
    })
  })

  describe('DELETE_ITEM', () => {
    it('removes a block and its descendants', () => {
      const blocks = [
        createBlock('1', 'container', null, 0),
        createBlock('2', 'item', '1', 0),
        createBlock('3', 'item', null, 1),
      ]
      const state = makeIndex(blocks)

      const result = blockReducer(state, { type: 'DELETE_ITEM', payload: { id: '1' } })

      expect(result.byId.has('1')).toBe(false)
      expect(result.byId.has('2')).toBe(false)
      expect(result.byId.has('3')).toBe(true)
    })

    it('removes leaf block', () => {
      const blocks = [
        createBlock('1', 'item', null, 0),
        createBlock('2', 'item', null, 1),
      ]
      const state = makeIndex(blocks)

      const result = blockReducer(state, { type: 'DELETE_ITEM', payload: { id: '1' } })

      expect(result.byId.has('1')).toBe(false)
      expect(result.byId.has('2')).toBe(true)
    })
  })

  describe('SET_ALL', () => {
    it('replaces all blocks with new set', () => {
      const blocks = [createBlock('1', 'item', null, 0)]
      const state = makeIndex(blocks)
      const newBlocks = [
        createBlock('a', 'item', null, 0),
        createBlock('b', 'item', null, 1),
      ]

      const result = blockReducer(state, { type: 'SET_ALL', payload: newBlocks })

      expect(result.byId.has('1')).toBe(false)
      expect(result.byId.has('a')).toBe(true)
      expect(result.byId.has('b')).toBe(true)
    })

    it('handles empty array', () => {
      const state = makeIndex([createBlock('1', 'item', null, 0)])

      const result = blockReducer(state, { type: 'SET_ALL', payload: [] })

      expect(result.byId.size).toBe(0)
    })
  })

  describe('MOVE_ITEM', () => {
    it('moves block to after another block', () => {
      const blocks = [
        createBlock('1', 'item', null, 0),
        createBlock('2', 'item', null, 1),
        createBlock('3', 'item', null, 2),
      ]
      const state = makeIndex(blocks)

      const result = blockReducer(state, {
        type: 'MOVE_ITEM',
        payload: { activeId: '1', targetZone: 'after-3' },
      })

      expect(result.byParent.get(null)).toEqual(['2', '3', '1'])
    })

    it('moves block into a container', () => {
      const blocks = [
        createBlock('1', 'container', null, 0),
        createBlock('2', 'item', null, 1),
      ]
      const state = makeIndex(blocks)

      const result = blockReducer(
        state,
        { type: 'MOVE_ITEM', payload: { activeId: '2', targetZone: 'into-1' } },
        ['container']
      )

      expect(result.byParent.get('1')).toContain('2')
      expect(result.byId.get('2')!.parentId).toBe('1')
    })

    it('returns same state for no-op move', () => {
      const blocks = [
        createBlock('1', 'item', null, 0),
        createBlock('2', 'item', null, 1),
      ]
      const state = makeIndex(blocks)

      const result = blockReducer(state, {
        type: 'MOVE_ITEM',
        payload: { activeId: '1', targetZone: 'after-1' },
      })

      expect(result).toBe(state)
    })
  })

  describe('INSERT_ITEM', () => {
    it('inserts block at specific index', () => {
      const blocks = [
        createBlock('1', 'item', null, 0),
        createBlock('2', 'item', null, 1),
      ]
      const state = makeIndex(blocks)
      const newBlock = createBlock('3', 'item', null, 1)

      const result = blockReducer(state, {
        type: 'INSERT_ITEM',
        payload: { item: newBlock, parentId: null, index: 1 },
      })

      expect(result.byId.get('3')).toEqual(newBlock)
      const rootChildren = result.byParent.get(null)!
      expect(rootChildren[1]).toBe('3')
      expect(rootChildren).toEqual(['1', '3', '2'])
    })

    it('inserts as child of a parent', () => {
      const blocks = [
        createBlock('p', 'container', null, 0),
        createBlock('a', 'item', 'p', 0),
      ]
      const state = makeIndex(blocks)
      const newBlock = createBlock('b', 'item', 'p', 0)

      const result = blockReducer(state, {
        type: 'INSERT_ITEM',
        payload: { item: newBlock, parentId: 'p', index: 0 },
      })

      expect(result.byParent.get('p')).toEqual(['b', 'a'])
    })
  })

  describe('unknown action', () => {
    it('returns state unchanged for unknown action type', () => {
      const state = makeIndex([createBlock('1', 'item', null, 0)])

      const result = blockReducer(state, { type: 'UNKNOWN' } as any)

      expect(result).toBe(state)
    })
  })
})

// ============================================================================
// expandReducer
// ============================================================================

describe('expandReducer', () => {
  describe('TOGGLE', () => {
    it('toggles false to true', () => {
      const state = { 'a': false }

      const result = expandReducer(state, { type: 'TOGGLE', id: 'a' })

      expect(result['a']).toBe(true)
    })

    it('toggles true to false', () => {
      const state = { 'a': true }

      const result = expandReducer(state, { type: 'TOGGLE', id: 'a' })

      expect(result['a']).toBe(false)
    })

    it('toggles undefined (falsy) to true', () => {
      const state: Record<string, boolean> = {}

      const result = expandReducer(state, { type: 'TOGGLE', id: 'a' })

      expect(result['a']).toBe(true)
    })

    it('does not mutate original state', () => {
      const state = { 'a': true }

      expandReducer(state, { type: 'TOGGLE', id: 'a' })

      expect(state['a']).toBe(true)
    })
  })

  describe('SET_ALL', () => {
    it('sets all IDs to expanded', () => {
      const state: Record<string, boolean> = {}

      const result = expandReducer(state, {
        type: 'SET_ALL',
        expanded: true,
        ids: ['a', 'b', 'c'],
      })

      expect(result).toEqual({ a: true, b: true, c: true })
    })

    it('sets all IDs to collapsed', () => {
      const state = { a: true, b: true }

      const result = expandReducer(state, {
        type: 'SET_ALL',
        expanded: false,
        ids: ['a', 'b'],
      })

      expect(result).toEqual({ a: false, b: false })
    })

    it('replaces existing state entirely', () => {
      const state = { a: true, b: true, c: false }

      const result = expandReducer(state, {
        type: 'SET_ALL',
        expanded: true,
        ids: ['x', 'y'],
      })

      // Old keys should not be present
      expect(result).toEqual({ x: true, y: true })
    })

    it('handles empty ids array', () => {
      const state = { a: true }

      const result = expandReducer(state, {
        type: 'SET_ALL',
        expanded: true,
        ids: [],
      })

      expect(result).toEqual({})
    })
  })

  describe('unknown action', () => {
    it('returns state unchanged for unknown action type', () => {
      const state = { a: true }

      const result = expandReducer(state, { type: 'UNKNOWN' } as any)

      expect(result).toBe(state)
    })
  })
})

// ============================================================================
// historyReducer
// ============================================================================

describe('historyReducer', () => {
  const block1 = createBlock('1', 'item', null, 0)
  const block2 = createBlock('2', 'item', null, 1)
  const block3 = createBlock('3', 'item', null, 2)

  function makeHistoryState(
    present: TestBlock[],
    past: TestBlock[][] = [],
    future: TestBlock[][] = []
  ): HistoryState<TestBlock> {
    return { past, present, future }
  }

  describe('SET', () => {
    it('pushes current present to past and sets new present', () => {
      const state = makeHistoryState([block1])

      const result = historyReducer(state, {
        type: 'SET',
        payload: [block1, block2],
        maxSteps: 50,
      })

      expect(result.present).toEqual([block1, block2])
      expect(result.past).toEqual([[block1]])
      expect(result.future).toEqual([])
    })

    it('clears future on new SET', () => {
      const state = makeHistoryState([block2], [[block1]], [[block3]])

      const result = historyReducer(state, {
        type: 'SET',
        payload: [block1, block2, block3],
        maxSteps: 50,
      })

      expect(result.future).toEqual([])
    })

    it('limits past to maxSteps', () => {
      const past = [[block1], [block2], [block3]]
      const state = makeHistoryState([block1, block2], past)

      const result = historyReducer(state, {
        type: 'SET',
        payload: [block3],
        maxSteps: 3,
      })

      // past had 3 items, we push present (now 4), then shift (back to 3)
      expect(result.past.length).toBeLessThanOrEqual(3)
    })

    it('handles maxSteps = 1', () => {
      const state = makeHistoryState([block1], [[block2]])

      const result = historyReducer(state, {
        type: 'SET',
        payload: [block3],
        maxSteps: 1,
      })

      expect(result.past.length).toBe(1)
      expect(result.past[0]).toEqual([block1])
    })
  })

  describe('UNDO', () => {
    it('restores previous state from past', () => {
      const state = makeHistoryState([block2], [[block1]])

      const result = historyReducer(state, { type: 'UNDO' })

      expect(result.present).toEqual([block1])
      expect(result.past).toEqual([])
      expect(result.future).toEqual([[block2]])
    })

    it('returns same state when past is empty', () => {
      const state = makeHistoryState([block1])

      const result = historyReducer(state, { type: 'UNDO' })

      expect(result).toBe(state)
    })

    it('pushes current present to future', () => {
      const state = makeHistoryState([block3], [[block1], [block2]])

      const result = historyReducer(state, { type: 'UNDO' })

      expect(result.present).toEqual([block2])
      expect(result.past).toEqual([[block1]])
      expect(result.future[0]).toEqual([block3])
    })

    it('supports multiple undos', () => {
      const state = makeHistoryState([block3], [[block1], [block2]])

      const after1 = historyReducer(state, { type: 'UNDO' })
      const after2 = historyReducer(after1, { type: 'UNDO' })

      expect(after2.present).toEqual([block1])
      expect(after2.past).toEqual([])
      expect(after2.future).toEqual([[block2], [block3]])
    })
  })

  describe('REDO', () => {
    it('restores next state from future', () => {
      const state = makeHistoryState([block1], [], [[block2]])

      const result = historyReducer(state, { type: 'REDO' })

      expect(result.present).toEqual([block2])
      expect(result.past).toEqual([[block1]])
      expect(result.future).toEqual([])
    })

    it('returns same state when future is empty', () => {
      const state = makeHistoryState([block1])

      const result = historyReducer(state, { type: 'REDO' })

      expect(result).toBe(state)
    })

    it('supports undo then redo roundtrip', () => {
      const state = makeHistoryState([block2], [[block1]])

      const afterUndo = historyReducer(state, { type: 'UNDO' })
      const afterRedo = historyReducer(afterUndo, { type: 'REDO' })

      expect(afterRedo.present).toEqual([block2])
      expect(afterRedo.past).toEqual([[block1]])
      expect(afterRedo.future).toEqual([])
    })

    it('supports multiple redos', () => {
      const state = makeHistoryState([block1], [], [[block2], [block3]])

      const after1 = historyReducer(state, { type: 'REDO' })
      const after2 = historyReducer(after1, { type: 'REDO' })

      expect(after2.present).toEqual([block3])
      expect(after2.past).toEqual([[block1], [block2]])
      expect(after2.future).toEqual([])
    })
  })

  describe('unknown action', () => {
    it('returns state unchanged for unknown action type', () => {
      const state = makeHistoryState([block1])

      const result = historyReducer(state, { type: 'UNKNOWN' } as any)

      expect(result).toBe(state)
    })
  })
})
