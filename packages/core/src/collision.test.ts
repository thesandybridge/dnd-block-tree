import { describe, it, expect } from 'vitest'
import { weightedVerticalCollision, closestCenterCollision, createStickyCollision } from './collision'
import type { CollisionCandidate, Rect, SnapshotRectsRef } from './collision'

function createCandidate(
  id: string,
  rect: { top: number; bottom: number; left: number; right: number; width: number; height: number }
): CollisionCandidate {
  return { id, rect }
}

function makeRect(top: number, left: number, width: number, height: number): Rect {
  return { top, left, width, height, right: left + width, bottom: top + height }
}

describe('weightedVerticalCollision', () => {
  it('returns empty array when no candidates', () => {
    const result = weightedVerticalCollision(
      [],
      { top: 50, left: 0, width: 100, height: 10, right: 100, bottom: 60 }
    )

    expect(result).toEqual([])
  })

  it('returns the closest container by edge distance', () => {
    const candidates = [
      createCandidate('far', { top: 100, bottom: 120, left: 0, right: 100, width: 100, height: 20 }),
      createCandidate('close', { top: 40, bottom: 60, left: 0, right: 100, width: 100, height: 20 }),
    ]

    const result = weightedVerticalCollision(
      candidates,
      { top: 50, left: 0, right: 100, bottom: 60, width: 100, height: 10 }
    )

    expect(result.length).toBe(1)
    expect(result[0].id).toBe('close')
  })

  it('applies bottom bias when pointer is below container center', () => {
    const candidates = [
      createCandidate('gets_bias', { top: 20, bottom: 40, left: 0, right: 100, width: 100, height: 20 }), // center at 30
      createCandidate('no_bias', { top: 60, bottom: 80, left: 0, right: 100, width: 100, height: 20 }), // center at 70
    ]

    // Pointer at y=50
    // 'gets_bias': nearest edge is bottom at 40, distance = 10, pointer (50) > center (30), bias = -5, score = 5
    // 'no_bias': nearest edge is top at 60, distance = 10, pointer (50) > center (70) = false, no bias, score = 10
    const result = weightedVerticalCollision(
      candidates,
      { top: 45, left: 0, right: 100, bottom: 55, width: 100, height: 10 }
    )

    expect(result.length).toBe(1)
    expect(result[0].id).toBe('gets_bias')
  })

  it('prefers parent-level zone when pointer is at parent indentation', () => {
    // end-container (indented at left=48) vs root-end (at left=0)
    const candidates = [
      createCandidate('end-container', { top: 80, bottom: 84, left: 48, right: 300, width: 252, height: 4 }),
      createCandidate('root-end', { top: 84, bottom: 88, left: 0, right: 300, width: 300, height: 4 }),
    ]

    // Pointer at X=20 (parent indentation), Y=83 (between zones)
    const result = weightedVerticalCollision(
      candidates,
      { top: 78, left: 15, right: 25, bottom: 88, width: 10, height: 10 }
    )

    expect(result.length).toBe(1)
    expect(result[0].id).toBe('root-end')
  })

  it('prefers container-level zone when pointer is at container indentation', () => {
    const candidates = [
      createCandidate('end-container', { top: 80, bottom: 84, left: 48, right: 300, width: 252, height: 4 }),
      createCandidate('root-end', { top: 84, bottom: 88, left: 0, right: 300, width: 300, height: 4 }),
    ]

    // Pointer at X=100 (inside container indentation), Y=83
    const result = weightedVerticalCollision(
      candidates,
      { top: 78, left: 95, right: 105, bottom: 88, width: 10, height: 10 }
    )

    expect(result.length).toBe(1)
    expect(result[0].id).toBe('end-container')
  })

  it('uses nearest edge (top or bottom) for distance', () => {
    const candidate = createCandidate('test', {
      top: 100, bottom: 200, left: 0, right: 100, width: 100, height: 100
    })

    const result = weightedVerticalCollision(
      [candidate],
      { top: 145, left: 0, right: 100, bottom: 155, width: 100, height: 10 }
    )

    expect(result.length).toBe(1)
  })

  it('returns single winner', () => {
    const candidates = [
      createCandidate('a', { top: 0, bottom: 20, left: 0, right: 100, width: 100, height: 20 }),
      createCandidate('b', { top: 30, bottom: 50, left: 0, right: 100, width: 100, height: 20 }),
      createCandidate('c', { top: 60, bottom: 80, left: 0, right: 100, width: 100, height: 20 }),
    ]

    const result = weightedVerticalCollision(
      candidates,
      { top: 35, left: 0, right: 100, bottom: 45, width: 100, height: 10 }
    )

    expect(result.length).toBe(1)
  })
})

