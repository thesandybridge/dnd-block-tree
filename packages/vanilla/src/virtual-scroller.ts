export interface VirtualScrollerOptions {
  itemHeight: number
  overscan?: number
}

export interface VirtualRange {
  startIndex: number
  endIndex: number
  offsetY: number
  totalHeight: number
  visibleIds: Set<string>
}

/**
 * Virtual scrolling for large trees.
 * Calculates visible range based on scroll position and viewport height.
 */
export class VirtualScroller {
  private itemHeight: number
  private overscan: number

  constructor(options: VirtualScrollerOptions) {
    this.itemHeight = options.itemHeight
    this.overscan = options.overscan ?? 5
  }

  /** Calculate the visible range for a given scroll state */
  calculate(
    scrollTop: number,
    viewportHeight: number,
    totalItems: number,
    blockIds: string[]
  ): VirtualRange {
    const startIndex = Math.max(0, Math.floor(scrollTop / this.itemHeight) - this.overscan)
    const visibleCount = Math.ceil(viewportHeight / this.itemHeight) + 2 * this.overscan
    const endIndex = Math.min(totalItems, startIndex + visibleCount)

    const visibleIds = new Set<string>()
    for (let i = startIndex; i < endIndex && i < blockIds.length; i++) {
      visibleIds.add(blockIds[i])
    }

    return {
      startIndex,
      endIndex,
      offsetY: startIndex * this.itemHeight,
      totalHeight: totalItems * this.itemHeight,
      visibleIds,
    }
  }
}
