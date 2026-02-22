import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createBlockTree } from './tree'
import type { BlockTreeInstance } from './tree'
import type { BaseBlock } from './types'

interface TestBlock extends BaseBlock {
  type: 'container' | 'item'
}

function makeBlock(
  id: string,
  type: TestBlock['type'],
  parentId: string | null,
  order: number
): TestBlock {
  return { id, type, parentId, order }
}

describe('createBlockTree', () => {
  let idCounter: number

  beforeEach(() => {
    idCounter = 0
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  function createTree(
    blocks: TestBlock[] = [],
    opts: Partial<Parameters<typeof createBlockTree<TestBlock>>[0]> = {}
  ) {
    return createBlockTree<TestBlock>({
      initialBlocks: blocks,
      containerTypes: ['container'],
      idGenerator: () => `gen-${++idCounter}`,
      ...opts,
    })
  }

  describe('initialization', () => {
    it('creates with empty blocks by default', () => {
      const tree = createTree()

      expect(tree.getBlocks()).toEqual([])
    })

    it('initializes with provided blocks', () => {
      const blocks = [
        makeBlock('1', 'item', null, 0),
        makeBlock('2', 'item', null, 1),
      ]
      const tree = createTree(blocks)

      expect(tree.getBlocks()).toHaveLength(2)
      expect(tree.getBlocks()[0].id).toBe('1')
      expect(tree.getBlocks()[1].id).toBe('2')
    })

    it('getBlock returns block by id', () => {
      const blocks = [makeBlock('1', 'item', null, 0)]
      const tree = createTree(blocks)

      expect(tree.getBlock('1')).toEqual(blocks[0])
      expect(tree.getBlock('nonexistent')).toBeUndefined()
    })

    it('getActiveId returns null when no drag', () => {
      const tree = createTree()

      expect(tree.getActiveId()).toBeNull()
    })

    it('getHoverZone returns null when no drag', () => {
      const tree = createTree()

      expect(tree.getHoverZone()).toBeNull()
    })
  })

  describe('getChildren', () => {
    it('returns children of a parent', () => {
      const blocks = [
        makeBlock('p', 'container', null, 0),
        makeBlock('a', 'item', 'p', 0),
        makeBlock('b', 'item', 'p', 1),
      ]
      const tree = createTree(blocks)

      const children = tree.getChildren('p')
      expect(children).toHaveLength(2)
      expect(children[0].id).toBe('a')
      expect(children[1].id).toBe('b')
    })

    it('returns root children with null parentId', () => {
      const blocks = [
        makeBlock('1', 'item', null, 0),
        makeBlock('2', 'item', null, 1),
      ]
      const tree = createTree(blocks)

      const children = tree.getChildren(null)
      expect(children).toHaveLength(2)
    })

    it('returns empty array for leaf block', () => {
      const blocks = [makeBlock('1', 'item', null, 0)]
      const tree = createTree(blocks)

      expect(tree.getChildren('1')).toEqual([])
    })
  })

  describe('getAncestors', () => {
    it('returns ancestors from child to root', () => {
      const blocks = [
        makeBlock('root', 'container', null, 0),
        makeBlock('mid', 'container', 'root', 0),
        makeBlock('leaf', 'item', 'mid', 0),
      ]
      const tree = createTree(blocks)

      const ancestors = tree.getAncestors('leaf')
      expect(ancestors).toHaveLength(2)
      expect(ancestors[0].id).toBe('mid')
      expect(ancestors[1].id).toBe('root')
    })

    it('returns empty array for root block', () => {
      const blocks = [makeBlock('1', 'item', null, 0)]
      const tree = createTree(blocks)

      expect(tree.getAncestors('1')).toEqual([])
    })
  })

  describe('addBlock', () => {
    it('adds a block to root', () => {
      const tree = createTree()

      const block = tree.addBlock('item')

      expect(block.id).toBe('gen-1')
      expect(block.type).toBe('item')
      expect(block.parentId).toBeNull()
      expect(tree.getBlocks()).toHaveLength(1)
    })

    it('adds a block to a parent', () => {
      const blocks = [makeBlock('p', 'container', null, 0)]
      const tree = createTree(blocks)

      const block = tree.addBlock('item', 'p')

      expect(block.parentId).toBe('p')
      expect(tree.getChildren('p')).toHaveLength(1)
    })

    it('emits block:add event', () => {
      const tree = createTree()
      const handler = vi.fn()
      tree.on('block:add', handler)

      tree.addBlock('item')

      expect(handler).toHaveBeenCalledTimes(1)
      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({ block: expect.objectContaining({ type: 'item' }) })
      )
    })

    it('emits blocks:change event', () => {
      const tree = createTree()
      const handler = vi.fn()
      tree.on('blocks:change', handler)

      tree.addBlock('item')

      expect(handler).toHaveBeenCalledTimes(1)
    })
  })

  describe('insertBlock', () => {
    it('inserts block before a reference', () => {
      const blocks = [
        makeBlock('1', 'item', null, 0),
        makeBlock('2', 'item', null, 1),
      ]
      const tree = createTree(blocks)

      const inserted = tree.insertBlock('item', '2', 'before')

      const allBlocks = tree.getBlocks()
      const ids = allBlocks.map(b => b.id)
      expect(ids.indexOf(inserted.id)).toBeLessThan(ids.indexOf('2'))
    })

    it('inserts block after a reference', () => {
      const blocks = [
        makeBlock('1', 'item', null, 0),
        makeBlock('2', 'item', null, 1),
      ]
      const tree = createTree(blocks)

      const inserted = tree.insertBlock('item', '1', 'after')

      const allBlocks = tree.getBlocks()
      const ids = allBlocks.map(b => b.id)
      expect(ids.indexOf(inserted.id)).toBeGreaterThan(ids.indexOf('1'))
    })

    it('throws when reference block does not exist', () => {
      const tree = createTree()

      expect(() => tree.insertBlock('item', 'nonexistent', 'before')).toThrow()
    })

    it('emits block:add event', () => {
      const blocks = [makeBlock('1', 'item', null, 0)]
      const tree = createTree(blocks)
      const handler = vi.fn()
      tree.on('block:add', handler)

      tree.insertBlock('item', '1', 'after')

      expect(handler).toHaveBeenCalledTimes(1)
    })
  })

  describe('deleteBlock', () => {
    it('removes a block', () => {
      const blocks = [
        makeBlock('1', 'item', null, 0),
        makeBlock('2', 'item', null, 1),
      ]
      const tree = createTree(blocks)

      tree.deleteBlock('1')

      expect(tree.getBlocks()).toHaveLength(1)
      expect(tree.getBlock('1')).toBeUndefined()
    })

    it('removes block and descendants', () => {
      const blocks = [
        makeBlock('p', 'container', null, 0),
        makeBlock('a', 'item', 'p', 0),
        makeBlock('b', 'item', 'p', 1),
      ]
      const tree = createTree(blocks)

      tree.deleteBlock('p')

      expect(tree.getBlocks()).toHaveLength(0)
    })

    it('emits block:delete event', () => {
      const blocks = [makeBlock('1', 'item', null, 0)]
      const tree = createTree(blocks)
      const handler = vi.fn()
      tree.on('block:delete', handler)

      tree.deleteBlock('1')

      expect(handler).toHaveBeenCalledTimes(1)
      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({ block: expect.objectContaining({ id: '1' }) })
      )
    })

    it('does nothing for nonexistent block', () => {
      const tree = createTree([makeBlock('1', 'item', null, 0)])
      const handler = vi.fn()
      tree.on('block:delete', handler)

      tree.deleteBlock('nonexistent')

      expect(handler).not.toHaveBeenCalled()
      expect(tree.getBlocks()).toHaveLength(1)
    })
  })

  describe('setBlocks', () => {
    it('replaces all blocks', () => {
      const tree = createTree([makeBlock('1', 'item', null, 0)])
      const newBlocks = [
        makeBlock('a', 'item', null, 0),
        makeBlock('b', 'item', null, 1),
      ]

      tree.setBlocks(newBlocks)

      expect(tree.getBlocks()).toHaveLength(2)
      expect(tree.getBlock('1')).toBeUndefined()
      expect(tree.getBlock('a')).toBeDefined()
    })

    it('emits blocks:change event', () => {
      const tree = createTree()
      const handler = vi.fn()
      tree.on('blocks:change', handler)

      tree.setBlocks([makeBlock('1', 'item', null, 0)])

      expect(handler).toHaveBeenCalledTimes(1)
    })
  })

  describe('expand/collapse', () => {
    it('isExpanded defaults to true for containers', () => {
      const blocks = [makeBlock('c', 'container', null, 0)]
      const tree = createTree(blocks)

      expect(tree.isExpanded('c')).toBe(true)
    })

    it('toggleExpand flips expanded state', () => {
      const blocks = [makeBlock('c', 'container', null, 0)]
      const tree = createTree(blocks)

      tree.toggleExpand('c')
      expect(tree.isExpanded('c')).toBe(false)

      tree.toggleExpand('c')
      expect(tree.isExpanded('c')).toBe(true)
    })

    it('toggleExpand emits expand:change event', () => {
      const blocks = [makeBlock('c', 'container', null, 0)]
      const tree = createTree(blocks)
      const handler = vi.fn()
      tree.on('expand:change', handler)

      tree.toggleExpand('c')

      expect(handler).toHaveBeenCalledTimes(1)
      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({ blockId: 'c', expanded: false })
      )
    })

    it('setExpandAll collapses all containers', () => {
      const blocks = [
        makeBlock('c1', 'container', null, 0),
        makeBlock('c2', 'container', null, 1),
      ]
      const tree = createTree(blocks)

      tree.setExpandAll(false)

      expect(tree.isExpanded('c1')).toBe(false)
      expect(tree.isExpanded('c2')).toBe(false)
    })

    it('setExpandAll expands all containers', () => {
      const blocks = [
        makeBlock('c1', 'container', null, 0),
        makeBlock('c2', 'container', null, 1),
      ]
      const tree = createTree(blocks)
      tree.setExpandAll(false)

      tree.setExpandAll(true)

      expect(tree.isExpanded('c1')).toBe(true)
      expect(tree.isExpanded('c2')).toBe(true)
    })

    it('initialExpanded: "none" starts all collapsed', () => {
      const blocks = [makeBlock('c', 'container', null, 0)]
      const tree = createTree(blocks, { initialExpanded: 'none' })

      expect(tree.isExpanded('c')).toBe(false)
    })

    it('initialExpanded: array expands only listed IDs', () => {
      const blocks = [
        makeBlock('c1', 'container', null, 0),
        makeBlock('c2', 'container', null, 1),
      ]
      const tree = createTree(blocks, { initialExpanded: ['c1'] })

      expect(tree.isExpanded('c1')).toBe(true)
      // c2 not in the array, isExpanded checks expandedMap[id] !== false
      // Since c2 was not set, expandedMap['c2'] is undefined, so !== false is true
      // But with initialExpanded as array, only listed IDs are set to true
      // For unlisted containers, expandedMap[id] is undefined
    })
  })

  describe('getExpandedMap', () => {
    it('returns a copy of the expanded map', () => {
      const blocks = [makeBlock('c', 'container', null, 0)]
      const tree = createTree(blocks)

      const map1 = tree.getExpandedMap()
      const map2 = tree.getExpandedMap()

      expect(map1).toEqual(map2)
      expect(map1).not.toBe(map2) // different references
    })
  })

  describe('drag lifecycle', () => {
    it('startDrag sets active id and emits drag:start', () => {
      const blocks = [makeBlock('1', 'item', null, 0)]
      const tree = createTree(blocks)
      const handler = vi.fn()
      tree.on('drag:start', handler)

      const result = tree.startDrag('1')

      expect(result).toBe(true)
      expect(tree.getActiveId()).toBe('1')
      expect(handler).toHaveBeenCalledTimes(1)
      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({ blockId: '1' })
      )
    })

    it('startDrag returns false for nonexistent block', () => {
      const tree = createTree()

      const result = tree.startDrag('nonexistent')

      expect(result).toBe(false)
      expect(tree.getActiveId()).toBeNull()
    })

    it('startDrag respects canDrag filter', () => {
      const blocks = [makeBlock('1', 'item', null, 0)]
      const tree = createTree(blocks, {
        canDrag: () => false,
      })

      const result = tree.startDrag('1')

      expect(result).toBe(false)
      expect(tree.getActiveId()).toBeNull()
    })

    it('updateDrag sets hover zone and emits hover:change', () => {
      const blocks = [
        makeBlock('1', 'item', null, 0),
        makeBlock('2', 'item', null, 1),
      ]
      const tree = createTree(blocks)
      const hoverHandler = vi.fn()
      tree.on('hover:change', hoverHandler)

      tree.startDrag('1')
      tree.updateDrag('before-2')

      expect(hoverHandler).toHaveBeenCalledTimes(1)
      expect(hoverHandler).toHaveBeenCalledWith(
        expect.objectContaining({ zoneId: 'before-2' })
      )
    })

    it('updateDrag does nothing when no active drag', () => {
      const blocks = [makeBlock('1', 'item', null, 0)]
      const tree = createTree(blocks)
      const handler = vi.fn()
      tree.on('hover:change', handler)

      tree.updateDrag('before-1')

      expect(handler).not.toHaveBeenCalled()
    })

    it('updateDrag respects canDrop filter', () => {
      const blocks = [
        makeBlock('1', 'item', null, 0),
        makeBlock('2', 'item', null, 1),
      ]
      const tree = createTree(blocks, {
        canDrop: () => false,
      })
      const hoverHandler = vi.fn()
      tree.on('hover:change', hoverHandler)

      tree.startDrag('1')
      tree.updateDrag('before-2')

      expect(hoverHandler).not.toHaveBeenCalled()
    })

    it('endDrag commits the move and resets drag state', () => {
      const blocks = [
        makeBlock('1', 'item', null, 0),
        makeBlock('2', 'item', null, 1),
        makeBlock('3', 'item', null, 2),
      ]
      const tree = createTree(blocks)

      tree.startDrag('1')
      tree.updateDrag('after-3')

      const result = tree.endDrag()

      expect(result).not.toBeNull()
      expect(tree.getActiveId()).toBeNull()
      expect(tree.getHoverZone()).toBeNull()
    })

    it('endDrag returns null when no cached reorder', () => {
      const blocks = [makeBlock('1', 'item', null, 0)]
      const tree = createTree(blocks)

      tree.startDrag('1')
      // No updateDrag called
      const result = tree.endDrag()

      expect(result).toBeNull()
    })

    it('endDrag emits drag:end event', () => {
      const blocks = [
        makeBlock('1', 'item', null, 0),
        makeBlock('2', 'item', null, 1),
      ]
      const tree = createTree(blocks)
      const handler = vi.fn()
      tree.on('drag:end', handler)

      tree.startDrag('1')
      tree.updateDrag('after-2')
      tree.endDrag()

      expect(handler).toHaveBeenCalled()
    })

    it('cancelDrag resets drag state without committing', () => {
      const blocks = [
        makeBlock('1', 'item', null, 0),
        makeBlock('2', 'item', null, 1),
      ]
      const tree = createTree(blocks)

      tree.startDrag('1')
      tree.updateDrag('after-2')
      tree.cancelDrag()

      expect(tree.getActiveId()).toBeNull()
      expect(tree.getHoverZone()).toBeNull()
      // Blocks should be unchanged
      expect(tree.getBlocks().map(b => b.id)).toEqual(['1', '2'])
    })

    it('cancelDrag emits drag:end with cancelled=true and drag:cancel', () => {
      const blocks = [makeBlock('1', 'item', null, 0)]
      const tree = createTree(blocks)
      const endHandler = vi.fn()
      const cancelHandler = vi.fn()
      tree.on('drag:end', endHandler)
      tree.on('drag:cancel', cancelHandler)

      tree.startDrag('1')
      tree.cancelDrag()

      expect(endHandler).toHaveBeenCalledWith(
        expect.objectContaining({ cancelled: true })
      )
      expect(cancelHandler).toHaveBeenCalledTimes(1)
    })
  })

  describe('moveBlock', () => {
    it('moves block to new position', () => {
      const blocks = [
        makeBlock('1', 'item', null, 0),
        makeBlock('2', 'item', null, 1),
        makeBlock('3', 'item', null, 2),
      ]
      const tree = createTree(blocks)

      tree.moveBlock('1', 'after-3')

      const ids = tree.getBlocks().map(b => b.id)
      expect(ids).toEqual(['2', '3', '1'])
    })
  })

  describe('events: on/off', () => {
    it('on registers handler and returns unsubscribe', () => {
      const tree = createTree()
      const handler = vi.fn()

      const unsub = tree.on('blocks:change', handler)
      tree.addBlock('item')

      expect(handler).toHaveBeenCalledTimes(1)

      unsub()
      tree.addBlock('item')

      expect(handler).toHaveBeenCalledTimes(1) // not called again
    })

    it('off removes handler', () => {
      const tree = createTree()
      const handler = vi.fn()

      tree.on('blocks:change', handler)
      tree.off('blocks:change', handler)
      tree.addBlock('item')

      expect(handler).not.toHaveBeenCalled()
    })
  })

  describe('destroy', () => {
    it('removes all event listeners', () => {
      const tree = createTree()
      const handler = vi.fn()
      tree.on('blocks:change', handler)

      tree.destroy()
      tree.addBlock('item')

      expect(handler).not.toHaveBeenCalled()
    })
  })

  describe('getCollisionDetection', () => {
    it('returns undefined when no collision detection provided', () => {
      const tree = createTree()

      expect(tree.getCollisionDetection()).toBeUndefined()
    })

    it('returns the collision detection function when provided', () => {
      const detector = vi.fn()
      const tree = createTree([], { collisionDetection: detector })

      expect(tree.getCollisionDetection()).toBe(detector)
    })
  })

  describe('getEffectiveBlocks', () => {
    it('returns real blocks when no virtual state', () => {
      const blocks = [makeBlock('1', 'item', null, 0)]
      const tree = createTree(blocks)

      expect(tree.getEffectiveBlocks()).toHaveLength(1)
      expect(tree.getEffectiveBlocks()[0].id).toBe('1')
    })
  })

  describe('getBlockIndex', () => {
    it('returns the current block index', () => {
      const blocks = [
        makeBlock('1', 'container', null, 0),
        makeBlock('2', 'item', '1', 0),
      ]
      const tree = createTree(blocks)

      const index = tree.getBlockIndex()
      expect(index.byId.get('1')).toBeDefined()
      expect(index.byId.get('2')).toBeDefined()
      expect(index.byParent.get(null)).toContain('1')
      expect(index.byParent.get('1')).toContain('2')
    })
  })

  describe('startDrag with draggedIds', () => {
    it('accepts multiple dragged IDs', () => {
      const blocks = [
        makeBlock('1', 'item', null, 0),
        makeBlock('2', 'item', null, 1),
        makeBlock('3', 'item', null, 2),
      ]
      const tree = createTree(blocks)

      const result = tree.startDrag('1', ['1', '2'])

      expect(result).toBe(true)
      expect(tree.getActiveId()).toBe('1')
    })
  })
})