describe('closestCenterCollision', () => {
  it('returns empty array when no candidates', () => {
    const result = closestCenterCollision(
      [],
      { top: 50, left: 0, width: 100, height: 10, right: 100, bottom: 60 }
    )

    expect(result).toEqual([])
  })

  it('returns the container with closest center', () => {
    const candidates = [
      createCandidate('far', { top: 100, bottom: 120, left: 100, right: 120, width: 20, height: 20 }),
      createCandidate('close', { top: 40, bottom: 60, left: 40, right: 60, width: 20, height: 20 }),
    ]

    const result = closestCenterCollision(
      candidates,
      { top: 45, left: 45, right: 55, bottom: 55, width: 10, height: 10 }
    )

    expect(result.length).toBe(1)
    expect(result[0].id).toBe('close')
  })

  it('considers both X and Y distance', () => {
    const candidates = [
      // Center at (50, 50)
      createCandidate('a', { top: 40, bottom: 60, left: 40, right: 60, width: 20, height: 20 }),
      // Center at (150, 50)
      createCandidate('b', { top: 40, bottom: 60, left: 140, right: 160, width: 20, height: 20 }),
    ]

    // Collision rect center at (100, 50) - equidistant on Y, but different X
    const result = closestCenterCollision(
      candidates,
      { top: 45, left: 95, right: 105, bottom: 55, width: 10, height: 10 }
    )

    expect(result.length).toBe(1)
    // Both should be 50px away on X, so either could win
    expect(['a', 'b']).toContain(result[0].id)
  })

  it('returns single winner', () => {
    const candidates = [
      createCandidate('a', { top: 0, bottom: 20, left: 0, right: 20, width: 20, height: 20 }),
      createCandidate('b', { top: 100, bottom: 120, left: 100, right: 120, width: 20, height: 20 }),
    ]

    const result = closestCenterCollision(
      candidates,
      { top: 5, left: 5, right: 15, bottom: 15, width: 10, height: 10 }
    )

    expect(result.length).toBe(1)
    expect(result[0].id).toBe('a')
  })
})

