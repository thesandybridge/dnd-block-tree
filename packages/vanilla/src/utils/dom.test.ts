import { describe, it, expect } from 'vitest'
import { createElement, setDataAttributes, closestWithData } from './dom'

describe('createElement', () => {
  it('creates an element with the given tag', () => {
    const el = createElement('div')
    expect(el.tagName).toBe('DIV')
  })

  it('sets attributes', () => {
    const el = createElement('div', { id: 'test', role: 'button' })
    expect(el.getAttribute('id')).toBe('test')
    expect(el.getAttribute('role')).toBe('button')
  })

  it('appends string children as text nodes', () => {
    const el = createElement('span', {}, ['hello'])
    expect(el.textContent).toBe('hello')
    expect(el.childNodes[0].nodeType).toBe(Node.TEXT_NODE)
  })

  it('appends element children', () => {
    const child = document.createElement('span')
    const el = createElement('div', {}, [child])
    expect(el.children[0]).toBe(child)
  })

  it('handles mixed children', () => {
    const child = document.createElement('b')
    child.textContent = 'bold'
    const el = createElement('p', {}, ['text ', child, ' end'])
    expect(el.childNodes).toHaveLength(3)
    expect(el.textContent).toBe('text bold end')
  })

  it('works with no attrs or children', () => {
    const el = createElement('section')
    expect(el.tagName).toBe('SECTION')
    expect(el.childNodes).toHaveLength(0)
    expect(el.attributes).toHaveLength(0)
  })
})

describe('setDataAttributes', () => {
  it('sets data attributes from an object', () => {
    const el = document.createElement('div')
    setDataAttributes(el, { name: 'test', count: 5 })
    expect(el.getAttribute('data-name')).toBe('test')
    expect(el.getAttribute('data-count')).toBe('5')
  })

  it('removes attribute when value is false', () => {
    const el = document.createElement('div')
    el.setAttribute('data-active', 'true')
    setDataAttributes(el, { active: false })
    expect(el.hasAttribute('data-active')).toBe(false)
  })

  it('sets boolean true as string', () => {
    const el = document.createElement('div')
    setDataAttributes(el, { visible: true })
    expect(el.getAttribute('data-visible')).toBe('true')
  })
})

describe('closestWithData', () => {
  it('finds ancestor with data attribute', () => {
    const parent = document.createElement('div')
    parent.setAttribute('data-draggable-id', 'block-1')
    const child = document.createElement('span')
    parent.appendChild(child)
    document.body.appendChild(parent)

    const found = closestWithData(child, 'draggable-id')
    expect(found).toBe(parent)

    document.body.removeChild(parent)
  })

  it('returns null when no ancestor matches', () => {
    const el = document.createElement('div')
    document.body.appendChild(el)
    expect(closestWithData(el, 'nonexistent')).toBeNull()
    document.body.removeChild(el)
  })

  it('matches the element itself', () => {
    const el = document.createElement('div')
    el.setAttribute('data-zone-id', 'z1')
    document.body.appendChild(el)

    expect(closestWithData(el, 'zone-id')).toBe(el)

    document.body.removeChild(el)
  })
})
