import type { BaseBlock } from '@dnd-block-tree/core'
import type { BlockTreeController } from '../controller'
import type { DefaultRendererOptions, Unsubscribe, DragState } from '../types'
import { renderTree } from './tree-renderer'
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

  function render(blocks: T[], expandedMap: Record<string, boolean>): void {
    // Clear existing DOM — safe because we only append our own rendered tree elements
    while (container.firstChild) container.removeChild(container.firstChild)

    // Build fresh tree DOM
    const tree = renderTree(blocks, expandedMap, controller, {
      renderBlock,
      containerTypes,
      dropZoneHeight,
      dropZoneClassName,
      rootClassName: options.rootClassName,
      indentClassName: options.indentClassName,
    })

    container.appendChild(tree)
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
  }
  renderer.refresh = () => {
    render(controller.getBlocks(), controller.getExpandedMap())
  }

  return renderer
}
