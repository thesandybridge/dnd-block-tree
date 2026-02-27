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
  dropZoneClassName?: string
  rootClassName?: string
  indentClassName?: string
  /** Internal: element cache for DOM reuse across renders */
  blockCache?: BlockCache
}

/** Cached block element with a fingerprint for change detection */
export interface BlockCache {
  elements: Map<string, { fingerprint: string; el: HTMLElement }>
  /** Track which block IDs were used this render cycle for cleanup */
  rendered: Set<string>
}

export function createBlockCache(): BlockCache {
  return { elements: new Map(), rendered: new Set() }
}

function blockFingerprint(block: BaseBlock, isDragging: boolean, isSelected: boolean): string {
  // Fast fingerprint: serialize only the fields that affect rendering
  return JSON.stringify(block) + (isDragging ? '|d' : '') + (isSelected ? '|s' : '')
}

/**
 * Recursive DOM tree builder. Creates the full tree DOM from blocks.
 * Reuses cached elements for leaf blocks that haven't changed.
 */
export function renderTree<T extends BaseBlock>(
  blocks: T[],
  expandedMap: Record<string, boolean>,
  controller: BlockTreeController<T>,
  options: TreeRendererOptions<T>,
  parentId: string | null = null,
  depth = 0
): HTMLElement {
  const { renderBlock, containerTypes, dropZoneHeight, dropZoneClassName, rootClassName, indentClassName, blockCache } = options

  const container = createElement('div', {
    role: parentId === null ? 'tree' : 'group',
  })
  if (parentId === null) {
    container.setAttribute('data-dnd-tree-root', 'true')
    if (rootClassName) container.className = rootClassName
  } else {
    if (indentClassName) container.className = indentClassName
  }

  const children = blocks.filter(b => b.parentId === parentId)
  const activeId = controller.getDragState().activeId
  const selectedIds = controller.getSelectedIds()
  const index = controller.getTree().getBlockIndex()

  // Start zone for container
  if (parentId !== null) {
    const startZone = createDropZoneElement({ id: `into-${parentId}`, height: dropZoneHeight, className: dropZoneClassName })
    controller.registerDropZone(`into-${parentId}`, startZone)
    container.appendChild(startZone)
  } else {
    const rootStart = createDropZoneElement({ id: 'root-start', height: dropZoneHeight, className: dropZoneClassName })
    controller.registerDropZone('root-start', rootStart)
    container.appendChild(rootStart)
  }

  for (const block of children) {
    // Skip actively dragged block (rendered in overlay)
    if (block.id === activeId) continue

    // Before zone
    const beforeZone = createDropZoneElement({ id: `before-${block.id}`, height: dropZoneHeight, className: dropZoneClassName })
    controller.registerDropZone(`before-${block.id}`, beforeZone)
    container.appendChild(beforeZone)

    const isContainer = containerTypes.includes(block.type)
    const isExpanded = expandedMap[block.id] !== false
    const blockDepth = getBlockDepth(index, block.id)
    const isDragging = block.id === activeId
    const isSelected = selectedIds.has(block.id)

    let blockEl: HTMLElement

    // For leaf blocks, reuse cached DOM elements when data hasn't changed.
    // This prevents CSS transition resets and visual flicker.
    if (!isContainer && blockCache) {
      const fp = blockFingerprint(block, isDragging, isSelected)
      const cached = blockCache.elements.get(block.id)

      if (cached && cached.fingerprint === fp) {
        // Reuse existing DOM node — no flicker
        blockEl = cached.el
      } else {
        // Data changed or new block — render fresh
        const ctx: RenderBlockContext = {
          children: null,
          depth: blockDepth,
          isExpanded: false,
          isDragging,
          isSelected,
          onToggleExpand: null,
        }
        blockEl = renderBlock(block, ctx)
        blockCache.elements.set(block.id, { fingerprint: fp, el: blockEl })
      }
      blockCache.rendered.add(block.id)
    } else {
      // Container blocks: always re-render (children subtree may have changed)
      let childrenEl: HTMLElement | null = null
      if (isContainer && isExpanded) {
        childrenEl = renderTree(blocks, expandedMap, controller, options, block.id, depth + 1)
      }

      const ctx: RenderBlockContext = {
        children: childrenEl,
        depth: blockDepth,
        isExpanded,
        isDragging,
        isSelected,
        onToggleExpand: isContainer ? () => controller.toggleExpand(block.id) : null,
      }
      blockEl = renderBlock(block, ctx)
    }

    // Always update data attributes (selection can change without block data changing)
    setDataAttributes(blockEl, {
      'block-id': block.id,
      'block-type': block.type,
      depth: String(blockDepth),
      dragging: isDragging,
      selected: isSelected,
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
    const endZone = createDropZoneElement({ id: `end-${parentId}`, height: dropZoneHeight, className: dropZoneClassName })
    controller.registerDropZone(`end-${parentId}`, endZone)
    container.appendChild(endZone)
  } else {
    const rootEnd = createDropZoneElement({ id: 'root-end', height: dropZoneHeight, className: dropZoneClassName })
    controller.registerDropZone('root-end', rootEnd)
    container.appendChild(rootEnd)
  }

  return container
}
