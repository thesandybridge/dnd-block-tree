export interface LayoutAnimationOptions {
  duration?: number
  easing?: string
}

/**
 * FLIP animation for block layout changes.
 * Records element positions before a DOM update, then animates from old to new.
 */
export class LayoutAnimation {
  private duration: number
  private easing: string
  private snapshots = new Map<string, DOMRect>()

  constructor(options: LayoutAnimationOptions = {}) {
    this.duration = options.duration ?? 200
    this.easing = options.easing ?? 'ease'
  }

  /** Record current positions of all block elements in a container */
  snapshot(container: HTMLElement): void {
    this.snapshots.clear()
    const blocks = container.querySelectorAll<HTMLElement>('[data-block-id]')
    for (const el of blocks) {
      const id = el.getAttribute('data-block-id')
      if (id) {
        this.snapshots.set(id, el.getBoundingClientRect())
      }
    }
  }

  /** After DOM update, animate elements from old to new positions */
  animate(container: HTMLElement): void {
    if (this.snapshots.size === 0) return

    const blocks = container.querySelectorAll<HTMLElement>('[data-block-id]')
    for (const el of blocks) {
      const id = el.getAttribute('data-block-id')
      if (!id) continue

      const oldRect = this.snapshots.get(id)
      if (!oldRect) continue

      const newRect = el.getBoundingClientRect()

      const deltaX = oldRect.left - newRect.left
      const deltaY = oldRect.top - newRect.top

      if (Math.abs(deltaX) < 1 && Math.abs(deltaY) < 1) continue

      el.style.transform = `translate(${deltaX}px, ${deltaY}px)`
      el.style.transition = 'none'
    }

    // Force reflow so the browser registers the initial transforms,
    // then enable transitions in the same frame (no visible jump).
    void container.offsetHeight

    for (const el of blocks) {
      if (!el.style.transform) continue
      el.style.transition = `transform ${this.duration}ms ${this.easing}`
      el.style.transform = ''
      el.addEventListener('transitionend', () => {
        el.style.transition = ''
      }, { once: true })
    }

    this.snapshots.clear()
  }
}
