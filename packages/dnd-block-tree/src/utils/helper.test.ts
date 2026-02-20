import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { extractUUID, debounce, generateId } from './helper'

describe('extractUUID', () => {
  it('extracts UUID from before- prefix', () => {
    expect(extractUUID('before-123')).toBe('123')
  })

  it('extracts UUID from after- prefix', () => {
    expect(extractUUID('after-456')).toBe('456')
  })

  it('extracts UUID from into- prefix', () => {
    expect(extractUUID('into-789')).toBe('789')
  })

  it('returns original string if no matching prefix', () => {
    expect(extractUUID('no-prefix-123')).toBe('no-prefix-123')
    expect(extractUUID('123')).toBe('123')
  })

  it('handles complex UUIDs', () => {
    const uuid = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
    expect(extractUUID(`after-${uuid}`)).toBe(uuid)
  })

  it('uses custom pattern when provided', () => {
    expect(extractUUID('custom-123', '^custom-')).toBe('123')
  })
})

describe('debounce', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('delays function execution', () => {
    const fn = vi.fn()
    const debounced = debounce(fn, 100)

    debounced()
    expect(fn).not.toHaveBeenCalled()

    vi.advanceTimersByTime(100)
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('only executes once for multiple rapid calls', () => {
    const fn = vi.fn()
    const debounced = debounce(fn, 100)

    debounced()
    debounced()
    debounced()

    vi.advanceTimersByTime(100)
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('passes arguments to the debounced function', () => {
    const fn = vi.fn()
    const debounced = debounce(fn, 100)

    debounced('arg1', 'arg2')
    vi.advanceTimersByTime(100)

    expect(fn).toHaveBeenCalledWith('arg1', 'arg2')
  })

  it('uses the last call arguments', () => {
    const fn = vi.fn()
    const debounced = debounce(fn, 100)

    debounced('first')
    debounced('second')
    debounced('third')

    vi.advanceTimersByTime(100)
    expect(fn).toHaveBeenCalledWith('third')
  })

  it('cancel method prevents execution', () => {
    const fn = vi.fn()
    const debounced = debounce(fn, 100)

    debounced()
    debounced.cancel()

    vi.advanceTimersByTime(100)
    expect(fn).not.toHaveBeenCalled()
  })

  it('cancel is safe to call multiple times', () => {
    const fn = vi.fn()
    const debounced = debounce(fn, 100)

    debounced()
    debounced.cancel()
    debounced.cancel()

    expect(() => debounced.cancel()).not.toThrow()
  })

  it('can be called again after cancel', () => {
    const fn = vi.fn()
    const debounced = debounce(fn, 100)

    debounced()
    debounced.cancel()

    debounced()
    vi.advanceTimersByTime(100)

    expect(fn).toHaveBeenCalledTimes(1)
  })
})

describe('generateId', () => {
  it('generates a string', () => {
    const id = generateId()
    expect(typeof id).toBe('string')
  })

  it('generates unique IDs', () => {
    const ids = new Set<string>()
    for (let i = 0; i < 100; i++) {
      ids.add(generateId())
    }
    expect(ids.size).toBe(100)
  })

  it('includes timestamp component', () => {
    const before = Date.now()
    const id = generateId()
    const after = Date.now()

    const timestamp = parseInt(id.split('-')[0], 10)
    expect(timestamp).toBeGreaterThanOrEqual(before)
    expect(timestamp).toBeLessThanOrEqual(after)
  })
})
