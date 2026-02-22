import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useBlockHistory } from './useBlockHistory'
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

describe('useBlockHistory', () => {
  it('returns initial blocks', () => {
    const initial = [block('1'), block('2')]
    const { result } = renderHook(() => useBlockHistory(initial))
    expect(result.current.blocks).toEqual(initial)
  })

  it('canUndo and canRedo are false initially', () => {
    const { result } = renderHook(() => useBlockHistory([block('1')]))
    expect(result.current.canUndo).toBe(false)
    expect(result.current.canRedo).toBe(false)
  })

  it('set() updates blocks and enables undo', () => {
    const { result } = renderHook(() => useBlockHistory([block('1')]))
    const next = [block('1'), block('2')]

    act(() => result.current.set(next))

    expect(result.current.blocks).toEqual(next)
    expect(result.current.canUndo).toBe(true)
  })

  it('undo restores previous state', () => {
    const initial = [block('1')]
    const { result } = renderHook(() => useBlockHistory(initial))

    act(() => result.current.set([block('2')]))
    act(() => result.current.undo())

    expect(result.current.blocks).toEqual(initial)
    expect(result.current.canRedo).toBe(true)
  })

  it('redo restores undone state', () => {
    const { result } = renderHook(() => useBlockHistory([block('1')]))
    const next = [block('2')]

    act(() => result.current.set(next))
    act(() => result.current.undo())
    act(() => result.current.redo())

    expect(result.current.blocks).toEqual(next)
  })

  it('undo when empty does not change blocks', () => {
    const initial = [block('1')]
    const { result } = renderHook(() => useBlockHistory(initial))

    act(() => result.current.undo())

    expect(result.current.blocks).toEqual(initial)
  })

  it('redo when empty does not change blocks', () => {
    const initial = [block('1')]
    const { result } = renderHook(() => useBlockHistory(initial))

    act(() => result.current.redo())

    expect(result.current.blocks).toEqual(initial)
  })

  it('maxSteps limits history depth', () => {
    const { result } = renderHook(() =>
      useBlockHistory([block('0')], { maxSteps: 2 })
    )

    act(() => result.current.set([block('1')]))
    act(() => result.current.set([block('2')]))
    act(() => result.current.set([block('3')]))

    // Only 2 undos should be possible
    act(() => result.current.undo())
    act(() => result.current.undo())
    expect(result.current.canUndo).toBe(false)
  })
})
