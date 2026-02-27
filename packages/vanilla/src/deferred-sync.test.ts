import { describe, it, expect, vi } from 'vitest'
import { createDeferredSync } from './deferred-sync'
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

describe('createDeferredSync', () => {
  it('is not busy initially', () => {
    const sync = createDeferredSync()
    expect(sync.isBusy()).toBe(false)
  })

  it('apply calls onResolve when not busy', () => {
    const onResolve = vi.fn()
    const sync = createDeferredSync<TestBlock>({ onResolve })
    const blocks = [block('1', 'A')]

    sync.apply(blocks)

    expect(onResolve).toHaveBeenCalledWith(blocks)
  })

  it('apply queues when busy', () => {
    const onResolve = vi.fn()
    const sync = createDeferredSync<TestBlock>({ onResolve })

    sync.enterBusy()
    sync.apply([block('1', 'A')])

    expect(onResolve).not.toHaveBeenCalled()
  })

  it('enterBusy sets isBusy to true', () => {
    const sync = createDeferredSync()
    sync.enterBusy()
    expect(sync.isBusy()).toBe(true)
  })

  it('exitBusy returns null when no queue', () => {
    const sync = createDeferredSync<TestBlock>()
    sync.enterBusy()

    const result = sync.exitBusy([block('1', 'A')], 'merge')

    expect(result).toBeNull()
    expect(sync.isBusy()).toBe(false)
  })

  it('exitBusy with merge strategy merges content and structure', () => {
    const sync = createDeferredSync<TestBlock>()

    sync.enterBusy()
    sync.apply([block('1', 'Original', 'k')])

    const merged = sync.exitBusy([block('1', 'Edited', 0)], 'merge')

    expect(merged).toEqual([{ id: '1', type: 'item', title: 'Edited', parentId: null, order: 'k' }])
  })

  it('exitBusy with lww strategy returns local blocks', () => {
    const sync = createDeferredSync<TestBlock>()

    sync.enterBusy()
    sync.apply([block('1', 'Remote', 'k')])

    const result = sync.exitBusy([block('1', 'Local', 0)], 'lww')

    expect(result).toEqual([block('1', 'Local', 0)])
  })

  it('queues only the latest remote update', () => {
    const sync = createDeferredSync<TestBlock>()

    sync.enterBusy()
    sync.apply([block('1', 'First')])
    sync.apply([block('1', 'Second')])

    const merged = sync.exitBusy([block('1', 'Local')], 'merge')

    expect(merged![0].title).toBe('Local')
  })

  it('clears queue after exitBusy', () => {
    const sync = createDeferredSync<TestBlock>()

    sync.enterBusy()
    sync.apply([block('1', 'Remote')])
    sync.exitBusy([block('1', 'Local')], 'merge')

    // Enter busy again — should have no queue
    sync.enterBusy()
    const result = sync.exitBusy([block('1', 'Local')], 'merge')

    expect(result).toBeNull()
  })

  it('works without options', () => {
    const sync = createDeferredSync<TestBlock>()

    // apply without onResolve should not throw
    sync.apply([block('1', 'A')])
    expect(sync.isBusy()).toBe(false)
  })
})
