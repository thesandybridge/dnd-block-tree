import { describe, it, expect, vi, beforeEach, afterEach, beforeAll } from 'vitest'
import { PointerSensor } from './pointer-sensor'
import type { SensorCallbacks } from './types'

// jsdom doesn't have PointerEvent — polyfill it as a subclass of MouseEvent
beforeAll(() => {
  if (typeof globalThis.PointerEvent === 'undefined') {
    (globalThis as any).PointerEvent = class PointerEvent extends MouseEvent {
      readonly pointerId: number
      readonly pointerType: string
      constructor(type: string, init: PointerEventInit & MouseEventInit = {}) {
        super(type, init)
        this.pointerId = init.pointerId ?? 0
        this.pointerType = init.pointerType ?? 'mouse'
      }
    }
  }
})

function createCallbacks(): SensorCallbacks {
  return {
    onDragStart: vi.fn(),
    onDragMove: vi.fn(),
    onDragEnd: vi.fn(),
    onDragCancel: vi.fn(),
  }
}

function pointerEvent(type: string, opts: PointerEventInit & MouseEventInit = {}): PointerEvent {
  return new PointerEvent(type, {
    button: 0,
    clientX: 0,
    clientY: 0,
    bubbles: true,
    ...opts,
  })
}

describe('PointerSensor', () => {
  let container: HTMLElement
  let draggable: HTMLElement
  let callbacks: SensorCallbacks

  beforeEach(() => {
    container = document.createElement('div')
    draggable = document.createElement('div')
    draggable.setAttribute('data-draggable-id', 'block-1')
    container.appendChild(draggable)
    document.body.appendChild(container)
    callbacks = createCallbacks()
  })

  afterEach(() => {
    document.body.removeChild(container)
  })

  it('attach adds pointerdown listener', () => {
    const sensor = new PointerSensor(callbacks)
    const spy = vi.spyOn(container, 'addEventListener')
    sensor.attach(container)
    expect(spy).toHaveBeenCalledWith('pointerdown', expect.any(Function))
    sensor.detach()
  })

  it('detach removes pointerdown listener', () => {
    const sensor = new PointerSensor(callbacks)
    sensor.attach(container)
    const spy = vi.spyOn(container, 'removeEventListener')
    sensor.detach()
    expect(spy).toHaveBeenCalledWith('pointerdown', expect.any(Function))
  })

  it('ignores non-primary button', () => {
    const sensor = new PointerSensor(callbacks)
    sensor.attach(container)
    draggable.dispatchEvent(pointerEvent('pointerdown', { button: 2, clientX: 0, clientY: 0 }))
    document.dispatchEvent(pointerEvent('pointermove', { clientX: 100, clientY: 100 }))
    expect(callbacks.onDragStart).not.toHaveBeenCalled()
    sensor.detach()
  })

  it('ignores pointerdown on non-draggable elements', () => {
    const sensor = new PointerSensor(callbacks)
    sensor.attach(container)
    container.dispatchEvent(pointerEvent('pointerdown', { clientX: 0, clientY: 0 }))
    document.dispatchEvent(pointerEvent('pointermove', { clientX: 100, clientY: 100 }))
    expect(callbacks.onDragStart).not.toHaveBeenCalled()
    sensor.detach()
  })

  it('does not start drag below activation distance', () => {
    const sensor = new PointerSensor(callbacks, { activationDistance: 10 })
    sensor.attach(container)
    draggable.dispatchEvent(pointerEvent('pointerdown', { clientX: 50, clientY: 50 }))
    document.dispatchEvent(pointerEvent('pointermove', { clientX: 55, clientY: 55 }))
    expect(callbacks.onDragStart).not.toHaveBeenCalled()
    document.dispatchEvent(pointerEvent('pointerup', { clientX: 55, clientY: 55 }))
    sensor.detach()
  })

  it('starts drag when movement exceeds activation distance', () => {
    const sensor = new PointerSensor(callbacks, { activationDistance: 8 })
    sensor.attach(container)
    draggable.dispatchEvent(pointerEvent('pointerdown', { clientX: 50, clientY: 50 }))
    // Move 10px right (distance = 10 >= 8)
    document.dispatchEvent(pointerEvent('pointermove', { clientX: 60, clientY: 50 }))
    expect(callbacks.onDragStart).toHaveBeenCalledWith('block-1', 50, 50)
    sensor.detach()
  })

  it('calls onDragMove after drag starts', () => {
    const sensor = new PointerSensor(callbacks, { activationDistance: 5 })
    sensor.attach(container)
    draggable.dispatchEvent(pointerEvent('pointerdown', { clientX: 0, clientY: 0 }))
    document.dispatchEvent(pointerEvent('pointermove', { clientX: 10, clientY: 0 }))
    expect(callbacks.onDragStart).toHaveBeenCalled()
    document.dispatchEvent(pointerEvent('pointermove', { clientX: 20, clientY: 30 }))
    expect(callbacks.onDragMove).toHaveBeenCalledWith(20, 30)
    sensor.detach()
  })

  it('calls onDragEnd on pointerup while dragging', () => {
    const sensor = new PointerSensor(callbacks, { activationDistance: 5 })
    sensor.attach(container)
    draggable.dispatchEvent(pointerEvent('pointerdown', { clientX: 0, clientY: 0 }))
    document.dispatchEvent(pointerEvent('pointermove', { clientX: 10, clientY: 0 }))
    document.dispatchEvent(pointerEvent('pointerup', { clientX: 10, clientY: 0 }))
    expect(callbacks.onDragEnd).toHaveBeenCalledWith(10, 0)
    sensor.detach()
  })

  it('does not call onDragEnd if never started dragging', () => {
    const sensor = new PointerSensor(callbacks, { activationDistance: 100 })
    sensor.attach(container)
    draggable.dispatchEvent(pointerEvent('pointerdown', { clientX: 0, clientY: 0 }))
    document.dispatchEvent(pointerEvent('pointerup', { clientX: 5, clientY: 5 }))
    expect(callbacks.onDragEnd).not.toHaveBeenCalled()
    sensor.detach()
  })
})
