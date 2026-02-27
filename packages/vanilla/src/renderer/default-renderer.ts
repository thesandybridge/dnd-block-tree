import type { BaseBlock } from '@dnd-block-tree/core'
import type { BlockTreeController } from '../controller'
import type { DefaultRendererOptions, Unsubscribe, DragState } from '../types'
import { renderTree, createBlockCache } from './tree-renderer'
import { setDropZoneActive } from './drop-zone'

export interface DefaultRenderer extends Unsubscribe {
  /** Force a re-render */
  refresh(): void
}

/**
 * DefaultRenderer (Layer 2): Subscribes to controller events and
 * automatically creates/updates DOM. User provides a renderBlock function.
 */
export function createDefaultRenderer<T extends BaseBlock>(
  controller: BlockTreeController<T>,
  options: DefaultRendererOptions<T>
): DefaultRenderer {
  const { container, containerTypes: explicitContainerTypes, renderBlock, dropZoneHeight, dropZoneClassName, dropZoneActiveClassName } = options
  const containerTypes = explicitContainerTypes ?? (controller.getTree() as any).containerTypes ?? []
  const activeClasses = dropZoneActiveClassName?.split(/\s+/).filter(Boolean) ?? []

  // Element cache: reuses leaf block DOM nodes across renders to prevent flicker
  const blockCache = createBlockCache()

  function render(blocks: T[], expandedMap: Record<string, boolean>): void {
    // Clear existing DOM — safe because we only append our own rendered tree elements.
    // Cached elements are detached here and re-attached by renderTree.
    while (container.firstChild) container.removeChild(container.firstChild)

    // Reset the rendered set for this cycle
    blockCache.rendered.clear()

    // Build tree DOM, reusing cached leaf elements
    const tree = renderTree(blocks, expandedMap, controller, {
      renderBlock,
      containerTypes,
      dropZoneHeight,
      dropZoneClassName,
      rootClassName: options.rootClassName,
      indentClassName: options.indentClassName,
      blockCache,
    })

    container.appendChild(tree)

    // Clean up cache entries for blocks that no longer exist
    for (const id of blockCache.elements.keys()) {
      if (!blockCache.rendered.has(id)) {
        blockCache.elements.delete(id)
      }
    }
  }

  // Track active drop zone for highlighting
  let activeZoneEl: HTMLElement | null = null

  function onDragStateChange(state: DragState): void {
    // Remove previous highlight
    if (activeZoneEl) {
      setDropZoneActive(activeZoneEl, false)
      if (activeClasses.length) {
        activeZoneEl.classList.remove(...activeClasses)
      }
      activeZoneEl = null
    }

    // Apply new highlight
    if (state.isDragging && state.hoverZone) {
      const zoneEl = container.querySelector(`[data-zone-id="${state.hoverZone}"]`) as HTMLElement | null
      if (zoneEl) {
        setDropZoneActive(zoneEl, true)
        if (activeClasses.length) {
          zoneEl.classList.add(...activeClasses)
        }
        activeZoneEl = zoneEl
      }
    }
  }

  // Subscribe to render and drag state events
  const unsubRender = controller.on('render', render)
  const unsubDrag = controller.on('drag:statechange', onDragStateChange)

  // Initial render
  render(controller.getBlocks(), controller.getExpandedMap())

  const renderer: DefaultRenderer = () => {
    unsubRender()
    unsubDrag()
    blockCache.elements.clear()
  }
  renderer.refresh = () => {
    render(controller.getBlocks(), controller.getExpandedMap())
  }

  return renderer
}
