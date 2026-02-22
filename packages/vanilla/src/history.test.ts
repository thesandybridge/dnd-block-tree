import { describe, it, expect } from 'vitest'
import { createBlockHistory } from './history'
import type { BaseBlock } from '@dnd-block-tree/core'

interface TestBlock extends BaseBlock {
  type: 'item'
}

const block = (id: string, order = 0): TestBlock => ({
  id,
  type: 'item',
  parentId: null,
  order,
})

describe('createBlockHistory', () => {
  it('getPresent returns initial blocks', () => {
    const blocks = [block('1'), block('2')]
    const history = createBlockHistory(blocks)
    expect(history.getPresent()).toBe(blocks)
  })

  it('push updates present', () => {
    const history = createBlockHistory([block('1')])
    const next = [block('1'), block('2')]
    history.push(next)
    expect(history.getPresent()).toEqual(next)
  })

  it('canUndo is false initially', () => {
    const history = createBlockHistory([block('1')])
    expect(history.canUndo()).toBe(false)
  })

  it('canUndo is true after push', () => {
    const history = createBlockHistory([block('1')])
    history.push([block('2')])
    expect(history.canUndo()).toBe(true)
  })

  it('undo restores previous state', () => {
    const initial = [block('1')]
    const history = createBlockHistory(initial)
    history.push([block('2')])
    const result = history.undo()
    expect(result).toEqual(initial)
    expect(history.getPresent()).toEqual(initial)
  })

  it('undo returns null when no history', () => {
    const history = createBlockHistory([block('1')])
    expect(history.undo()).toBeNull()
  })

  it('redo restores undone state', () => {
    const history = createBlockHistory([block('1')])
    const next = [block('2')]
    history.push(next)
    history.undo()
    const result = history.redo()
    expect(result).toEqual(next)
    expect(history.getPresent()).toEqual(next)
  })

  it('redo returns null when no future', () => {
    const history = createBlockHistory([block('1')])
    expect(history.redo()).toBeNull()
  })

  it('canRedo is true after undo', () => {
    const history = createBlockHistory([block('1')])
    history.push([block('2')])
    history.undo()
    expect(history.canRedo()).toBe(true)
  })

  it('canRedo is false after push clears future', () => {
    const history = createBlockHistory([block('1')])
    history.push([block('2')])
    history.undo()
    history.push([block('3')])
    expect(history.canRedo()).toBe(false)
  })

  it('maxSteps truncates history', () => {
    const history = createBlockHistory([block('0')], { maxSteps: 3 })
    for (let i = 1; i <= 5; i++) {
      history.push([block(String(i))])
    }
    // Can only undo 3 times
    let undone = 0
    while (history.canUndo()) {
      history.undo()
      undone++
    }
    expect(undone).toBe(3)
  })

  it('clear resets all state', () => {
    const history = createBlockHistory([block('1')])
    history.push([block('2')])
    history.push([block('3')])
    const fresh = [block('x')]
    history.clear(fresh)
    expect(history.getPresent()).toBe(fresh)
    expect(history.canUndo()).toBe(false)
    expect(history.canRedo()).toBe(false)
  })
})
