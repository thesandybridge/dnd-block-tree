import { initFractionalOrder, generateKeyBetween } from '@dnd-block-tree/react'
import type { ProductivityBlock } from '../productivity/types'

export const INITIAL_BLOCKS: ProductivityBlock[] = initFractionalOrder([
  { id: '1', type: 'section', title: 'Project Planning', parentId: null, order: 0 },
  { id: '2', type: 'task', title: 'Define project scope', parentId: '1', order: 0, completed: true },
  { id: '3', type: 'task', title: 'Create timeline', parentId: '1', order: 1 },
  { id: '4', type: 'note', title: 'Remember to include buffer time', parentId: '1', order: 2 },
  { id: '5', type: 'section', title: 'Development', parentId: null, order: 1 },
  { id: '6', type: 'task', title: 'Set up dev environment', parentId: '5', order: 0, completed: true },
  { id: '7', type: 'task', title: 'Implement core features', parentId: '5', order: 1 },
  { id: '8', type: 'task', title: 'Write unit tests', parentId: '5', order: 2 },
])

/**
 * Simulate a remote reorder: pick a random leaf block and move it
 * to a different position within its parent using fractional indexing.
 */
export function simulateReorder(blocks: ProductivityBlock[]): ProductivityBlock[] | null {
  const leaves = blocks.filter(b => b.type !== 'section')
  if (leaves.length < 2) return null

  const target = leaves[Math.floor(Math.random() * leaves.length)]
  const siblings = blocks
    .filter(b => b.parentId === target.parentId && b.id !== target.id)
    .sort((a, b) => String(a.order) < String(b.order) ? -1 : 1)

  if (siblings.length === 0) return null

  const insertIdx = Math.floor(Math.random() * (siblings.length + 1))
  const lo = insertIdx > 0 ? String(siblings[insertIdx - 1].order) : null
  const hi = insertIdx < siblings.length ? String(siblings[insertIdx].order) : null

  const newKey = generateKeyBetween(lo, hi)

  return blocks.map(b =>
    b.id === target.id ? { ...b, order: newKey } : b
  )
}
