import { describe, it, expect, vi } from 'vitest'
import {
  pointerToRect,
  buildCandidates,
  detectCollision,
  measureDropZoneRects,
} from './collision-bridge'
import type { CoreCollisionDetection, Rect } from '@dnd-block-tree/core'

describe('pointerToRect', () => {
  it('returns a 1x1 rect at the given coordinates', () => {
    const rect = pointerToRect(100, 200)
    expect(rect).toEqual({
      top: 200,
      left: 100,
      width: 1,
      height: 1,
      right: 101,
      bottom: 201,
    })
  })

  it('handles zero coordinates', () => {
    const rect = pointerToRect(0, 0)
    expect(rect).toEqual({
      top: 0,
      left: 0,
      width: 1,
      height: 1,
      right: 1,
      bottom: 1,
    })
  })
})

describe('buildCandidates', () => {
  it('converts a rect map to CollisionCandidate[]', () => {
    const rects = new Map<string, Rect>([
      ['zone-1', { top: 0, left: 0, width: 100, height: 20, right: 100, bottom: 20 }],
      ['zone-2', { top: 20, left: 0, width: 100, height: 20, right: 100, bottom: 40 }],
    ])
    const candidates = buildCandidates(rects)
    expect(candidates).toHaveLength(2)
    expect(candidates[0]).toEqual({ id: 'zone-1', rect: rects.get('zone-1') })
    expect(candidates[1]).toEqual({ id: 'zone-2', rect: rects.get('zone-2') })
  })

  it('returns empty array for empty map', () => {
    expect(buildCandidates(new Map())).toEqual([])
  })
})

describe('detectCollision', () => {
  it('returns the first result id from the detector', () => {
    const detector: CoreCollisionDetection = vi.fn(() => [
      { id: 'zone-a', value: 10 },
      { id: 'zone-b', value: 5 },
    ])
    const rects = new Map<string, Rect>([
      ['zone-a', { top: 0, left: 0, width: 100, height: 50, right: 100, bottom: 50 }],
    ])
    const result = detectCollision(detector, rects, 50, 25)
    expect(result).toBe('zone-a')
    expect(detector).toHaveBeenCalledOnce()
  })

  it('returns null when detector returns no results', () => {
    const detector: CoreCollisionDetection = vi.fn(() => [])
    const rects = new Map<string, Rect>([
      ['zone-a', { top: 0, left: 0, width: 100, height: 50, right: 100, bottom: 50 }],
    ])
    expect(detectCollision(detector, rects, 50, 25)).toBeNull()
  })

  it('passes correct candidates and pointer rect to detector', () => {
    const detector: CoreCollisionDetection = vi.fn(() => [])
    const rect: Rect = { top: 10, left: 20, width: 100, height: 50, right: 120, bottom: 60 }
    const rects = new Map([['z1', rect]])

    detectCollision(detector, rects, 30, 40)

    expect(detector).toHaveBeenCalledWith(
      [{ id: 'z1', rect }],
      { top: 40, left: 30, width: 1, height: 1, right: 31, bottom: 41 }
    )
  })
})

describe('measureDropZoneRects', () => {
  it('measures DOM elements and returns rect map', () => {
    const el = document.createElement('div')
    document.body.appendChild(el)
    // jsdom returns all zeros for getBoundingClientRect by default
    vi.spyOn(el, 'getBoundingClientRect').mockReturnValue({
      top: 10,
      left: 20,
      width: 100,
      height: 30,
      right: 120,
      bottom: 40,
      x: 20,
      y: 10,
      toJSON: () => {},
    })

    const zones = new Map([['zone-1', el]])
    const rects = measureDropZoneRects(zones)

    expect(rects.get('zone-1')).toEqual({
      top: 10,
      left: 20,
      width: 100,
      height: 30,
      right: 120,
      bottom: 40,
    })
    document.body.removeChild(el)
  })

  it('returns empty map for empty zones', () => {
    expect(measureDropZoneRects(new Map()).size).toBe(0)
  })
})
