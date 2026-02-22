import type { BaseBlock } from '@dnd-block-tree/core'
import type { BlockTreeController } from '../controller'
import type { DefaultRendererOptions, Unsubscribe, RenderBlockContext } from '../types'
import { renderTree } from './tree-renderer'

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
  const { container, renderBlock, dropZoneHeight, animateExpand } = options
  const containerTypes = (controller.getTree() as any).containerTypes ?? []

  function render(blocks: T[], expandedMap: Record<string, boolean>): void {
    // Clear existing DOM
    container.innerHTML = ''

    // Build fresh tree DOM
    const tree = renderTree(blocks, expandedMap, controller, {
      renderBlock,
      containerTypes,
      dropZoneHeight,
    })

    container.appendChild(tree)
  }

  // Subscribe to render events
  const unsubRender = controller.on('render', render)

  // Initial render
  render(controller.getBlocks(), controller.getExpandedMap())

  const renderer: DefaultRenderer = () => {
    unsubRender()
  }
  renderer.refresh = () => {
    render(controller.getBlocks(), controller.getExpandedMap())
  }

  return renderer
}
