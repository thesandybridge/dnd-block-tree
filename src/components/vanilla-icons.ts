const SVG_NS = 'http://www.w3.org/2000/svg'

function createSvg(className: string, size: number): SVGSVGElement {
  const el = document.createElementNS(SVG_NS, 'svg')
  el.setAttribute('width', String(size))
  el.setAttribute('height', String(size))
  el.setAttribute('viewBox', '0 0 24 24')
  el.setAttribute('fill', 'none')
  el.setAttribute('stroke', 'currentColor')
  el.setAttribute('stroke-width', '2')
  el.setAttribute('stroke-linecap', 'round')
  el.setAttribute('stroke-linejoin', 'round')
  if (className) el.setAttribute('class', className)
  return el
}

function addPath(svg: SVGSVGElement, d: string, strokeWidth?: number): void {
  const path = document.createElementNS(SVG_NS, 'path')
  path.setAttribute('d', d)
  if (strokeWidth) path.setAttribute('stroke-width', String(strokeWidth))
  svg.appendChild(path)
}

function addCircle(svg: SVGSVGElement, cx: number, cy: number, r: number): void {
  const circle = document.createElementNS(SVG_NS, 'circle')
  circle.setAttribute('cx', String(cx))
  circle.setAttribute('cy', String(cy))
  circle.setAttribute('r', String(r))
  svg.appendChild(circle)
}

/** 6-dot grip handle (lucide GripVertical) */
export function createGripIcon(className = ''): SVGSVGElement {
  const el = createSvg(className, 16)
  addCircle(el, 9, 12, 1)
  addCircle(el, 9, 5, 1)
  addCircle(el, 9, 19, 1)
  addCircle(el, 15, 12, 1)
  addCircle(el, 15, 5, 1)
  addCircle(el, 15, 19, 1)
  return el
}

/** Right or down chevron (lucide ChevronRight) */
export function createChevronIcon(expanded: boolean, className = ''): SVGSVGElement {
  const el = createSvg(className, 16)
  addPath(el, 'M9 18l6-6-6-6')
  if (expanded) {
    el.style.transform = 'rotate(90deg)'
    el.style.transition = 'transform 200ms'
  }
  return el
}

/** Checkmark (lucide Check) */
export function createCheckIcon(className = ''): SVGSVGElement {
  const el = createSvg(className, 16)
  el.setAttribute('stroke-width', '3')
  addPath(el, 'M20 6L9 17l-5-5')
  return el
}

/** Folder icon — open or closed (lucide Folder / FolderOpen) */
export function createFolderIcon(open: boolean, className = ''): SVGSVGElement {
  const el = createSvg(className, 16)
  if (open) {
    addPath(el, 'm6 14 1.5-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.54 6a2 2 0 0 1-1.95 1.5H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H18a2 2 0 0 1 2 2v2')
  } else {
    addPath(el, 'M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z')
  }
  return el
}

/** Generic file icon (lucide File) */
export function createFileIcon(className = ''): SVGSVGElement {
  const el = createSvg(className, 16)
  addPath(el, 'M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z')
  addPath(el, 'M14 2v4a2 2 0 0 0 2 2h4')
  return el
}

/** Sticky note icon (lucide StickyNote) */
export function createStickyNoteIcon(className = ''): SVGSVGElement {
  const el = createSvg(className, 16)
  addPath(el, 'M16 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8Z')
  addPath(el, 'M15 3v4a2 2 0 0 0 2 2h4')
  return el
}

/** File code icon (lucide FileCode) */
export function createFileCodeIcon(className = ''): SVGSVGElement {
  const el = createSvg(className, 16)
  addPath(el, 'M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z')
  addPath(el, 'M14 2v4a2 2 0 0 0 2 2h4')
  addPath(el, 'm10 13-2 2 2 2')
  addPath(el, 'm14 17 2-2-2-2')
  return el
}
