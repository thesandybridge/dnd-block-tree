import type { BaseBlock } from '@dnd-block-tree/core'

export interface DragOverlayOptions {
  /** Custom renderer for the overlay content */
  renderOverlay?: (block: BaseBlock) => HTMLElement
}

/**
 * Floating drag overlay that follows the pointer during drag.
 * Creates and manages a fixed-position overlay element.
 */
export class DragOverlay {
  private overlay: HTMLElement | null = null
  private options: DragOverlayOptions

  constructor(options: DragOverlayOptions = {}) {
    this.options = options
  }

  show(block: BaseBlock, sourceEl: HTMLElement, x: number, y: number): void {
    this.hide()

    const overlay = document.createElement('div')
    overlay.setAttribute('data-drag-overlay', 'true')
    overlay.style.position = 'fixed'
    overlay.style.left = '0'
    overlay.style.top = '0'
    overlay.style.zIndex = '9999'
    overlay.style.pointerEvents = 'none'
    overlay.style.opacity = '0.7'
    overlay.style.backdropFilter = 'blur(4px)'
    overlay.style.willChange = 'transform'

    if (this.options.renderOverlay) {
      overlay.appendChild(this.options.renderOverlay(block))
    } else {
      // Default: clone the source element
      const rect = sourceEl.getBoundingClientRect()
      overlay.style.width = `${rect.width}px`
      const clone = sourceEl.cloneNode(true) as HTMLElement
      clone.style.margin = '0'
      overlay.appendChild(clone)
    }

    this.setPosition(overlay, x, y)
    document.body.appendChild(overlay)
    this.overlay = overlay
  }

  move(x: number, y: number): void {
    if (this.overlay) {
      this.setPosition(this.overlay, x, y)
    }
  }

  hide(): void {
    if (this.overlay) {
      this.overlay.remove()
      this.overlay = null
    }
  }

  private setPosition(el: HTMLElement, x: number, y: number): void {
    el.style.transform = `translate(${x}px, ${y}px)`
  }
}
