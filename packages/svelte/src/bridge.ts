import type {
  CoreCollisionDetection,
  CollisionCandidate,
  Rect,
  SnapshotRectsRef,
} from '@dnd-block-tree/core'

/**
 * Adapt a framework-agnostic CoreCollisionDetection into a @dnd-kit/dom CollisionDetection.
 *
 * @dnd-kit/dom collision detection receives a DragOperation and returns collisions.
 * We bridge by extracting droppable rects and the pointer rect, running the core
 * detector, and mapping results back.
 */
export function adaptCollisionDetection(
  coreDetector: CoreCollisionDetection,
): (args: { droppables: any[]; dragOperation: any }) => any[] {
  return ({ droppables, dragOperation }) => {
    const pointerPosition = dragOperation?.position?.current
    if (!pointerPosition) return []

    // Build collision candidates from droppable elements
    const candidates: CollisionCandidate[] = []
    for (const droppable of droppables) {
      const el = droppable.element
      if (!el) continue
      const domRect = el.getBoundingClientRect()
      candidates.push({
        id: String(droppable.id),
        rect: {
          top: domRect.top,
          left: domRect.left,
          width: domRect.width,
          height: domRect.height,
          right: domRect.right,
          bottom: domRect.bottom,
        },
      })
    }

    // Build pointer rect
    const pointerRect: Rect = {
      top: pointerPosition.y,
      left: pointerPosition.x,
      width: 1,
      height: 1,
      right: pointerPosition.x + 1,
      bottom: pointerPosition.y + 1,
    }

    // Call core detector
    const results = coreDetector(candidates, pointerRect)

    // Map results back to droppable references
    return results.map(result => {
      const droppable = droppables.find((d: any) => String(d.id) === result.id)
      if (!droppable) return null
      return {
        id: result.id,
        value: result.value,
        droppable,
      }
    }).filter(Boolean)
  }
}
