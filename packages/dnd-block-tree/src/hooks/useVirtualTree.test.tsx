import { renderHook, act, waitFor } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { useVirtualTree } from './useVirtualTree'

function createMockContainerRef(scrollTop = 0, clientHeight = 500) {
  const el = document.createElement('div')
  Object.defineProperty(el, 'scrollTop', {
    get: () => scrollTop,
    configurable: true,
  })
  Object.defineProperty(el, 'clientHeight', {
    get: () => clientHeight,
    configurable: true,
  })
  return { current: el }
}

describe('useVirtualTree', () => {
  it('computes totalHeight as itemCount * itemHeight', async () => {
    const containerRef = createMockContainerRef(0, 500)

    const { result } = renderHook(() =>
      useVirtualTree({
        containerRef,
        itemCount: 100,
        itemHeight: 40,
        overscan: 5,
      })
    )

    await waitFor(() => {
      expect(result.current.totalHeight).toBe(4000)
    })
  })

  it('computes visibleRange at top with scrollTop=0', async () => {
    const containerRef = createMockContainerRef(0, 200)

    const { result } = renderHook(() =>
      useVirtualTree({
        containerRef,
        itemCount: 100,
        itemHeight: 40,
        overscan: 0,
      })
    )

    await waitFor(() => {
      expect(result.current.visibleRange.start).toBe(0)
      // clientHeight=200, itemHeight=40 -> ceil(200/40)=5 visible items
      // startRaw=0, end = min(99, 0 + 5 + 0) = 5
      expect(result.current.visibleRange.end).toBe(5)
    })
  })

  it('overscan extends range', async () => {
    const containerRef = createMockContainerRef(0, 200)

    const { result } = renderHook(() =>
      useVirtualTree({
        containerRef,
        itemCount: 100,
        itemHeight: 40,
        overscan: 3,
      })
    )

    await waitFor(() => {
      // start = max(0, 0 - 3) = 0 (clamped)
      expect(result.current.visibleRange.start).toBe(0)
      // end = min(99, 0 + 5 + 3) = 8
      expect(result.current.visibleRange.end).toBe(8)
    })
  })

  it('offsetY is start * itemHeight', async () => {
    const containerRef = createMockContainerRef(0, 200)

    const { result } = renderHook(() =>
      useVirtualTree({
        containerRef,
        itemCount: 100,
        itemHeight: 40,
        overscan: 0,
      })
    )

    await waitFor(() => {
      // start=0, offsetY = 0 * 40 = 0
      expect(result.current.offsetY).toBe(0)
    })
  })

  it('computes visibleRange for scrolled position', async () => {
    // scrollTop=400 means 10 items scrolled past (400/40)
    const containerRef = createMockContainerRef(400, 200)

    const { result } = renderHook(() =>
      useVirtualTree({
        containerRef,
        itemCount: 100,
        itemHeight: 40,
        overscan: 3,
      })
    )

    await waitFor(() => {
      // startRaw = floor(400/40) = 10
      // start = max(0, 10 - 3) = 7
      expect(result.current.visibleRange.start).toBe(7)
      // visibleCount = ceil(200/40) = 5
      // end = min(99, 10 + 5 + 3) = 18
      expect(result.current.visibleRange.end).toBe(18)
      // offsetY = 7 * 40 = 280
      expect(result.current.offsetY).toBe(280)
    })
  })
})