describe('createStickyCollision', () => {
  it('returns the closest container on first call', () => {
    const sticky = createStickyCollision(15)
    const candidates = [
      createCandidate('far', { top: 100, bottom: 120, left: 0, right: 100, width: 100, height: 20 }),
      createCandidate('close', { top: 40, bottom: 60, left: 0, right: 100, width: 100, height: 20 }),
    ]

    const result = sticky(
      candidates,
      { top: 50, left: 0, right: 100, bottom: 60, width: 100, height: 10 }
    )

    expect(result.length).toBe(1)
    expect(result[0].id).toBe('close')
  })

  it('sticks to current zone when new zone is not significantly better', () => {
    const sticky = createStickyCollision(15)

    // Zone A at y=40-60, Zone B at y=70-90
    const candidates = [
      createCandidate('zoneA', { top: 40, bottom: 60, left: 0, right: 100, width: 100, height: 20 }),
      createCandidate('zoneB', { top: 70, bottom: 90, left: 0, right: 100, width: 100, height: 20 }),
    ]

    // First call: pointer near zoneA (y=55)
    const result1 = sticky(
      candidates,
      { top: 50, left: 0, right: 100, bottom: 60, width: 100, height: 10 }
    )
    expect(result1[0].id).toBe('zoneA')

    // Second call: pointer moved slightly toward zoneB (y=62)
    // Both zones are close, but zoneB is not 15px better, should stick to zoneA
    const result2 = sticky(
      candidates,
      { top: 57, left: 0, right: 100, bottom: 67, width: 100, height: 10 }
    )
    expect(result2[0].id).toBe('zoneA')
  })

  it('switches to new zone when it is significantly better', () => {
    const sticky = createStickyCollision(15)

    const candidates = [
      createCandidate('zoneA', { top: 40, bottom: 60, left: 0, right: 100, width: 100, height: 20 }),
      createCandidate('zoneB', { top: 100, bottom: 120, left: 0, right: 100, width: 100, height: 20 }),
    ]

    // First call: pointer near zoneA
    const result1 = sticky(
      candidates,
      { top: 50, left: 0, right: 100, bottom: 60, width: 100, height: 10 }
    )
    expect(result1[0].id).toBe('zoneA')

    // Second call: pointer moved far toward zoneB
    const result2 = sticky(
      candidates,
      { top: 105, left: 0, right: 100, bottom: 115, width: 100, height: 10 }
    )
    expect(result2[0].id).toBe('zoneB')
  })

  it('reset() clears the current zone', () => {
    const sticky = createStickyCollision(15)

    const candidates = [
      createCandidate('zoneA', { top: 40, bottom: 60, left: 0, right: 100, width: 100, height: 20 }),
      createCandidate('zoneB', { top: 100, bottom: 120, left: 0, right: 100, width: 100, height: 20 }),
    ]

    // Activate zoneA
    sticky(
      candidates,
      { top: 50, left: 0, right: 100, bottom: 60, width: 100, height: 10 }
    )

    // Reset
    sticky.reset()

    // Now pointer is clearly closer to zoneB, should pick zoneB without stickiness
    const result = sticky(
      candidates,
      { top: 105, left: 0, right: 100, bottom: 115, width: 100, height: 10 }
    )
    expect(result[0].id).toBe('zoneB')
  })

  it('switches zones based on horizontal position even when vertically close', () => {
    const sticky = createStickyCollision(20)

    // Simulates end-container (indented) vs after-container (parent level)
    const candidates = [
      createCandidate('end-container', { top: 80, bottom: 84, left: 48, right: 300, width: 252, height: 4 }),
      createCandidate('after-container', { top: 84, bottom: 88, left: 0, right: 300, width: 300, height: 4 }),
    ]

    // First: pointer inside container area -> picks end-container
    sticky(
      candidates,
      { top: 76, left: 95, right: 105, bottom: 86, width: 10, height: 10 }
    )

    // Move pointer to parent indentation (X=20) -> should switch despite sticky threshold
    const result = sticky(
      candidates,
      { top: 78, left: 15, right: 25, bottom: 88, width: 10, height: 10 }
    )

    expect(result[0].id).toBe('after-container')
  })

  it('uses reduced sticky threshold for cross-depth transitions', () => {
    const sticky = createStickyCollision(20)

    const candidates = [
      createCandidate('end-container', { top: 80, bottom: 84, left: 48, right: 300, width: 252, height: 4 }),
      createCandidate('after-container', { top: 84, bottom: 88, left: 0, right: 300, width: 300, height: 4 }),
    ]

    // Start with pointer deep inside container (X=100)
    sticky(
      candidates,
      { top: 76, left: 95, right: 105, bottom: 86, width: 10, height: 10 }
    )

    // Move pointer only slightly left (X=60)
    const result = sticky(
      candidates,
      { top: 81, left: 55, right: 65, bottom: 91, width: 10, height: 10 }
    )

    // end-container still wins here
    expect(result[0].id).toBe('end-container')
  })

  it('responds quickly to cross-depth pointer movement', () => {
    const sticky = createStickyCollision(20)

    // Two zones at different depths, same vertical position
    const candidates = [
      createCandidate('deep-zone', { top: 100, bottom: 104, left: 48, right: 300, width: 252, height: 4 }),
      createCandidate('shallow-zone', { top: 100, bottom: 104, left: 0, right: 300, width: 300, height: 4 }),
    ]

    // Start at deep indentation (X=80) — deep-zone wins
    const r1 = sticky(
      candidates,
      { top: 97, left: 75, right: 85, bottom: 107, width: 10, height: 10 }
    )
    expect(r1[0].id).toBe('deep-zone')

    // Move pointer to shallow indentation (X=30) — should switch quickly
    // because cross-depth threshold is 20 * 0.25 = 5
    const r2 = sticky(
      candidates,
      { top: 97, left: 25, right: 35, bottom: 107, width: 10, height: 10 }
    )
    // deep-zone: pointer X=30 < left=48, outside. horizontalScore=(48-30)*2=36. score=2+36=38
    // shallow-zone: pointer X=30 within [0,300]. horizontalScore=30*0.3=9. score=2+9=11
    // crossDepth: |48-0|=48 > 20. effectiveThreshold=5. scoreDiff=38-11=27 > 5. switches.
    expect(r2[0].id).toBe('shallow-zone')
  })

  it('handles case when current zone is no longer available', () => {
    const sticky = createStickyCollision(15)

    const candidatesWithA = [
      createCandidate('zoneA', { top: 40, bottom: 60, left: 0, right: 100, width: 100, height: 20 }),
    ]

    // Activate zoneA
    sticky(
      candidatesWithA,
      { top: 50, left: 0, right: 100, bottom: 60, width: 100, height: 10 }
    )

    // zoneA is gone, only zoneB exists
    const candidatesWithB = [
      createCandidate('zoneB', { top: 70, bottom: 90, left: 0, right: 100, width: 100, height: 20 }),
    ]

    const result = sticky(
      candidatesWithB,
      { top: 75, left: 0, right: 100, bottom: 85, width: 100, height: 10 }
    )
    expect(result[0].id).toBe('zoneB')
  })

  it('returns empty array when no candidates', () => {
    const sticky = createStickyCollision(15)

    const result = sticky(
      [],
      { top: 50, left: 0, right: 100, bottom: 60, width: 100, height: 10 }
    )

    expect(result).toEqual([])
  })
})

