import { describe, it, expect } from 'vitest'
import { getDropZoneType, extractBlockId } from './types'

describe('getDropZoneType', () => {
  it('returns "before" for before- prefixed zones', () => {
    expect(getDropZoneType('before-123')).toBe('before')
    expect(getDropZoneType('before-abc-def')).toBe('before')
  })

  it('returns "into" for into- prefixed zones', () => {
    expect(getDropZoneType('into-123')).toBe('into')
    expect(getDropZoneType('into-abc-def')).toBe('into')
  })

  it('returns "after" for after- prefixed zones', () => {
    expect(getDropZoneType('after-123')).toBe('after')
    expect(getDropZoneType('after-abc-def')).toBe('after')
  })

  it('returns "after" as default for unknown prefixes', () => {
    expect(getDropZoneType('unknown-123')).toBe('after')
    expect(getDropZoneType('123')).toBe('after')
    expect(getDropZoneType('')).toBe('after')
  })
})

describe('extractBlockId', () => {
  it('extracts ID from before- prefix', () => {
    expect(extractBlockId('before-123')).toBe('123')
    expect(extractBlockId('before-abc-def-ghi')).toBe('abc-def-ghi')
  })

  it('extracts ID from after- prefix', () => {
    expect(extractBlockId('after-123')).toBe('123')
    expect(extractBlockId('after-abc-def-ghi')).toBe('abc-def-ghi')
  })

  it('extracts ID from into- prefix', () => {
    expect(extractBlockId('into-123')).toBe('123')
    expect(extractBlockId('into-abc-def-ghi')).toBe('abc-def-ghi')
  })

  it('returns original string for unknown prefixes', () => {
    expect(extractBlockId('unknown-123')).toBe('unknown-123')
    expect(extractBlockId('123')).toBe('123')
  })

  it('handles complex UUIDs', () => {
    const uuid = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
    expect(extractBlockId(`before-${uuid}`)).toBe(uuid)
    expect(extractBlockId(`after-${uuid}`)).toBe(uuid)
    expect(extractBlockId(`into-${uuid}`)).toBe(uuid)
  })
})
