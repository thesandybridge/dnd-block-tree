import type { Sensor, SensorCallbacks } from './types'
import { closestWithData } from '../utils/dom'
import { triggerHaptic } from '../utils/haptic'

export interface TouchSensorOptions {
  longPressDelay?: number
  hapticFeedback?: boolean
}

export class TouchSensor implements Sensor {
  private container: HTMLElement | null = null
  private callbacks: SensorCallbacks
  private longPressDelay: number
  private hapticFeedback: boolean
  private isDragging = false
  private pressTimer: ReturnType<typeof setTimeout> | null = null
  private blockId: string | null = null

  private boundTouchStart: (e: TouchEvent) => void
  private boundTouchMove: (e: TouchEvent) => void
  private boundTouchEnd: (e: TouchEvent) => void

  constructor(callbacks: SensorCallbacks, options: TouchSensorOptions = {}) {
    this.callbacks = callbacks
    this.longPressDelay = options.longPressDelay ?? 200
    this.hapticFeedback = options.hapticFeedback ?? true

    this.boundTouchStart = this.onTouchStart.bind(this)
    this.boundTouchMove = this.onTouchMove.bind(this)
    this.boundTouchEnd = this.onTouchEnd.bind(this)
  }

  attach(container: HTMLElement): void {
    this.container = container
    container.addEventListener('touchstart', this.boundTouchStart, { passive: false })
  }

  detach(): void {
    this.cleanup()
    this.container?.removeEventListener('touchstart', this.boundTouchStart)
    this.container = null
  }

  private onTouchStart(e: TouchEvent): void {
    if (e.touches.length !== 1) return

    const draggable = closestWithData(e.target as Element, 'draggable-id')
    if (!draggable) return

    const id = draggable.getAttribute('data-draggable-id')
    if (!id) return

    this.blockId = id
    const touch = e.touches[0]

    this.pressTimer = setTimeout(() => {
      this.isDragging = true
      if (this.hapticFeedback) triggerHaptic()
      this.callbacks.onDragStart(this.blockId!, touch.clientX, touch.clientY)
    }, this.longPressDelay)

    document.addEventListener('touchmove', this.boundTouchMove, { passive: false })
    document.addEventListener('touchend', this.boundTouchEnd)
    document.addEventListener('touchcancel', this.boundTouchEnd)
  }

  private onTouchMove(e: TouchEvent): void {
    const touch = e.touches[0]

    if (!this.isDragging) {
      // Cancel long-press if finger moved before activation
      if (this.pressTimer) {
        clearTimeout(this.pressTimer)
        this.pressTimer = null
        this.cleanup()
      }
      return
    }

    e.preventDefault()
    this.callbacks.onDragMove(touch.clientX, touch.clientY)
  }

  private onTouchEnd(e: TouchEvent): void {
    if (this.isDragging) {
      const touch = e.changedTouches[0]
      this.callbacks.onDragEnd(touch.clientX, touch.clientY)
    }
    this.cleanup()
  }

  private cleanup(): void {
    if (this.pressTimer) {
      clearTimeout(this.pressTimer)
      this.pressTimer = null
    }
    this.isDragging = false
    this.blockId = null
    document.removeEventListener('touchmove', this.boundTouchMove)
    document.removeEventListener('touchend', this.boundTouchEnd)
    document.removeEventListener('touchcancel', this.boundTouchEnd)
  }
}
