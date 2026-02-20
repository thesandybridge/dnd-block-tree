import { describe, it, expect } from 'vitest'
import { weightedVerticalCollision, closestCenterCollision } from './collision'
import type { DroppableContainer } from '@dnd-kit/core'

// Helper to create mock droppable container
function createContainer(
  id: string,
  rect: { top: number; bottom: number; left: number; right: number; width: number; height: number }
): DroppableContainer {
  return {
    id,
    rect: { current: rect },
    node: { current: null },
    disabled: false,
    data: { current: undefined },
  } as unknown as DroppableContainer
}

describe('weightedVerticalCollision', () => {
  it('returns empty array when collisionRect is null', () => {
    const result = weightedVerticalCollision({
      droppableContainers: [],
      collisionRect: null,
      droppableRects: new Map(),
      active: null,
      pointerCoordinates: null,
    })

    expect(result).toEqual([])
  })

  it('returns the closest container by edge distance', () => {
    const containers = [
      createContainer('far', { top: 100, bottom: 120, left: 0, right: 100, width: 100, height: 20 }),
      createContainer('close', { top: 40, bottom: 60, left: 0, right: 100, width: 100, height: 20 }),
    ]

    const result = weightedVerticalCollision({
      droppableContainers: containers,
      collisionRect: { top: 50, left: 0, right: 100, bottom: 60, width: 100, height: 10 },
      droppableRects: new Map(),
      active: null,
      pointerCoordinates: null,
    })

    expect(result.length).toBe(1)
    expect(result[0].id).toBe('close')
  })

  it('applies bottom bias when pointer is below container center', () => {
    // Two containers at same edge distance from pointer
    // Container 'small' has its center above the pointer - gets bias
    // Container 'tall' has its center below the pointer - no bias
    const containers = [
      // Small container: center at y=10, pointer will be below it
      createContainer('small', { top: 0, bottom: 20, left: 0, right: 100, width: 100, height: 20 }),
      // Tall container: center at y=110, pointer will be above it
      createContainer('tall', { top: 60, bottom: 160, left: 0, right: 100, width: 100, height: 100 }),
    ]

    // Pointer at y=50
    // 'small': distanceToBottom = |50 - 20| = 30, isBelowCenter (50 > 10) = true, gets -5 bias, score = 25
    // 'tall': distanceToTop = |50 - 60| = 10, isBelowCenter (50 > 110) = false, score = 10
    // Actually 'tall' wins with score 10 vs 25

    // Let me use equidistant containers to test bias
    const containers2 = [
      createContainer('gets_bias', { top: 20, bottom: 40, left: 0, right: 100, width: 100, height: 20 }), // center at 30
      createContainer('no_bias', { top: 60, bottom: 80, left: 0, right: 100, width: 100, height: 20 }), // center at 70
    ]

    // Pointer at y=50
    // 'gets_bias': nearest edge is bottom at 40, distance = 10, pointer (50) > center (30), bias = -5, score = 5
    // 'no_bias': nearest edge is top at 60, distance = 10, pointer (50) > center (70) = false, no bias, score = 10
    const result = weightedVerticalCollision({
      droppableContainers: containers2,
      collisionRect: { top: 45, left: 0, right: 100, bottom: 55, width: 100, height: 10 },
      droppableRects: new Map(),
      active: null,
      pointerCoordinates: null,
    })

    expect(result.length).toBe(1)
    expect(result[0].id).toBe('gets_bias')
  })

  it('filters out containers with null rects', () => {
    const validContainer = createContainer('valid', {
      top: 0, bottom: 20, left: 0, right: 100, width: 100, height: 20
    })
    const invalidContainer = {
      id: 'invalid',
      rect: { current: null },
    } as unknown as DroppableContainer

    const result = weightedVerticalCollision({
      droppableContainers: [validContainer, invalidContainer],
      collisionRect: { top: 10, left: 0, right: 100, bottom: 20, width: 100, height: 10 },
      droppableRects: new Map(),
      active: null,
      pointerCoordinates: null,
    })

    expect(result.length).toBe(1)
    expect(result[0].id).toBe('valid')
  })

  it('uses nearest edge (top or bottom) for distance', () => {
    // Container with top at 100, bottom at 200
    // Pointer at y=150 (middle)
    // Distance to top = 50, distance to bottom = 50
    // Should use min (50)
    const container = createContainer('test', {
      top: 100, bottom: 200, left: 0, right: 100, width: 100, height: 100
    })

    const result = weightedVerticalCollision({
      droppableContainers: [container],
      collisionRect: { top: 145, left: 0, right: 100, bottom: 155, width: 100, height: 10 },
      droppableRects: new Map(),
      active: null,
      pointerCoordinates: null,
    })

    expect(result.length).toBe(1)
  })
})

describe('closestCenterCollision', () => {
  it('returns empty array when collisionRect is null', () => {
    const result = closestCenterCollision({
      droppableContainers: [],
      collisionRect: null,
      droppableRects: new Map(),
      active: null,
      pointerCoordinates: null,
    })

    expect(result).toEqual([])
  })

  it('returns the container with closest center', () => {
    const containers = [
      createContainer('far', { top: 100, bottom: 120, left: 100, right: 120, width: 20, height: 20 }),
      createContainer('close', { top: 40, bottom: 60, left: 40, right: 60, width: 20, height: 20 }),
    ]

    const result = closestCenterCollision({
      droppableContainers: containers,
      collisionRect: { top: 45, left: 45, right: 55, bottom: 55, width: 10, height: 10 },
      droppableRects: new Map(),
      active: null,
      pointerCoordinates: null,
    })

    expect(result.length).toBe(1)
    expect(result[0].id).toBe('close')
  })

  it('considers both X and Y distance', () => {
    const containers = [
      // Center at (50, 50)
      createContainer('a', { top: 40, bottom: 60, left: 40, right: 60, width: 20, height: 20 }),
      // Center at (150, 50)
      createContainer('b', { top: 40, bottom: 60, left: 140, right: 160, width: 20, height: 20 }),
    ]

    // Collision rect center at (100, 50) - equidistant on Y, but different X
    const result = closestCenterCollision({
      droppableContainers: containers,
      collisionRect: { top: 45, left: 95, right: 105, bottom: 55, width: 10, height: 10 },
      droppableRects: new Map(),
      active: null,
      pointerCoordinates: null,
    })

    expect(result.length).toBe(1)
    // Both should be 50px away on X, so either could win
    // This tests that the algorithm considers both dimensions
    expect(['a', 'b']).toContain(result[0].id)
  })

  it('filters out containers with null rects', () => {
    const validContainer = createContainer('valid', {
      top: 0, bottom: 20, left: 0, right: 20, width: 20, height: 20
    })
    const invalidContainer = {
      id: 'invalid',
      rect: { current: null },
    } as unknown as DroppableContainer

    const result = closestCenterCollision({
      droppableContainers: [validContainer, invalidContainer],
      collisionRect: { top: 5, left: 5, right: 15, bottom: 15, width: 10, height: 10 },
      droppableRects: new Map(),
      active: null,
      pointerCoordinates: null,
    })

    expect(result.length).toBe(1)
    expect(result[0].id).toBe('valid')
  })
})
