import { createElement, setDataAttributes } from '../utils/dom'

export interface DropZoneOptions {
  id: string
  height?: number
}

export function createDropZoneElement(options: DropZoneOptions): HTMLElement {
  const { id, height = 4 } = options
  const el = createElement('div')
  setDataAttributes(el, {
    'zone-id': id,
  })
  el.style.height = `${height}px`
  el.style.minHeight = `${height}px`
  el.style.transition = 'background-color 150ms ease'
  return el
}

export function setDropZoneActive(el: HTMLElement, active: boolean): void {
  setDataAttributes(el, { 'zone-active': active })
}