describe('createStickyCollision with snapshotted rects', () => {
  it('uses snapshot rects instead of live candidate rects', () => {
    const snapshotRef: SnapshotRectsRef = { current: null }
    const sticky = createStickyCollision(15, snapshotRef)

    // Live rects: zoneA is closer to pointer
    const candidates = [
      createCandidate('zoneA', { top: 40, bottom: 60, left: 0, right: 100, width: 100, height: 20 }),
      createCandidate('zoneB', { top: 100, bottom: 120, left: 0, right: 100, width: 100, height: 20 }),
    ]

    // Snapshot rects: zoneB is now closer (simulates ghost pushing zoneA down)
    snapshotRef.current = new Map<string, Rect>([
      ['zoneA', { top: 100, left: 0, width: 100, height: 20, right: 100, bottom: 120 }],
      ['zoneB', { top: 40, left: 0, width: 100, height: 20, right: 100, bottom: 60 }],
    ])

    // Pointer near y=50 — live rects would pick zoneA, snapshot picks zoneB
    const result = sticky(
      candidates,
      { top: 45, left: 0, right: 100, bottom: 55, width: 100, height: 10 }
    )

    expect(result[0].id).toBe('zoneB')
  })

  it('falls back to live rects when snapshot is null', () => {
    const snapshotRef: SnapshotRectsRef = { current: null }
    const sticky = createStickyCollision(15, snapshotRef)

    const candidates = [
      createCandidate('zoneA', { top: 40, bottom: 60, left: 0, right: 100, width: 100, height: 20 }),
      createCandidate('zoneB', { top: 100, bottom: 120, left: 0, right: 100, width: 100, height: 20 }),
    ]

    // No snapshot — should use live rects
    const result = sticky(
      candidates,
      { top: 45, left: 0, right: 100, bottom: 55, width: 100, height: 10 }
    )

    expect(result[0].id).toBe('zoneA')
  })

  it('falls back to live rect for zones missing from snapshot', () => {
    const snapshotRef: SnapshotRectsRef = { current: null }
    const sticky = createStickyCollision(15, snapshotRef)

    const candidates = [
      createCandidate('zoneA', { top: 40, bottom: 60, left: 0, right: 100, width: 100, height: 20 }),
      createCandidate('zoneB', { top: 100, bottom: 120, left: 0, right: 100, width: 100, height: 20 }),
    ]

    // Snapshot only has zoneA — zoneB falls back to live rect
    snapshotRef.current = new Map<string, Rect>([
      ['zoneA', { top: 40, left: 0, width: 100, height: 20, right: 100, bottom: 60 }],
    ])

    // Pointer near zoneA
    const result = sticky(
      candidates,
      { top: 45, left: 0, right: 100, bottom: 55, width: 100, height: 10 }
    )

    expect(result[0].id).toBe('zoneA')
  })

  it('prevents ghost-induced feedback loop with frozen rects', () => {
    const snapshotRef: SnapshotRectsRef = { current: null }
    const sticky = createStickyCollision(20, snapshotRef)

    // Initial snapshot (taken before ghost appeared)
    snapshotRef.current = new Map<string, Rect>([
      ['end-container', { top: 80, left: 48, width: 252, height: 4, right: 300, bottom: 84 }],
      ['after-container', { top: 84, left: 0, width: 300, height: 4, right: 300, bottom: 88 }],
    ])

    // Live rects are shifted by ghost (40px)
    const candidates = [
      createCandidate('end-container', { top: 120, bottom: 124, left: 48, right: 300, width: 252, height: 4 }),
      createCandidate('after-container', { top: 124, bottom: 128, left: 0, right: 300, width: 300, height: 4 }),
    ]

    // Pointer at y=83, x=100 (inside container) — snapshot has end-container at 80-84
    const result1 = sticky(
      candidates,
      { top: 78, left: 95, right: 105, bottom: 88, width: 10, height: 10 }
    )
    expect(result1[0].id).toBe('end-container')

    // Pointer stays put — result should be stable despite live rects being different
    const result2 = sticky(
      candidates,
      { top: 78, left: 95, right: 105, bottom: 88, width: 10, height: 10 }
    )
    expect(result2[0].id).toBe('end-container')
  })
})
