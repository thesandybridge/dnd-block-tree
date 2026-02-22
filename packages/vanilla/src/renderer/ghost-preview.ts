import { setDataAttributes } from '../utils/dom'

/** Create a semi-transparent in-flow preview of a block at its target position */
export function createGhostPreview(sourceEl: HTMLElement): HTMLElement {
  const ghost = sourceEl.cloneNode(true) as HTMLElement
  setDataAttributes(ghost, { 'dnd-ghost': 'true' })
  ghost.style.opacity = '0.3'
  ghost.style.pointerEvents = 'none'
  ghost.removeAttribute('data-draggable-id')
  ghost.removeAttribute('data-block-id')
  return ghost
}
