import { createElement, setDataAttributes } from '../utils/dom'

export interface DropZoneOptions {
  id: string
  height?: number
  className?: string
}

export function createDropZoneElement(options: DropZoneOptions): HTMLElement {
  const { id, height = 4, className } = options
  const el = createElement('div')
  setDataAttributes(el, {
    'zone-id': id,
  })
  if (className) {
    el.className = className
  } else {
    el.style.height = `${height}px`
    el.style.minHeight = `${height}px`
    el.style.transition = 'background-color 150ms ease'
  }
  return el
}

export function setDropZoneActive(el: HTMLElement, active: boolean): void {
  setDataAttributes(el, { 'zone-active': active })
}
