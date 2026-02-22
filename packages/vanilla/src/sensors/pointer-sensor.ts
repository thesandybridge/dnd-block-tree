import type { Sensor, SensorCallbacks } from './types'
import { closestWithData } from '../utils/dom'

export interface PointerSensorOptions {
  activationDistance?: number
}

export class PointerSensor implements Sensor {
  private container: HTMLElement | null = null
  private callbacks: SensorCallbacks
  private activationDistance: number
  private isDragging = false
  private startX = 0
  private startY = 0
  private blockId: string | null = null

  private boundPointerDown: (e: PointerEvent) => void
  private boundPointerMove: (e: PointerEvent) => void
  private boundPointerUp: (e: PointerEvent) => void

  constructor(callbacks: SensorCallbacks, options: PointerSensorOptions = {}) {
    this.callbacks = callbacks
    this.activationDistance = options.activationDistance ?? 8

    this.boundPointerDown = this.onPointerDown.bind(this)
    this.boundPointerMove = this.onPointerMove.bind(this)
    this.boundPointerUp = this.onPointerUp.bind(this)
  }

  attach(container: HTMLElement): void {
    this.container = container
    container.addEventListener('pointerdown', this.boundPointerDown)
  }

  detach(): void {
    this.cleanup()
    this.container?.removeEventListener('pointerdown', this.boundPointerDown)
    this.container = null
  }

  private onPointerDown(e: PointerEvent): void {
    // Only primary button
    if (e.button !== 0) return

    const draggable = closestWithData(e.target as Element, 'draggable-id')
    if (!draggable) return

    const id = draggable.getAttribute('data-draggable-id')
    if (!id) return

    this.blockId = id
    this.startX = e.clientX
    this.startY = e.clientY
    this.isDragging = false

    document.addEventListener('pointermove', this.boundPointerMove)
    document.addEventListener('pointerup', this.boundPointerUp)
  }

  private onPointerMove(e: PointerEvent): void {
    const dx = e.clientX - this.startX
    const dy = e.clientY - this.startY
    const distance = Math.sqrt(dx * dx + dy * dy)

    if (!this.isDragging) {
      if (distance >= this.activationDistance) {
        this.isDragging = true
        this.callbacks.onDragStart(this.blockId!, this.startX, this.startY)
      }
      return
    }

    this.callbacks.onDragMove(e.clientX, e.clientY)
  }

  private onPointerUp(e: PointerEvent): void {
    if (this.isDragging) {
      this.callbacks.onDragEnd(e.clientX, e.clientY)
    }
    this.cleanup()
  }

  private cleanup(): void {
    this.isDragging = false
    this.blockId = null
    document.removeEventListener('pointermove', this.boundPointerMove)
    document.removeEventListener('pointerup', this.boundPointerUp)
  }
}
