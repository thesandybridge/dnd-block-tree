/** Create an element with attributes and optional children */
export function createElement<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs?: Record<string, string>,
  children?: (HTMLElement | string)[]
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag)
  if (attrs) {
    for (const [key, value] of Object.entries(attrs)) {
      el.setAttribute(key, value)
    }
  }
  if (children) {
    for (const child of children) {
      if (typeof child === 'string') {
        el.appendChild(document.createTextNode(child))
      } else {
        el.appendChild(child)
      }
    }
  }
  return el
}

/** Set data attributes from an object */
export function setDataAttributes(el: HTMLElement, data: Record<string, string | boolean | number>): void {
  for (const [key, value] of Object.entries(data)) {
    if (value === false) {
      el.removeAttribute(`data-${key}`)
    } else {
      el.setAttribute(`data-${key}`, String(value))
    }
  }
}

/** Find the closest ancestor with a given data attribute */
export function closestWithData(el: Element, dataAttr: string): HTMLElement | null {
  return el.closest(`[data-${dataAttr}]`) as HTMLElement | null
}
