import { describe, it, expect } from 'vitest'
import { VirtualScroller } from './virtual-scroller'

describe('VirtualScroller', () => {
  const ids = (n: number) => Array.from({ length: n }, (_, i) => `b${i}`)

  it('calculates visible range at scrollTop=0', () => {
    const scroller = new VirtualScroller({ itemHeight: 40, overscan: 5 })
    const result = scroller.calculate(0, 400, 100, ids(100))
    // startIndex = max(0, floor(0/40) - 5) = 0
    // visibleCount = ceil(400/40) + 10 = 20
    // endIndex = min(100, 0 + 20) = 20
    expect(result.startIndex).toBe(0)
    expect(result.endIndex).toBe(20)
    expect(result.offsetY).toBe(0)
    expect(result.totalHeight).toBe(4000)
  })

  it('calculates visible range when scrolled', () => {
    const scroller = new VirtualScroller({ itemHeight: 40, overscan: 5 })
    // scrollTop=800 means floor(800/40) = 20, start = 20-5 = 15
    const result = scroller.calculate(800, 400, 100, ids(100))
    expect(result.startIndex).toBe(15)
    // visibleCount = ceil(400/40) + 10 = 20, endIndex = min(100, 15+20) = 35
    expect(result.endIndex).toBe(35)
    expect(result.offsetY).toBe(15 * 40)
  })

  it('clamps startIndex to 0', () => {
    const scroller = new VirtualScroller({ itemHeight: 40, overscan: 10 })
    // floor(80/40) = 2, 2-10 = -8, clamped to 0
    const result = scroller.calculate(80, 400, 100, ids(100))
    expect(result.startIndex).toBe(0)
  })

  it('clamps endIndex to totalItems', () => {
    const scroller = new VirtualScroller({ itemHeight: 40, overscan: 5 })
    // Scroll to near bottom: 10 items, scrollTop at last page
    const result = scroller.calculate(200, 400, 10, ids(10))
    expect(result.endIndex).toBe(10)
  })

  it('totalHeight equals totalItems * itemHeight', () => {
    const scroller = new VirtualScroller({ itemHeight: 30 })
    const result = scroller.calculate(0, 300, 50, ids(50))
    expect(result.totalHeight).toBe(1500)
  })

  it('visibleIds contains correct block ids', () => {
    const scroller = new VirtualScroller({ itemHeight: 100, overscan: 0 })
    const allIds = ids(20)
    // scrollTop=0, viewportHeight=300 -> items 0..2 visible (ceil(300/100)=3, +0 overscan)
    const result = scroller.calculate(0, 300, 20, allIds)
    expect(result.startIndex).toBe(0)
    expect(result.endIndex).toBe(3)
    expect(result.visibleIds).toEqual(new Set(['b0', 'b1', 'b2']))
  })

  it('handles empty list', () => {
    const scroller = new VirtualScroller({ itemHeight: 40 })
    const result = scroller.calculate(0, 400, 0, [])
    expect(result.startIndex).toBe(0)
    expect(result.endIndex).toBe(0)
    expect(result.totalHeight).toBe(0)
    expect(result.visibleIds.size).toBe(0)
  })

  it('uses default overscan of 5', () => {
    const scroller = new VirtualScroller({ itemHeight: 50 })
    // floor(500/50) = 10, start = 10-5 = 5
    const result = scroller.calculate(500, 250, 100, ids(100))
    expect(result.startIndex).toBe(5)
    // visibleCount = ceil(250/50) + 10 = 15, end = min(100, 5+15) = 20
    expect(result.endIndex).toBe(20)
  })
})
