import { describe, it, expect, vi } from 'vitest'
import { adaptCollisionDetection } from './bridge'
import type { CoreCollisionDetection } from '@dnd-block-tree/core'

function makeContainer(id: string, rect: { top: number; left: number; width: number; height: number }) {
  return {
    id,
    rect: {
      current: {
        ...rect,
        right: rect.left + rect.width,
        bottom: rect.top + rect.height,
      },
    },
    data: { current: {} },
    disabled: false,
    node: { current: null },
  }
}

describe('adaptCollisionDetection', () => {
  it('converts droppable containers to core candidates and calls detector', () => {
    const coreDetector: CoreCollisionDetection = vi.fn(() => [
      { id: 'zone-1', value: 10 },
    ])
    const detect = adaptCollisionDetection(coreDetector)
    const container = makeContainer('zone-1', { top: 0, left: 0, width: 100, height: 50 })

    const result = detect({
      droppableContainers: [container],
      collisionRect: { top: 25, left: 50, width: 1, height: 1 },
    } as any)

    expect(coreDetector).toHaveBeenCalledWith(
      [{ id: 'zone-1', rect: { top: 0, left: 0, width: 100, height: 50, right: 100, bottom: 50 } }],
      expect.objectContaining({ top: 25, left: 50 })
    )
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('zone-1')
  })

  it('returns empty array when collisionRect is null', () => {
    const coreDetector: CoreCollisionDetection = vi.fn()
    const detect = adaptCollisionDetection(coreDetector)

    const result = detect({
      droppableContainers: [],
      collisionRect: null,
    } as any)

    expect(result).toEqual([])
    expect(coreDetector).not.toHaveBeenCalled()
  })

  it('handles empty containers', () => {
    const coreDetector: CoreCollisionDetection = vi.fn(() => [])
    const detect = adaptCollisionDetection(coreDetector)

    const result = detect({
      droppableContainers: [],
      collisionRect: { top: 0, left: 0, width: 1, height: 1 },
    } as any)

    expect(result).toEqual([])
  })

  it('skips containers without rects', () => {
    const coreDetector: CoreCollisionDetection = vi.fn(() => [])
    const detect = adaptCollisionDetection(coreDetector)

    const containerWithRect = makeContainer('z1', { top: 0, left: 0, width: 50, height: 50 })
    const containerWithoutRect = { id: 'z2', rect: { current: null }, data: { current: {} }, disabled: false, node: { current: null } }

    detect({
      droppableContainers: [containerWithRect, containerWithoutRect],
      collisionRect: { top: 0, left: 0, width: 1, height: 1 },
    } as any)

    expect(coreDetector).toHaveBeenCalledWith(
      [expect.objectContaining({ id: 'z1' })],
      expect.any(Object)
    )
  })

  it('filters out results that do not match a container', () => {
    const coreDetector: CoreCollisionDetection = vi.fn(() => [
      { id: 'z1', value: 10 },
      { id: 'unknown', value: 5 },
    ])
    const detect = adaptCollisionDetection(coreDetector)
    const container = makeContainer('z1', { top: 0, left: 0, width: 100, height: 50 })

    const result = detect({
      droppableContainers: [container],
      collisionRect: { top: 0, left: 0, width: 1, height: 1 },
    } as any)

    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('z1')
  })

  it('maps collision result data correctly', () => {
    const coreDetector: CoreCollisionDetection = vi.fn(() => [
      { id: 'z1', value: 42, left: 10 },
    ])
    const detect = adaptCollisionDetection(coreDetector)
    const container = makeContainer('z1', { top: 0, left: 0, width: 100, height: 50 })

    const result = detect({
      droppableContainers: [container],
      collisionRect: { top: 0, left: 0, width: 1, height: 1 },
    } as any)

    expect(result[0].data.value).toBe(42)
    expect(result[0].data.left).toBe(10)
    expect(result[0].data.droppableContainer).toBe(container)
  })
})
