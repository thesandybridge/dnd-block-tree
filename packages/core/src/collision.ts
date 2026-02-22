/**
 * Framework-agnostic collision detection types and algorithms.
 * Replaces direct dependency on @dnd-kit/core collision types.
 */

export interface Rect {
  top: number
  left: number
  width: number
  height: number
  right: number
  bottom: number
}

export interface CollisionCandidate {
  id: string
  rect: Rect
}

export interface CollisionResult {
  id: string
  value: number
  left: number
}

export type CoreCollisionDetection = (candidates: CollisionCandidate[], pointerRect: Rect) => CollisionResult[]

export type SnapshotRectsRef = { current: Map<string, Rect> | null }

/**
 * Compute collision scores for drop zones.
 * Considers both vertical distance and horizontal containment.
 *
 * When snapshotRects is provided, uses snapshotted rects instead of candidate rects.
 * This prevents feedback loops caused by in-flow ghost previews shifting zone positions.
 */
function computeCollisionScores(
  candidates: CollisionCandidate[],
  pointerRect: Rect,
  snapshotRects?: Map<string, Rect> | null
): CollisionResult[] {
  const pointerX = pointerRect.left + pointerRect.width / 2
  const pointerY = pointerRect.top + pointerRect.height / 2

  const results: CollisionResult[] = candidates
    .map((candidate) => {
      const rect = snapshotRects?.get(candidate.id) ?? candidate.rect

      const distanceToTop = Math.abs(pointerY - rect.top)
      const distanceToBottom = Math.abs(pointerY - rect.bottom)

      // Use nearest edge distance
      const edgeDistance = Math.min(distanceToTop, distanceToBottom)

      // Apply small bias to prefer bottom drop zones
      const isBelowCenter = pointerY > rect.top + rect.height / 2
      const bias = isBelowCenter ? -5 : 0

      // Horizontal scoring: prefer zones whose indentation matches the pointer.
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
        id: candidate.id,
        value: edgeDistance + bias + horizontalScore,
        left: rect.left,
      }
    })

  // Sort by score (lowest wins)
  results.sort((a, b) => a.value - b.value)

  return results
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
export const weightedVerticalCollision: CoreCollisionDetection = (candidates, pointerRect) => {
  const results = computeCollisionScores(candidates, pointerRect)
  return results.slice(0, 1)
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
): CoreCollisionDetection & { reset: () => void } {
  let currentZoneId: string | null = null

  const detector: CoreCollisionDetection = (candidates, pointerRect) => {
    const results = computeCollisionScores(candidates, pointerRect, snapshotRef?.current)
    if (results.length === 0) return []

    const bestCandidate = results[0]
    const bestScore = bestCandidate.value

    // If we have a current zone, check if it's still valid and competitive
    if (currentZoneId !== null) {
      const currentCandidate = results.find(c => c.id === currentZoneId)

      if (currentCandidate) {
        const currentScore = currentCandidate.value

        // Use reduced threshold for cross-depth transitions (different indentation
        // levels). Same-depth zones get full stickiness to prevent flickering;
        // cross-depth zones are responsive so users can move in/out of containers.
        const currentLeft = currentCandidate.left
        const bestLeft = bestCandidate.left
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

  ;(detector as CoreCollisionDetection & { reset: () => void }).reset = () => {
    currentZoneId = null
  }

  return detector as CoreCollisionDetection & { reset: () => void }
}

/**
 * Simple closest center collision (fallback)
 */
export const closestCenterCollision: CoreCollisionDetection = (candidates, pointerRect) => {
  const centerY = pointerRect.top + pointerRect.height / 2
  const centerX = pointerRect.left + pointerRect.width / 2

  const results: CollisionResult[] = candidates
    .map((candidate) => {
      const rect = candidate.rect
      const containerCenterX = rect.left + rect.width / 2
      const containerCenterY = rect.top + rect.height / 2

      const distance = Math.sqrt(
        Math.pow(centerX - containerCenterX, 2) + Math.pow(centerY - containerCenterY, 2)
      )

      return {
        id: candidate.id,
        value: distance,
        left: rect.left,
      }
    })

  results.sort((a, b) => a.value - b.value)

  return results.slice(0, 1)
}
