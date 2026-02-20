import type { CollisionDetection, CollisionDescriptor } from '@dnd-kit/core'

/**
 * Custom collision detection that scores drop zones by distance to nearest edge.
 * Uses edge-distance scoring with a bottom bias for more natural drag behavior.
 *
 * Key features:
 * - Scores by distance to nearest edge (top or bottom) of droppable
 * - Applies -5px bias to elements below pointer midpoint (prefers dropping below)
 * - Returns single winner (lowest score)
 */
export const weightedVerticalCollision: CollisionDetection = ({
  droppableContainers,
  collisionRect,
}) => {
  if (!collisionRect) return []

  const pointerY = collisionRect.top + collisionRect.height / 2

  const candidates: CollisionDescriptor[] = droppableContainers
    .map((container) => {
      const rect = container.rect.current
      if (!rect) return null

      const distanceToTop = Math.abs(pointerY - rect.top)
      const distanceToBottom = Math.abs(pointerY - rect.bottom)

      // Use nearest edge distance
      const edgeDistance = Math.min(distanceToTop, distanceToBottom)

      // Apply small bias to prefer bottom drop zones
      const isBelowCenter = pointerY > rect.top + rect.height / 2
      const bias = isBelowCenter ? -5 : 0

      return {
        id: container.id,
        data: {
          droppableContainer: container,
          value: edgeDistance + bias,
        },
      } as CollisionDescriptor
    })
    .filter((c): c is CollisionDescriptor => c !== null)

  // Sort by score (lowest wins)
  candidates.sort((a, b) => {
    const aValue = (a.data as { value: number }).value
    const bValue = (b.data as { value: number }).value
    return aValue - bValue
  })

  // Return only the winner
  return candidates.slice(0, 1)
}

/**
 * Simple closest center collision (fallback)
 */
export const closestCenterCollision: CollisionDetection = ({
  droppableContainers,
  collisionRect,
}) => {
  if (!collisionRect) return []

  const centerY = collisionRect.top + collisionRect.height / 2
  const centerX = collisionRect.left + collisionRect.width / 2

  const candidates: CollisionDescriptor[] = droppableContainers
    .map((container) => {
      const rect = container.rect.current
      if (!rect) return null

      const containerCenterX = rect.left + rect.width / 2
      const containerCenterY = rect.top + rect.height / 2

      const distance = Math.sqrt(
        Math.pow(centerX - containerCenterX, 2) + Math.pow(centerY - containerCenterY, 2)
      )

      return {
        id: container.id,
        data: {
          droppableContainer: container,
          value: distance,
        },
      } as CollisionDescriptor
    })
    .filter((c): c is CollisionDescriptor => c !== null)

  candidates.sort((a, b) => {
    const aValue = (a.data as { value: number }).value
    const bValue = (b.data as { value: number }).value
    return aValue - bValue
  })

  return candidates.slice(0, 1)
}
