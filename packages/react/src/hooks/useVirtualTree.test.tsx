import { describe, it, expect } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useVirtualTree } from './useVirtualTree'

function createRef(el: HTMLElement | null = null) {
  return { current: el }
}

describe('useVirtualTree', () => {
  it('returns correct totalHeight', () => {
    const { result } = renderHook(() =>
      useVirtualTree({
        containerRef: createRef(),
        itemCount: 100,
        itemHeight: 40,
      })
    )
    expect(result.current.totalHeight).toBe(4000)
  })

  it('returns correct visible range at default scroll position', () => {
    const { result } = renderHook(() =>
      useVirtualTree({
        containerRef: createRef(),
        itemCount: 50,
        itemHeight: 30,
        overscan: 5,
      })
    )
    // scrollTop=0, containerHeight=0 (no real DOM)
    // startRaw=0, visibleCount=0, start=max(0, 0-5)=0, end=min(50-1, 0+0+5)=5
    expect(result.current.visibleRange.start).toBe(0)
    expect(result.current.visibleRange.end).toBe(5)
  })

  it('offsetY is start * itemHeight', () => {
    const { result } = renderHook(() =>
      useVirtualTree({
        containerRef: createRef(),
        itemCount: 100,
        itemHeight: 40,
      })
    )
    expect(result.current.offsetY).toBe(result.current.visibleRange.start * 40)
  })

  it('handles zero items', () => {
    const { result } = renderHook(() =>
      useVirtualTree({
        containerRef: createRef(),
        itemCount: 0,
        itemHeight: 40,
      })
    )
    expect(result.current.totalHeight).toBe(0)
    expect(result.current.visibleRange.start).toBe(0)
    // end = min(0-1, ...) = -1, but Math.min handles it
    expect(result.current.visibleRange.end).toBeLessThanOrEqual(0)
  })

  it('respects custom overscan', () => {
    const { result } = renderHook(() =>
      useVirtualTree({
        containerRef: createRef(),
        itemCount: 100,
        itemHeight: 50,
        overscan: 10,
      })
    )
    // scrollTop=0, containerHeight=0
    // start=max(0, 0-10)=0, end=min(99, 0+0+10)=10
    expect(result.current.visibleRange.end).toBe(10)
  })

  it('uses default overscan of 5', () => {
    const { result } = renderHook(() =>
      useVirtualTree({
        containerRef: createRef(),
        itemCount: 100,
        itemHeight: 50,
      })
    )
    // end = min(99, 0+0+5) = 5
    expect(result.current.visibleRange.end).toBe(5)
  })
})
