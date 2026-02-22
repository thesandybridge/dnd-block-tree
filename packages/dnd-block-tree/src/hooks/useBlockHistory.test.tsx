import { renderHook, act } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { useBlockHistory } from './useBlockHistory'

interface TestBlock {
  id: string
  type: string
  parentId: string | null
  order: number
}

const initialBlocks: TestBlock[] = [
  { id: '1', type: 'text', parentId: null, order: 0 },
  { id: '2', type: 'text', parentId: null, order: 1 },
]

describe('useBlockHistory', () => {
  it('returns initial state', () => {
    const { result } = renderHook(() => useBlockHistory(initialBlocks))

    expect(result.current.blocks).toEqual(initialBlocks)
    expect(result.current.canUndo).toBe(false)
    expect(result.current.canRedo).toBe(false)
  })

  it('set() pushes to history', () => {
    const { result } = renderHook(() => useBlockHistory(initialBlocks))

    const newBlocks: TestBlock[] = [
      { id: '1', type: 'text', parentId: null, order: 0 },
      { id: '2', type: 'text', parentId: null, order: 1 },
      { id: '3', type: 'heading', parentId: null, order: 2 },
    ]

    act(() => {
      result.current.set(newBlocks)
    })

    expect(result.current.blocks).toEqual(newBlocks)
    expect(result.current.canUndo).toBe(true)
    expect(result.current.canRedo).toBe(false)
  })

  it('undo() restores previous state', () => {
    const { result } = renderHook(() => useBlockHistory(initialBlocks))

    const newBlocks: TestBlock[] = [
      { id: '1', type: 'text', parentId: null, order: 0 },
    ]

    act(() => {
      result.current.set(newBlocks)
    })

    expect(result.current.blocks).toEqual(newBlocks)

    act(() => {
      result.current.undo()
    })

    expect(result.current.blocks).toEqual(initialBlocks)
    expect(result.current.canUndo).toBe(false)
    expect(result.current.canRedo).toBe(true)
  })

  it('redo() restores undone state', () => {
    const { result } = renderHook(() => useBlockHistory(initialBlocks))

    const newBlocks: TestBlock[] = [
      { id: '1', type: 'text', parentId: null, order: 0 },
      { id: '3', type: 'heading', parentId: null, order: 1 },
    ]

    act(() => {
      result.current.set(newBlocks)
    })

    act(() => {
      result.current.undo()
    })

    expect(result.current.blocks).toEqual(initialBlocks)

    act(() => {
      result.current.redo()
    })

    expect(result.current.blocks).toEqual(newBlocks)
    expect(result.current.canUndo).toBe(true)
    expect(result.current.canRedo).toBe(false)
  })

  it('redo stack cleared on new set()', () => {
    const { result } = renderHook(() => useBlockHistory(initialBlocks))

    const blocksA: TestBlock[] = [
      { id: 'a', type: 'text', parentId: null, order: 0 },
    ]
    const blocksB: TestBlock[] = [
      { id: 'b', type: 'text', parentId: null, order: 0 },
    ]
    const blocksC: TestBlock[] = [
      { id: 'c', type: 'text', parentId: null, order: 0 },
    ]

    act(() => {
      result.current.set(blocksA)
    })
    act(() => {
      result.current.set(blocksB)
    })

    // Undo back to A
    act(() => {
      result.current.undo()
    })
    expect(result.current.blocks).toEqual(blocksA)
    expect(result.current.canRedo).toBe(true)

    // Setting C should clear redo stack
    act(() => {
      result.current.set(blocksC)
    })

    expect(result.current.blocks).toEqual(blocksC)
    expect(result.current.canRedo).toBe(false)
  })

  it('maxSteps limits undo history', () => {
    const { result } = renderHook(() =>
      useBlockHistory(initialBlocks, { maxSteps: 2 })
    )

    const blocks1: TestBlock[] = [
      { id: '1', type: 'text', parentId: null, order: 0 },
    ]
    const blocks2: TestBlock[] = [
      { id: '2', type: 'text', parentId: null, order: 0 },
    ]
    const blocks3: TestBlock[] = [
      { id: '3', type: 'text', parentId: null, order: 0 },
    ]

    act(() => {
      result.current.set(blocks1)
    })
    act(() => {
      result.current.set(blocks2)
    })
    act(() => {
      result.current.set(blocks3)
    })

    // Should only be able to undo twice (maxSteps: 2)
    expect(result.current.canUndo).toBe(true)

    act(() => {
      result.current.undo()
    })
    expect(result.current.blocks).toEqual(blocks2)
    expect(result.current.canUndo).toBe(true)

    act(() => {
      result.current.undo()
    })
    expect(result.current.blocks).toEqual(blocks1)
    expect(result.current.canUndo).toBe(false)
  })

  it('no-op undo when empty', () => {
    const { result } = renderHook(() => useBlockHistory(initialBlocks))

    expect(result.current.canUndo).toBe(false)

    act(() => {
      result.current.undo()
    })

    expect(result.current.blocks).toEqual(initialBlocks)
    expect(result.current.canUndo).toBe(false)
    expect(result.current.canRedo).toBe(false)
  })

  it('no-op redo when empty', () => {
    const { result } = renderHook(() => useBlockHistory(initialBlocks))

    expect(result.current.canRedo).toBe(false)

    act(() => {
      result.current.redo()
    })

    expect(result.current.blocks).toEqual(initialBlocks)
    expect(result.current.canUndo).toBe(false)
    expect(result.current.canRedo).toBe(false)
  })
})
