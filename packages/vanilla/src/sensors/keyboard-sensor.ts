import type { Sensor, SensorCallbacks } from './types'

export interface KeyboardSensorCallbacks extends SensorCallbacks {
  onFocusPrev(): void
  onFocusNext(): void
  onExpand(): void
  onCollapse(): void
  onFocusFirst(): void
  onFocusLast(): void
  onToggleExpand(): void
  onSelect(): void
}

export class KeyboardSensor implements Sensor {
  private container: HTMLElement | null = null
  private callbacks: KeyboardSensorCallbacks
  private boundKeyDown: (e: KeyboardEvent) => void

  constructor(callbacks: KeyboardSensorCallbacks) {
    this.callbacks = callbacks
    this.boundKeyDown = this.onKeyDown.bind(this)
  }

  attach(container: HTMLElement): void {
    this.container = container
    container.addEventListener('keydown', this.boundKeyDown)
  }

  detach(): void {
    this.container?.removeEventListener('keydown', this.boundKeyDown)
    this.container = null
  }

  private onKeyDown(e: KeyboardEvent): void {
    switch (e.key) {
      case 'ArrowUp':
        e.preventDefault()
        this.callbacks.onFocusPrev()
        break
      case 'ArrowDown':
        e.preventDefault()
        this.callbacks.onFocusNext()
        break
      case 'ArrowRight':
        e.preventDefault()
        this.callbacks.onExpand()
        break
      case 'ArrowLeft':
        e.preventDefault()
        this.callbacks.onCollapse()
        break
      case 'Home':
        e.preventDefault()
        this.callbacks.onFocusFirst()
        break
      case 'End':
        e.preventDefault()
        this.callbacks.onFocusLast()
        break
      case 'Enter':
      case ' ':
        e.preventDefault()
        this.callbacks.onToggleExpand()
        break
      case 'Escape':
        this.callbacks.onDragCancel()
        break
    }
  }
}
