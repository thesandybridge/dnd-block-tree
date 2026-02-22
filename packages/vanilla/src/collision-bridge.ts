import type { Rect, CollisionCandidate, CoreCollisionDetection } from '@dnd-block-tree/core'

/**
 * Measure DOM rects for all registered drop zones and build CollisionCandidate[].
 * Snapshots rects once at drag start to prevent feedback loops.
 */
export function measureDropZoneRects(
  zones: Map<string, HTMLElement>
): Map<string, Rect> {
  const rects = new Map<string, Rect>()
  for (const [id, el] of zones) {
    const domRect = el.getBoundingClientRect()
    rects.set(id, {
      top: domRect.top,
      left: domRect.left,
      width: domRect.width,
      height: domRect.height,
      right: domRect.right,
      bottom: domRect.bottom,
    })
  }
  return rects
}

/** Build collision candidates from a snapshot rect map */
export function buildCandidates(
  snapshotRects: Map<string, Rect>
): CollisionCandidate[] {
  const candidates: CollisionCandidate[] = []
  for (const [id, rect] of snapshotRects) {
    candidates.push({ id, rect })
  }
  return candidates
}

/** Build a pointer rect from client coordinates */
export function pointerToRect(x: number, y: number): Rect {
  return {
    top: y,
    left: x,
    width: 1,
    height: 1,
    right: x + 1,
    bottom: y + 1,
  }
}

/** Run collision detection with snapshotted rects and pointer position */
export function detectCollision(
  detector: CoreCollisionDetection,
  snapshotRects: Map<string, Rect>,
  pointerX: number,
  pointerY: number
): string | null {
  const candidates = buildCandidates(snapshotRects)
  const pointerRect = pointerToRect(pointerX, pointerY)
  const results = detector(candidates, pointerRect)
  return results.length > 0 ? results[0].id : null
}
