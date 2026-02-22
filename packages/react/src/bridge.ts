import type { CollisionDetection, CollisionDescriptor } from '@dnd-kit/core'
import type {
  CoreCollisionDetection,
  CollisionCandidate,
  Rect,
  SnapshotRectsRef,
} from '@dnd-block-tree/core'

/**
 * Adapt a framework-agnostic CoreCollisionDetection into a dnd-kit CollisionDetection.
 *
 * Converts:
 *   droppableContainers → CollisionCandidate[]
 *   Calls coreDetector
 *   CollisionResult[] → CollisionDescriptor[]
 */
export function adaptCollisionDetection(
  coreDetector: CoreCollisionDetection,
): CollisionDetection {
  return ({ droppableContainers, collisionRect }) => {
    if (!collisionRect) return []

    // Convert dnd-kit droppable containers to core CollisionCandidates
    const candidates: CollisionCandidate[] = []
    for (const container of droppableContainers) {
      const rect = container.rect.current
      if (!rect) continue
      candidates.push({
        id: String(container.id),
        rect: {
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height,
          right: rect.right,
          bottom: rect.bottom,
        },
      })
    }

    // Convert dnd-kit collision rect to core Rect
    const pointerRect: Rect = {
      top: collisionRect.top,
      left: collisionRect.left,
      width: collisionRect.width,
      height: collisionRect.height,
      right: collisionRect.left + collisionRect.width,
      bottom: collisionRect.top + collisionRect.height,
    }

    // Call core detector
    const results = coreDetector(candidates, pointerRect)

    // Convert results back to dnd-kit CollisionDescriptors
    return results.map(result => {
      const container = droppableContainers.find(c => String(c.id) === result.id)
      if (!container) return null
      return {
        id: result.id,
        data: {
          droppableContainer: container,
          value: result.value,
          left: result.left,
        },
      } as CollisionDescriptor
    }).filter((c): c is CollisionDescriptor => c !== null)
  }
}
