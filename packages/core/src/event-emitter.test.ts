import { describe, it, expect, vi } from 'vitest'
import { EventEmitter } from './event-emitter'

interface TestEvents {
  foo: (x: number) => void
  bar: (a: string, b: boolean) => void
  baz: () => void
}

describe('EventEmitter', () => {
  it('calls handler when event is emitted', () => {
    const emitter = new EventEmitter<TestEvents>()
    const handler = vi.fn()

    emitter.on('foo', handler)
    emitter.emit('foo', 42)

    expect(handler).toHaveBeenCalledWith(42)
    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('supports multiple handlers for the same event', () => {
    const emitter = new EventEmitter<TestEvents>()
    const handler1 = vi.fn()
    const handler2 = vi.fn()

    emitter.on('foo', handler1)
    emitter.on('foo', handler2)
    emitter.emit('foo', 10)

    expect(handler1).toHaveBeenCalledWith(10)
    expect(handler2).toHaveBeenCalledWith(10)
  })

  it('passes multiple arguments to handler', () => {
    const emitter = new EventEmitter<TestEvents>()
    const handler = vi.fn()

    emitter.on('bar', handler)
    emitter.emit('bar', 'hello', true)

    expect(handler).toHaveBeenCalledWith('hello', true)
  })

  it('does not call handler for different events', () => {
    const emitter = new EventEmitter<TestEvents>()
    const fooHandler = vi.fn()
    const barHandler = vi.fn()

    emitter.on('foo', fooHandler)
    emitter.on('bar', barHandler)
    emitter.emit('foo', 5)

    expect(fooHandler).toHaveBeenCalledTimes(1)
    expect(barHandler).not.toHaveBeenCalled()
  })

  it('does nothing when emitting event with no handlers', () => {
    const emitter = new EventEmitter<TestEvents>()

    // Should not throw
    expect(() => emitter.emit('foo', 1)).not.toThrow()
  })

  describe('off', () => {
    it('removes a specific handler', () => {
      const emitter = new EventEmitter<TestEvents>()
      const handler = vi.fn()

      emitter.on('foo', handler)
      emitter.off('foo', handler)
      emitter.emit('foo', 1)

      expect(handler).not.toHaveBeenCalled()
    })

    it('only removes the specified handler, leaving others', () => {
      const emitter = new EventEmitter<TestEvents>()
      const handler1 = vi.fn()
      const handler2 = vi.fn()

      emitter.on('foo', handler1)
      emitter.on('foo', handler2)
      emitter.off('foo', handler1)
      emitter.emit('foo', 1)

      expect(handler1).not.toHaveBeenCalled()
      expect(handler2).toHaveBeenCalledWith(1)
    })

    it('is safe to call off for non-existent handler', () => {
      const emitter = new EventEmitter<TestEvents>()
      const handler = vi.fn()

      // off before on - should not throw
      expect(() => emitter.off('foo', handler)).not.toThrow()
    })
  })

  describe('on() return value (unsubscribe)', () => {
    it('returns an unsubscribe function', () => {
      const emitter = new EventEmitter<TestEvents>()
      const handler = vi.fn()

      const unsubscribe = emitter.on('foo', handler)

      expect(typeof unsubscribe).toBe('function')
    })

    it('unsubscribe removes the handler', () => {
      const emitter = new EventEmitter<TestEvents>()
      const handler = vi.fn()

      const unsubscribe = emitter.on('foo', handler)
      unsubscribe()
      emitter.emit('foo', 1)

      expect(handler).not.toHaveBeenCalled()
    })

    it('unsubscribe is idempotent (safe to call multiple times)', () => {
      const emitter = new EventEmitter<TestEvents>()
      const handler = vi.fn()

      const unsubscribe = emitter.on('foo', handler)
      unsubscribe()
      unsubscribe() // second call should not throw

      emitter.emit('foo', 1)
      expect(handler).not.toHaveBeenCalled()
    })
  })

  describe('removeAllListeners', () => {
    it('removes all handlers for a specific event', () => {
      const emitter = new EventEmitter<TestEvents>()
      const handler1 = vi.fn()
      const handler2 = vi.fn()

      emitter.on('foo', handler1)
      emitter.on('foo', handler2)
      emitter.removeAllListeners('foo')
      emitter.emit('foo', 1)

      expect(handler1).not.toHaveBeenCalled()
      expect(handler2).not.toHaveBeenCalled()
    })

    it('does not affect handlers for other events', () => {
      const emitter = new EventEmitter<TestEvents>()
      const fooHandler = vi.fn()
      const barHandler = vi.fn()

      emitter.on('foo', fooHandler)
      emitter.on('bar', barHandler)
      emitter.removeAllListeners('foo')

      emitter.emit('foo', 1)
      emitter.emit('bar', 'test', false)

      expect(fooHandler).not.toHaveBeenCalled()
      expect(barHandler).toHaveBeenCalledWith('test', false)
    })

    it('removes all handlers for all events when called without argument', () => {
      const emitter = new EventEmitter<TestEvents>()
      const fooHandler = vi.fn()
      const barHandler = vi.fn()
      const bazHandler = vi.fn()

      emitter.on('foo', fooHandler)
      emitter.on('bar', barHandler)
      emitter.on('baz', bazHandler)
      emitter.removeAllListeners()

      emitter.emit('foo', 1)
      emitter.emit('bar', 'test', false)
      emitter.emit('baz')

      expect(fooHandler).not.toHaveBeenCalled()
      expect(barHandler).not.toHaveBeenCalled()
      expect(bazHandler).not.toHaveBeenCalled()
    })

    it('is safe to call when no handlers exist', () => {
      const emitter = new EventEmitter<TestEvents>()

      expect(() => emitter.removeAllListeners('foo')).not.toThrow()
      expect(() => emitter.removeAllListeners()).not.toThrow()
    })
  })
})
