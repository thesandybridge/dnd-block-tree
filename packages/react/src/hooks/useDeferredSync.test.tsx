import { describe, it, expect, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useDeferredSync } from './useDeferredSync'
import type { BaseBlock } from '@dnd-block-tree/core'

interface TestBlock extends BaseBlock {
  type: 'item'
  title: string
}

const block = (id: string, title: string, order: number | string = 0, parentId: string | null = null): TestBlock => ({
  id,
  type: 'item',
  title,
  parentId,
  order,
})

describe('useDeferredSync', () => {
  it('is not busy initially', () => {
    const { result } = renderHook(() => useDeferredSync())
    expect(result.current.isBusy).toBe(false)
  })

  it('apply calls onResolve when not busy', () => {
    const onResolve = vi.fn()
    const { result } = renderHook(() => useDeferredSync<TestBlock>({ onResolve }))
    const blocks = [block('1', 'A')]

    act(() => result.current.apply(blocks))

    expect(onResolve).toHaveBeenCalledWith(blocks)
  })

  it('apply queues when busy', () => {
    const onResolve = vi.fn()
    const { result } = renderHook(() => useDeferredSync<TestBlock>({ onResolve }))

    act(() => result.current.enterBusy())
    act(() => result.current.apply([block('1', 'A')]))

    expect(onResolve).not.toHaveBeenCalled()
  })

  it('enterBusy sets isBusy to true', () => {
    const { result } = renderHook(() => useDeferredSync())

    act(() => result.current.enterBusy())

    expect(result.current.isBusy).toBe(true)
  })

  it('exitBusy returns null when no queue', () => {
    const { result } = renderHook(() => useDeferredSync<TestBlock>())

    act(() => result.current.enterBusy())

    let returned: TestBlock[] | null = null
    act(() => {
      returned = result.current.exitBusy([block('1', 'A')], 'merge')
    })

    expect(returned).toBeNull()
    expect(result.current.isBusy).toBe(false)
  })

  it('exitBusy with merge strategy merges content and structure', () => {
    const { result } = renderHook(() => useDeferredSync<TestBlock>())

    act(() => result.current.enterBusy())
    // Remote reorders while local edited title
    act(() => result.current.apply([block('1', 'Original', 'k')]))

    let merged: TestBlock[] | null = null
    act(() => {
      merged = result.current.exitBusy([block('1', 'Edited', 0)], 'merge')
    })

    expect(merged).toEqual([{ id: '1', type: 'item', title: 'Edited', parentId: null, order: 'k' }])
  })

  it('exitBusy with lww strategy returns local blocks', () => {
    const { result } = renderHook(() => useDeferredSync<TestBlock>())

    act(() => result.current.enterBusy())
    act(() => result.current.apply([block('1', 'Remote', 'k')]))

    let returned: TestBlock[] | null = null
    act(() => {
      returned = result.current.exitBusy([block('1', 'Local', 0)], 'lww')
    })

    expect(returned).toEqual([block('1', 'Local', 0)])
  })

  it('queues only the latest remote update', () => {
    const { result } = renderHook(() => useDeferredSync<TestBlock>())

    act(() => result.current.enterBusy())
    act(() => result.current.apply([block('1', 'First')]))
    act(() => result.current.apply([block('1', 'Second')]))

    let merged: TestBlock[] | null = null
    act(() => {
      merged = result.current.exitBusy([block('1', 'Local')], 'merge')
    })

    // Structure comes from the latest queued (Second)
    expect(merged![0].title).toBe('Local')
  })

  it('clears queue after exitBusy', () => {
    const { result } = renderHook(() => useDeferredSync<TestBlock>())

    act(() => result.current.enterBusy())
    act(() => result.current.apply([block('1', 'Remote')]))
    act(() => {
      result.current.exitBusy([block('1', 'Local')], 'merge')
    })

    // Enter busy again and exit — should have no queue
    act(() => result.current.enterBusy())

    let returned: TestBlock[] | null = null
    act(() => {
      returned = result.current.exitBusy([block('1', 'Local')], 'merge')
    })

    expect(returned).toBeNull()
  })

  it('supports custom merge options', () => {
    interface PriorityBlock extends BaseBlock {
      type: 'item'
      title: string
      priority: number
    }

    const { result } = renderHook(() =>
      useDeferredSync<PriorityBlock>({
        mergeOptions: { structuralFields: ['parentId', 'order', 'priority'] },
      })
    )

    act(() => result.current.enterBusy())
    act(() => result.current.apply([
      { id: '1', type: 'item', title: 'Remote', parentId: null, order: 'k', priority: 10 },
    ]))

    let merged: PriorityBlock[] | null = null
    act(() => {
      merged = result.current.exitBusy(
        [{ id: '1', type: 'item', title: 'Local', parentId: null, order: 0, priority: 1 }],
        'merge'
      )
    })

    expect(merged![0].title).toBe('Local')
    expect(merged![0].priority).toBe(10)
    expect(merged![0].order).toBe('k')
  })
})
