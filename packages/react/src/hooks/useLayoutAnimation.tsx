'use client'

import { useRef, useLayoutEffect } from 'react'

export interface UseLayoutAnimationOptions {
  /** Duration of the transition in ms (default: 200) */
  duration?: number
  /** CSS easing function (default: 'ease') */
  easing?: string
  /** CSS selector for animated children (default: '[data-block-id]') */
  selector?: string
}

/**
 * FLIP-based layout animation hook for reorder transitions.
 *
 * Captures block positions before render (layout effect cleanup),
 * computes the delta after render, and applies a CSS transform transition.
 *
 * Usage:
 * ```tsx
 * const containerRef = useRef<HTMLDivElement>(null)
 * useLayoutAnimation(containerRef, { duration: 200 })
 * return <div ref={containerRef}>...</div>
 * ```
 */
export function useLayoutAnimation(
  containerRef: React.RefObject<HTMLElement | null>,
  options: UseLayoutAnimationOptions = {}
) {
  const {
    duration = 200,
    easing = 'ease',
    selector = '[data-block-id]',
  } = options

  const prevPositions = useRef(new Map<string, DOMRect>())

  useLayoutEffect(() => {
    const container = containerRef.current
    if (!container) return

    const children = container.querySelectorAll(selector)
    const currentPositions = new Map<string, DOMRect>()

    children.forEach(el => {
      const id = (el as HTMLElement).dataset.blockId
      if (id) {
        currentPositions.set(id, el.getBoundingClientRect())
      }
    })

    children.forEach(el => {
      const htmlEl = el as HTMLElement
      const id = htmlEl.dataset.blockId
      if (!id) return

      const prev = prevPositions.current.get(id)
      const curr = currentPositions.get(id)
      if (!prev || !curr) return

      const deltaY = prev.top - curr.top
      const deltaX = prev.left - curr.left

      if (deltaY === 0 && deltaX === 0) return

      htmlEl.style.transform = `translate(${deltaX}px, ${deltaY}px)`
      htmlEl.style.transition = 'none'

      requestAnimationFrame(() => {
        htmlEl.style.transition = `transform ${duration}ms ${easing}`
        htmlEl.style.transform = ''

        const onEnd = () => {
          htmlEl.style.transition = ''
          htmlEl.removeEventListener('transitionend', onEnd)
        }
        htmlEl.addEventListener('transitionend', onEnd)
      })
    })

    prevPositions.current = currentPositions
  })
}
