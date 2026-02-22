import type { CollisionDetection, CollisionDescriptor, UniqueIdentifier } from '@dnd-kit/core'

export type SnapshotRectsRef = { current: Map<UniqueIdentifier, DOMRect> | null }

/**
 * Compute collision scores for drop zones
 * Considers both vertical distance and horizontal containment
 *
 * When snapshotRects is provided, uses snapshotted rects instead of live DOM
 * rects. This prevents feedback loops caused by in-flow ghost previews
 * shifting zone positions during drag.
 */
function computeCollisionScores(
  droppableContainers: Parameters<CollisionDetection>[0]['droppableContainers'],
  collisionRect: NonNullable<Parameters<CollisionDetection>[0]['collisionRect']>,
  snapshotRects?: Map<UniqueIdentifier, DOMRect> | null
): CollisionDescriptor[] {
  const pointerX = collisionRect.left + collisionRect.width / 2
  const pointerY = collisionRect.top + collisionRect.height / 2

  const candidates: CollisionDescriptor[] = droppableContainers
    .map((container) => {
      const rect = snapshotRects?.get(container.id) ?? container.rect.current
      if (!rect) return null

      const distanceToTop = Math.abs(pointerY - rect.top)
      const distanceToBottom = Math.abs(pointerY - rect.bottom)

      // Use nearest edge distance
      const edgeDistance = Math.min(distanceToTop, distanceToBottom)

      // Apply small bias to prefer bottom drop zones
      const isBelowCenter = pointerY > rect.top + rect.height / 2
      const bias = isBelowCenter ? -5 : 0

      // Horizontal scoring: prefer zones whose indentation matches the pointer.
      // The factor (0.3) is tuned so a typical indentation gap (~48px) produces
      // a score difference (~14) that can overcome a reduced sticky threshold
      // for cross-depth transitions.
      const isWithinX = pointerX >= rect.left && pointerX <= rect.right

      let horizontalScore = 0
      if (isWithinX) {
        horizontalScore = Math.abs(pointerX - rect.left) * 0.3
      } else {
        const distanceToZone = pointerX < rect.left
          ? rect.left - pointerX
          : pointerX - rect.right
        horizontalScore = distanceToZone * 2
      }

      return {
        id: container.id,
        data: {
          droppableContainer: container,
          value: edgeDistance + bias + horizontalScore,
          left: rect.left,
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

  return candidates
}

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

  const candidates = computeCollisionScores(droppableContainers, collisionRect)
  return candidates.slice(0, 1)
}

/**
 * Create a collision detection with hysteresis to prevent flickering
 * between adjacent drop zones.
 *
 * @param threshold - Minimum score improvement required to switch zones (default: 15px)
 * @param snapshotRef - Optional ref to snapshotted zone rects. When populated,
 *   collision detection uses these frozen rects instead of live DOM measurements,
 *   preventing layout-shift feedback loops from in-flow ghost previews.
 */
export function createStickyCollision(
  threshold = 15,
  snapshotRef?: SnapshotRectsRef
): CollisionDetection & { reset: () => void } {
  let currentZoneId: UniqueIdentifier | null = null

  const detector: CollisionDetection = ({
    droppableContainers,
    collisionRect,
  }) => {
    if (!collisionRect) return []

    const candidates = computeCollisionScores(droppableContainers, collisionRect, snapshotRef?.current)
    if (candidates.length === 0) return []

    const bestCandidate = candidates[0]
    const bestScore = (bestCandidate.data as { value: number }).value

    // If we have a current zone, check if it's still valid and competitive
    if (currentZoneId !== null) {
      const currentCandidate = candidates.find(c => c.id === currentZoneId)

      if (currentCandidate) {
        const currentScore = (currentCandidate.data as { value: number }).value

        // Use reduced threshold for cross-depth transitions (different indentation
        // levels). Same-depth zones get full stickiness to prevent flickering;
        // cross-depth zones are responsive so users can move in/out of containers.
        const currentLeft = (currentCandidate.data as unknown as { left: number }).left
        const bestLeft = (bestCandidate.data as unknown as { left: number }).left
        const crossDepth = Math.abs(currentLeft - bestLeft) > 20
        const effectiveThreshold = crossDepth ? threshold * 0.25 : threshold

        // Only switch if new winner is significantly better (by threshold)
        if (currentScore - bestScore < effectiveThreshold) {
          // Stick with current zone
          return [currentCandidate]
        }
      }
    }

    // Switch to new zone
    currentZoneId = bestCandidate.id
    return [bestCandidate]
  }

  // Add reset method to clear state between drags
  ;(detector as CollisionDetection & { reset: () => void }).reset = () => {
    currentZoneId = null
  }

  return detector as CollisionDetection & { reset: () => void }
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
