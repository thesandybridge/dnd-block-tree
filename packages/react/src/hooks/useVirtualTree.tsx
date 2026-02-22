'use client'

import { useState, useCallback, useRef, useEffect } from 'react'

export interface UseVirtualTreeOptions {
  /** Ref to the scrollable container element */
  containerRef: React.RefObject<HTMLElement | null>
  /** Total number of items in the tree */
  itemCount: number
  /** Fixed height of each item in pixels */
  itemHeight: number
  /** Number of extra items to render outside the visible range (default: 5) */
  overscan?: number
}

export interface UseVirtualTreeResult {
  /** Start and end indices of the visible range (inclusive) */
  visibleRange: { start: number; end: number }
  /** Total height of all items for the spacer div */
  totalHeight: number
  /** Offset from top for the first rendered item */
  offsetY: number
}

/**
 * Lightweight fixed-height virtual scrolling hook for tree lists.
 *
 * Tracks scroll position on the container and computes which items
 * should be rendered based on the viewport and overscan.
 */
export function useVirtualTree({
  containerRef,
  itemCount,
  itemHeight,
  overscan = 5,
}: UseVirtualTreeOptions): UseVirtualTreeResult {
  const [scrollTop, setScrollTop] = useState(0)
  const [containerHeight, setContainerHeight] = useState(0)
  const rafId = useRef(0)

  const handleScroll = useCallback(() => {
    cancelAnimationFrame(rafId.current)
    rafId.current = requestAnimationFrame(() => {
      const el = containerRef.current
      if (el) {
        setScrollTop(el.scrollTop)
        setContainerHeight(el.clientHeight)
      }
    })
  }, [containerRef])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    setScrollTop(el.scrollTop)
    setContainerHeight(el.clientHeight)

    el.addEventListener('scroll', handleScroll, { passive: true })
    return () => {
      el.removeEventListener('scroll', handleScroll)
      cancelAnimationFrame(rafId.current)
    }
  }, [containerRef, handleScroll])

  const totalHeight = itemCount * itemHeight

  const startRaw = Math.floor(scrollTop / itemHeight)
  const visibleCount = Math.ceil(containerHeight / itemHeight)
  const start = Math.max(0, startRaw - overscan)
  const end = Math.min(itemCount - 1, startRaw + visibleCount + overscan)

  const offsetY = start * itemHeight

  return {
    visibleRange: { start, end },
    totalHeight,
    offsetY,
  }
}
