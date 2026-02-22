import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createBlockTreeController } from './controller'
import type { BaseBlock } from '@dnd-block-tree/core'

interface TestBlock extends BaseBlock {
  type: 'container' | 'item'
}

const block = (
  id: string,
  type: TestBlock['type'] = 'item',
  parentId: string | null = null,
  order = 0
): TestBlock => ({ id, type, parentId, order })

describe('createBlockTreeController', () => {
  let container: HTMLElement

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
  })

  afterEach(() => {
    document.body.removeChild(container)
  })

  // --- Initialization ---

  it('getBlocks returns initial blocks', () => {
    const blocks = [block('1', 'item', null, 0), block('2', 'item', null, 1)]
    const ctrl = createBlockTreeController<TestBlock>({ initialBlocks: blocks })
    expect(ctrl.getBlocks()).toEqual(blocks)
    ctrl.destroy()
  })

  it('getBlocks returns empty array by default', () => {
    const ctrl = createBlockTreeController<TestBlock>()
    expect(ctrl.getBlocks()).toEqual([])
    ctrl.destroy()
  })

  it('getDragState returns idle initially', () => {
    const ctrl = createBlockTreeController<TestBlock>()
    const state = ctrl.getDragState()
    expect(state.isDragging).toBe(false)
    expect(state.activeId).toBeNull()
    expect(state.hoverZone).toBeNull()
    ctrl.destroy()
  })

  // --- Mutations ---

  it('addBlock adds a block and returns it', () => {
    const ctrl = createBlockTreeController<TestBlock>({
      containerTypes: ['container'],
    })
    const added = ctrl.addBlock('item')
    expect(added.type).toBe('item')
    expect(added.parentId).toBeNull()
    expect(ctrl.getBlocks()).toContainEqual(expect.objectContaining({ id: added.id }))
    ctrl.destroy()
  })

  it('addBlock with parentId adds child', () => {
    const ctrl = createBlockTreeController<TestBlock>({
      initialBlocks: [block('p', 'container')],
      containerTypes: ['container'],
    })
    const child = ctrl.addBlock('item', 'p')
    expect(child.parentId).toBe('p')
    ctrl.destroy()
  })

  it('deleteBlock removes a block', () => {
    const ctrl = createBlockTreeController<TestBlock>({
      initialBlocks: [block('1'), block('2', 'item', null, 1)],
    })
    ctrl.deleteBlock('1')
    expect(ctrl.getBlocks().find(b => b.id === '1')).toBeUndefined()
    ctrl.destroy()
  })

  it('setBlocks replaces all blocks', () => {
    const ctrl = createBlockTreeController<TestBlock>({
      initialBlocks: [block('1')],
    })
    const newBlocks = [block('a'), block('b', 'item', null, 1)]
    ctrl.setBlocks(newBlocks)
    expect(ctrl.getBlocks()).toEqual(newBlocks)
    ctrl.destroy()
  })

  // --- Expand/Collapse ---

  it('toggleExpand toggles expansion state', () => {
    const ctrl = createBlockTreeController<TestBlock>({
      initialBlocks: [block('c', 'container')],
      containerTypes: ['container'],
    })
    ctrl.toggleExpand('c')
    expect(ctrl.getExpandedMap()['c']).toBeDefined()
    ctrl.destroy()
  })

  it('setExpandAll sets all containers', () => {
    const ctrl = createBlockTreeController<TestBlock>({
      initialBlocks: [block('c1', 'container'), block('c2', 'container', null, 1)],
      containerTypes: ['container'],
    })
    ctrl.setExpandAll(true)
    const map = ctrl.getExpandedMap()
    expect(map['c1']).toBe(true)
    expect(map['c2']).toBe(true)
    ctrl.destroy()
  })

  // --- Selection ---

  it('select single mode sets one id', () => {
    const ctrl = createBlockTreeController<TestBlock>({
      initialBlocks: [block('1'), block('2', 'item', null, 1)],
    })
    ctrl.select('1', 'single')
    expect(ctrl.getSelectedIds()).toEqual(new Set(['1']))
    ctrl.select('2', 'single')
    expect(ctrl.getSelectedIds()).toEqual(new Set(['2']))
    ctrl.destroy()
  })

  it('select toggle mode adds/removes', () => {
    const ctrl = createBlockTreeController<TestBlock>({
      initialBlocks: [block('1'), block('2', 'item', null, 1)],
    })
    ctrl.select('1', 'toggle')
    ctrl.select('2', 'toggle')
    expect(ctrl.getSelectedIds()).toEqual(new Set(['1', '2']))
    ctrl.select('1', 'toggle')
    expect(ctrl.getSelectedIds()).toEqual(new Set(['2']))
    ctrl.destroy()
  })

  it('select range mode selects contiguous range', () => {
    const blocks = [
      block('1', 'item', null, 0),
      block('2', 'item', null, 1),
      block('3', 'item', null, 2),
      block('4', 'item', null, 3),
    ]
    const ctrl = createBlockTreeController<TestBlock>({ initialBlocks: blocks })
    ctrl.select('1', 'single')
    ctrl.select('3', 'range')
    expect(ctrl.getSelectedIds()).toEqual(new Set(['1', '2', '3']))
    ctrl.destroy()
  })

  it('clearSelection empties selection', () => {
    const ctrl = createBlockTreeController<TestBlock>({
      initialBlocks: [block('1')],
    })
    ctrl.select('1', 'single')
    ctrl.clearSelection()
    expect(ctrl.getSelectedIds().size).toBe(0)
    ctrl.destroy()
  })

  // --- History ---

  it('enableHistory enables undo/redo', () => {
    const ctrl = createBlockTreeController<TestBlock>({
      initialBlocks: [block('1')],
    })
    expect(ctrl.canUndo()).toBe(false)
    ctrl.enableHistory()
    expect(ctrl.canUndo()).toBe(false)
    ctrl.destroy()
  })

  it('undo returns null when history not enabled', () => {
    const ctrl = createBlockTreeController<TestBlock>()
    expect(ctrl.undo()).toBeNull()
    expect(ctrl.redo()).toBeNull()
    ctrl.destroy()
  })

  it('canUndo/canRedo are false without history', () => {
    const ctrl = createBlockTreeController<TestBlock>()
    expect(ctrl.canUndo()).toBe(false)
    expect(ctrl.canRedo()).toBe(false)
    ctrl.destroy()
  })

  // --- Events ---

  it('on render fires on mount', () => {
    const ctrl = createBlockTreeController<TestBlock>({
      initialBlocks: [block('1')],
    })
    const handler = vi.fn()
    ctrl.on('render', handler)
    ctrl.mount(container)
    expect(handler).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ id: '1' })]),
      expect.any(Object)
    )
    ctrl.unmount()
    ctrl.destroy()
  })

  it('on selection:change fires on select', () => {
    const ctrl = createBlockTreeController<TestBlock>({
      initialBlocks: [block('1')],
    })
    const handler = vi.fn()
    ctrl.on('selection:change', handler)
    ctrl.select('1', 'single')
    expect(handler).toHaveBeenCalledWith(new Set(['1']))
    ctrl.destroy()
  })

  // --- Registration ---

  it('registerDraggable sets data attributes and returns unsubscribe', () => {
    const ctrl = createBlockTreeController<TestBlock>()
    const el = document.createElement('div')
    const unsub = ctrl.registerDraggable('b1', el)
    expect(el.getAttribute('data-draggable-id')).toBe('b1')
    expect(el.getAttribute('data-block-id')).toBe('b1')
    unsub()
    ctrl.destroy()
  })

  it('registerDropZone sets data-zone-id and returns unsubscribe', () => {
    const ctrl = createBlockTreeController<TestBlock>()
    const el = document.createElement('div')
    const unsub = ctrl.registerDropZone('before-1', el)
    expect(el.getAttribute('data-zone-id')).toBe('before-1')
    unsub()
    ctrl.destroy()
  })

  // --- Mount/Unmount ---

  it('mount and unmount lifecycle', () => {
    const ctrl = createBlockTreeController<TestBlock>({
      initialBlocks: [block('1')],
      sensors: { pointer: false, touch: false },
    })
    ctrl.mount(container)
    ctrl.unmount()
    ctrl.destroy()
  })

  // --- Destroy ---

  it('destroy cleans up', () => {
    const ctrl = createBlockTreeController<TestBlock>({
      initialBlocks: [block('1')],
      sensors: { pointer: false, touch: false },
    })
    ctrl.mount(container)
    ctrl.destroy()
    // Should not throw after destroy
    expect(ctrl.getBlocks()).toBeDefined()
  })

  // --- getBlock ---

  it('getBlock returns block by id', () => {
    const ctrl = createBlockTreeController<TestBlock>({
      initialBlocks: [block('1'), block('2', 'item', null, 1)],
    })
    expect(ctrl.getBlock('1')).toEqual(expect.objectContaining({ id: '1' }))
    expect(ctrl.getBlock('nonexistent')).toBeUndefined()
    ctrl.destroy()
  })

  // --- getTree ---

  it('getTree returns the core tree instance', () => {
    const ctrl = createBlockTreeController<TestBlock>()
    const tree = ctrl.getTree()
    expect(tree).toBeDefined()
    expect(typeof tree.getBlocks).toBe('function')
    ctrl.destroy()
  })

  // --- onChange callback ---

  it('onChange fires when blocks change', () => {
    const onChange = vi.fn()
    const ctrl = createBlockTreeController<TestBlock>({
      initialBlocks: [block('1')],
      containerTypes: ['container'],
      onChange,
    })
    ctrl.addBlock('item')
    expect(onChange).toHaveBeenCalled()
    ctrl.destroy()
  })
})
