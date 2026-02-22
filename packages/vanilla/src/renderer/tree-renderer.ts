import type { BaseBlock } from '@dnd-block-tree/core'
import { getBlockDepth } from '@dnd-block-tree/core'
import type { BlockTreeController } from '../controller'
import type { RenderBlockContext } from '../types'
import { createElement, setDataAttributes } from '../utils/dom'
import { createDropZoneElement, setDropZoneActive } from './drop-zone'

export interface TreeRendererOptions<T extends BaseBlock> {
  renderBlock: (block: T, ctx: RenderBlockContext) => HTMLElement
  containerTypes: readonly string[]
  dropZoneHeight?: number
}

/**
 * Recursive DOM tree builder. Creates the full tree DOM from blocks.
 * Keyed by data-block-id for efficient reconciliation.
 */
export function renderTree<T extends BaseBlock>(
  blocks: T[],
  expandedMap: Record<string, boolean>,
  controller: BlockTreeController<T>,
  options: TreeRendererOptions<T>,
  parentId: string | null = null,
  depth = 0
): HTMLElement {
  const { renderBlock, containerTypes, dropZoneHeight } = options

  const container = createElement('div', {
    role: parentId === null ? 'tree' : 'group',
  })
  if (parentId === null) {
    container.setAttribute('data-dnd-tree-root', 'true')
  }

  const children = blocks.filter(b => b.parentId === parentId)
  const activeId = controller.getDragState().activeId
  const selectedIds = controller.getSelectedIds()
  const index = controller.getTree().getBlockIndex()

  // Start zone for container
  if (parentId !== null) {
    const startZone = createDropZoneElement({ id: `into-${parentId}`, height: dropZoneHeight })
    controller.registerDropZone(`into-${parentId}`, startZone)
    container.appendChild(startZone)
  } else {
    const rootStart = createDropZoneElement({ id: 'root-start', height: dropZoneHeight })
    controller.registerDropZone('root-start', rootStart)
    container.appendChild(rootStart)
  }

  for (const block of children) {
    // Skip actively dragged block (rendered in overlay)
    if (block.id === activeId) continue

    // Before zone
    const beforeZone = createDropZoneElement({ id: `before-${block.id}`, height: dropZoneHeight })
    controller.registerDropZone(`before-${block.id}`, beforeZone)
    container.appendChild(beforeZone)

    const isContainer = containerTypes.includes(block.type)
    const isExpanded = expandedMap[block.id] !== false
    const blockDepth = getBlockDepth(index, block.id)

    // Build children for containers
    let childrenEl: HTMLElement | null = null
    if (isContainer && isExpanded) {
      childrenEl = renderTree(blocks, expandedMap, controller, options, block.id, depth + 1)
    }

    const ctx: RenderBlockContext = {
      children: childrenEl,
      depth: blockDepth,
      isExpanded,
      isDragging: block.id === activeId,
      isSelected: selectedIds.has(block.id),
      onToggleExpand: isContainer ? () => controller.toggleExpand(block.id) : null,
    }

    const blockEl = renderBlock(block, ctx)
    setDataAttributes(blockEl, {
      'block-id': block.id,
      'block-type': block.type,
      depth: String(blockDepth),
      dragging: block.id === activeId,
      selected: selectedIds.has(block.id),
    })

    // Register as draggable
    controller.registerDraggable(block.id, blockEl)

    // ARIA attributes
    blockEl.setAttribute('role', 'treeitem')
    blockEl.setAttribute('aria-level', String(blockDepth + 1))
    if (isContainer) {
      blockEl.setAttribute('aria-expanded', String(isExpanded))
    }
    blockEl.setAttribute('tabindex', '-1')

    container.appendChild(blockEl)
  }

  // End zone
  if (parentId !== null) {
    const endZone = createDropZoneElement({ id: `end-${parentId}`, height: dropZoneHeight })
    controller.registerDropZone(`end-${parentId}`, endZone)
    container.appendChild(endZone)
  } else {
    const rootEnd = createDropZoneElement({ id: 'root-end', height: dropZoneHeight })
    controller.registerDropZone('root-end', rootEnd)
    container.appendChild(rootEnd)
  }

  return container
}
