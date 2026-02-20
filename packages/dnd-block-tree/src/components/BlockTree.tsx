'use client'

import { useCallback, useRef, useReducer, type ReactNode } from 'react'
import {
  DndContext,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
} from '@dnd-kit/core'
import type { BaseBlock, BlockRenderers, BlockIndex, InternalRenderers } from '../core/types'
import { weightedVerticalCollision } from '../core/collision'
import { useConfiguredSensors } from '../core/sensors'
import { TreeRenderer } from './TreeRenderer'
import { DragOverlay } from './DragOverlay'
import {
  computeNormalizedIndex,
  reparentBlockIndex,
  buildOrderedBlocks,
} from '../utils/blocks'
import { debounce } from '../utils/helper'

export interface BlockTreeProps<
  T extends BaseBlock,
  C extends readonly T['type'][] = readonly T['type'][]
> {
  /** Current blocks array */
  blocks: T[]
  /** Block renderers for each type */
  renderers: BlockRenderers<T, C>
  /** Block types that can have children */
  containerTypes?: C
  /** Called when blocks are reordered */
  onChange?: (blocks: T[]) => void
  /** Custom drag overlay renderer */
  dragOverlay?: (block: T) => ReactNode
  /** Activation distance in pixels (default: 8) */
  activationDistance?: number
  /** Preview debounce in ms (default: 150) */
  previewDebounce?: number
  /** Root container className */
  className?: string
  /** Drop zone className */
  dropZoneClassName?: string
  /** Active drop zone className */
  dropZoneActiveClassName?: string
  /** Indent className for nested items */
  indentClassName?: string
}

interface InternalState<T extends BaseBlock> {
  activeId: string | null
  hoverZone: string | null
  expandedMap: Record<string, boolean>
  virtualState: BlockIndex<T> | null
}

/**
 * Main BlockTree component
 * Provides drag-and-drop functionality for hierarchical block structures
 */
export function BlockTree<
  T extends BaseBlock,
  C extends readonly T['type'][] = readonly T['type'][]
>({
  blocks,
  renderers,
  containerTypes = [] as unknown as C,
  onChange,
  dragOverlay,
  activationDistance = 8,
  previewDebounce = 150,
  className = 'flex flex-col gap-1',
  dropZoneClassName,
  dropZoneActiveClassName,
  indentClassName,
}: BlockTreeProps<T, C>) {
  const sensors = useConfiguredSensors({ activationDistance })

  // Internal state refs
  const stateRef = useRef<InternalState<T>>({
    activeId: null,
    hoverZone: null,
    expandedMap: {},
    virtualState: null,
  })

  // Snapshot refs for stable drag computation
  const initialBlocksRef = useRef<T[]>([])
  const cachedReorderRef = useRef<{ targetId: string; reorderedBlocks: T[] } | null>(null)

  // Force re-render
  const [, forceRender] = useReducer((x: number) => x + 1, 0)

  // Debounced virtual state setter
  const debouncedSetVirtual = useRef(
    debounce((newBlocks: T[] | null) => {
      if (newBlocks) {
        stateRef.current.virtualState = computeNormalizedIndex(newBlocks)
      } else {
        stateRef.current.virtualState = null
      }
      forceRender()
    }, previewDebounce)
  ).current

  // Compute effective state
  const effectiveIndex = stateRef.current.virtualState ?? computeNormalizedIndex(blocks)

  // Blocks by parent for rendering
  const blocksByParent = new Map<string | null, T[]>()
  for (const [parentId, ids] of effectiveIndex.byParent.entries()) {
    blocksByParent.set(
      parentId,
      ids.map(id => effectiveIndex.byId.get(id)!).filter(Boolean)
    )
  }

  // Active block
  const activeBlock = stateRef.current.activeId
    ? effectiveIndex.byId.get(stateRef.current.activeId) ?? null
    : null

  // Handle drag start
  const handleDragStart = useCallback((event: DragStartEvent) => {
    const id = String(event.active.id)
    stateRef.current.activeId = id
    initialBlocksRef.current = [...blocks]
    cachedReorderRef.current = null
    forceRender()
  }, [blocks])

  // Handle drag over
  const handleDragOver = useCallback((event: DragOverEvent) => {
    if (!event.over) return

    const targetZone = String(event.over.id)
    const activeId = stateRef.current.activeId

    if (!activeId) return

    stateRef.current.hoverZone = targetZone

    // Compute preview from snapshot
    const baseIndex = computeNormalizedIndex(initialBlocksRef.current)
    const updatedIndex = reparentBlockIndex(baseIndex, activeId, targetZone, containerTypes)
    const orderedBlocks = buildOrderedBlocks(updatedIndex, containerTypes)

    // Cache for drag end
    cachedReorderRef.current = { targetId: targetZone, reorderedBlocks: orderedBlocks }

    // Debounced preview update
    debouncedSetVirtual(orderedBlocks)
  }, [containerTypes, debouncedSetVirtual])

  // Handle drag end
  const handleDragEnd = useCallback((_event: DragEndEvent) => {
    debouncedSetVirtual.cancel()

    const cached = cachedReorderRef.current

    // Reset state
    stateRef.current.activeId = null
    stateRef.current.hoverZone = null
    stateRef.current.virtualState = null
    cachedReorderRef.current = null
    initialBlocksRef.current = []

    // Notify parent of change
    if (cached && onChange) {
      onChange(cached.reorderedBlocks)
    }

    forceRender()
  }, [debouncedSetVirtual, onChange])

  // Handle hover from drop zones
  const handleHover = useCallback((zoneId: string, _parentId: string | null) => {
    const activeId = stateRef.current.activeId
    if (!activeId) return

    stateRef.current.hoverZone = zoneId

    // Compute preview from snapshot
    const baseIndex = computeNormalizedIndex(initialBlocksRef.current)
    const updatedIndex = reparentBlockIndex(baseIndex, activeId, zoneId, containerTypes)
    const orderedBlocks = buildOrderedBlocks(updatedIndex, containerTypes)

    // Cache for drag end
    cachedReorderRef.current = { targetId: zoneId, reorderedBlocks: orderedBlocks }

    // Debounced preview update
    debouncedSetVirtual(orderedBlocks)
  }, [containerTypes, debouncedSetVirtual])

  // Handle expand toggle
  const handleToggleExpand = useCallback((id: string) => {
    stateRef.current.expandedMap = {
      ...stateRef.current.expandedMap,
      [id]: stateRef.current.expandedMap[id] === false,
    }
    forceRender()
  }, [])

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={weightedVerticalCollision}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className={className}>
        <TreeRenderer
          blocks={blocks}
          blocksByParent={blocksByParent}
          parentId={null}
          activeId={stateRef.current.activeId}
          expandedMap={stateRef.current.expandedMap}
          renderers={renderers as InternalRenderers<T>}
          containerTypes={containerTypes}
          onHover={handleHover}
          onToggleExpand={handleToggleExpand}
          dropZoneClassName={dropZoneClassName}
          dropZoneActiveClassName={dropZoneActiveClassName}
          indentClassName={indentClassName}
          rootClassName={className}
        />
      </div>
      <DragOverlay activeBlock={activeBlock}>
        {dragOverlay}
      </DragOverlay>
    </DndContext>
  )
}
