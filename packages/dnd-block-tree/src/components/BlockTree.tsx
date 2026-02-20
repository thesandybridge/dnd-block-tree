'use client'

import { useCallback, useRef, useReducer, useMemo, type ReactNode } from 'react'
import {
  DndContext,
  DragStartEvent as DndKitDragStartEvent,
  DragEndEvent as DndKitDragEndEvent,
  DragOverEvent,
  DragMoveEvent as DndKitDragMoveEvent,
  DragCancelEvent,
} from '@dnd-kit/core'
import type {
  BaseBlock,
  BlockRenderers,
  BlockIndex,
  InternalRenderers,
  BlockTreeCallbacks,
  BlockTreeCustomization,
  BlockPosition,
  DragStartEvent,
  DragMoveEvent,
  DragEndEvent,
  BlockMoveEvent,
  ExpandChangeEvent,
  HoverChangeEvent,
  DropZoneType,
} from '../core/types'
import { getDropZoneType, extractBlockId } from '../core/types'
import { createStickyCollision } from '../core/collision'
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
> extends BlockTreeCallbacks<T>, BlockTreeCustomization<T> {
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
  /** Show live preview of drop position during drag (default: true) */
  showDropPreview?: boolean
}

interface InternalState<T extends BaseBlock> {
  activeId: string | null
  hoverZone: string | null
  expandedMap: Record<string, boolean>
  virtualState: BlockIndex<T> | null
  isDragging: boolean
}

/**
 * Get block position in the tree
 */
function getBlockPosition<T extends BaseBlock>(
  blocks: T[],
  blockId: string
): BlockPosition {
  const block = blocks.find(b => b.id === blockId)
  if (!block) return { parentId: null, index: 0 }

  const siblings = blocks.filter(b => b.parentId === block.parentId)
  const index = siblings.findIndex(b => b.id === blockId)
  return { parentId: block.parentId, index }
}

/**
 * Compute initial expanded state
 */
function computeInitialExpanded<T extends BaseBlock>(
  blocks: T[],
  containerTypes: readonly string[],
  initialExpanded: string[] | 'all' | 'none' | undefined
): Record<string, boolean> {
  if (initialExpanded === 'none') {
    return {}
  }

  const expandedMap: Record<string, boolean> = {}
  const containers = blocks.filter(b => containerTypes.includes(b.type))

  if (initialExpanded === 'all' || initialExpanded === undefined) {
    // Default: all containers expanded
    for (const container of containers) {
      expandedMap[container.id] = true
    }
  } else if (Array.isArray(initialExpanded)) {
    for (const id of initialExpanded) {
      expandedMap[id] = true
    }
  }

  return expandedMap
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
  showDropPreview = true,
  // Callbacks
  onDragStart,
  onDragMove,
  onDragEnd,
  onDragCancel,
  onBlockMove,
  onExpandChange,
  onHoverChange,
  // Customization
  canDrag,
  canDrop,
  collisionDetection,
  sensors: sensorConfig,
  initialExpanded,
}: BlockTreeProps<T, C>) {
  const sensors = useConfiguredSensors({
    activationDistance: sensorConfig?.activationDistance ?? activationDistance,
    activationDelay: sensorConfig?.activationDelay,
    tolerance: sensorConfig?.tolerance,
  })

  // Compute initial expanded state
  const initialExpandedMap = useMemo(
    () => computeInitialExpanded(blocks, containerTypes, initialExpanded),
    // Only compute on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  )

  // Internal state refs
  const stateRef = useRef<InternalState<T>>({
    activeId: null,
    hoverZone: null,
    expandedMap: initialExpandedMap,
    virtualState: null,
    isDragging: false,
  })

  // Snapshot refs for stable drag computation
  const initialBlocksRef = useRef<T[]>([])
  const cachedReorderRef = useRef<{ targetId: string; reorderedBlocks: T[] } | null>(null)
  const fromPositionRef = useRef<BlockPosition | null>(null)

  // Sticky collision with hysteresis to prevent flickering between adjacent zones
  const stickyCollisionRef = useRef(createStickyCollision(20))

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

  // Debounced drag move callback
  const debouncedDragMove = useRef(
    debounce((event: DragMoveEvent<T>) => {
      onDragMove?.(event)
    }, 50)
  ).current

  // Use original blocks for zones (stable during drag)
  const originalIndex = computeNormalizedIndex(blocks)

  // Blocks by parent for rendering - always use original for stable zones
  const blocksByParent = new Map<string | null, T[]>()
  for (const [parentId, ids] of originalIndex.byParent.entries()) {
    blocksByParent.set(
      parentId,
      ids.map(id => originalIndex.byId.get(id)!).filter(Boolean)
    )
  }

  // Compute preview position from virtualState
  const previewPosition = useMemo(() => {
    if (!showDropPreview || !stateRef.current.virtualState || !stateRef.current.activeId) {
      return null
    }
    const virtualIndex = stateRef.current.virtualState
    const activeId = stateRef.current.activeId
    const block = virtualIndex.byId.get(activeId)
    if (!block) return null

    const parentId = block.parentId ?? null
    const siblings = virtualIndex.byParent.get(parentId) ?? []
    const index = siblings.indexOf(activeId)
    return { parentId, index }
  }, [showDropPreview, stateRef.current.virtualState, stateRef.current.activeId])

  // Active block (from original, for drag overlay)
  const activeBlock = stateRef.current.activeId
    ? originalIndex.byId.get(stateRef.current.activeId) ?? null
    : null

  // Dragged block for preview ghost
  const draggedBlock = activeBlock

  // Handle drag start
  const handleDragStart = useCallback((event: DndKitDragStartEvent) => {
    const id = String(event.active.id)
    const block = blocks.find(b => b.id === id)

    if (!block) return

    // Check canDrag filter
    if (canDrag && !canDrag(block)) {
      return
    }

    // Create event for callback
    const dragEvent: DragStartEvent<T> = {
      block,
      blockId: id,
    }

    // Call user callback - can return false to prevent drag
    const result = onDragStart?.(dragEvent)
    if (result === false) {
      return
    }

    // Store initial position for move event
    fromPositionRef.current = getBlockPosition(blocks, id)

    // Reset sticky collision for fresh drag
    stickyCollisionRef.current.reset()

    stateRef.current.activeId = id
    stateRef.current.isDragging = true
    initialBlocksRef.current = [...blocks]
    cachedReorderRef.current = null
    forceRender()
  }, [blocks, canDrag, onDragStart])

  // Handle drag move
  const handleDragMove = useCallback((event: DndKitDragMoveEvent) => {
    if (!onDragMove) return

    const id = stateRef.current.activeId
    if (!id) return

    const block = blocks.find(b => b.id === id)
    if (!block) return

    const moveEvent: DragMoveEvent<T> = {
      block,
      blockId: id,
      overZone: stateRef.current.hoverZone,
      coordinates: {
        x: event.delta.x,
        y: event.delta.y,
      },
    }

    debouncedDragMove(moveEvent)
  }, [blocks, onDragMove, debouncedDragMove])

  // Handle drag over
  const handleDragOver = useCallback((event: DragOverEvent) => {
    if (!event.over) return

    const targetZone = String(event.over.id)
    const activeId = stateRef.current.activeId

    if (!activeId) return

    const activeBlock = blocks.find(b => b.id === activeId)
    const targetBlockId = extractBlockId(targetZone)
    const targetBlock = blocks.find(b => b.id === targetBlockId) ?? null

    // Check canDrop filter
    if (canDrop && activeBlock && !canDrop(activeBlock, targetZone, targetBlock)) {
      return
    }

    // Fire hover change callback if zone changed
    if (stateRef.current.hoverZone !== targetZone) {
      const zoneType: DropZoneType = getDropZoneType(targetZone)

      const hoverEvent: HoverChangeEvent<T> = {
        zoneId: targetZone,
        zoneType,
        targetBlock,
      }

      onHoverChange?.(hoverEvent)
    }

    stateRef.current.hoverZone = targetZone

    // Compute preview from snapshot
    const baseIndex = computeNormalizedIndex(initialBlocksRef.current)
    const updatedIndex = reparentBlockIndex(baseIndex, activeId, targetZone, containerTypes)
    const orderedBlocks = buildOrderedBlocks(updatedIndex, containerTypes)

    // Cache for drag end
    cachedReorderRef.current = { targetId: targetZone, reorderedBlocks: orderedBlocks }

    // Debounced preview update (only if enabled)
    if (showDropPreview) {
      debouncedSetVirtual(orderedBlocks)
    }
  }, [blocks, containerTypes, debouncedSetVirtual, canDrop, onHoverChange, showDropPreview])

  // Handle drag end
  const handleDragEnd = useCallback((_event: DndKitDragEndEvent) => {
    debouncedSetVirtual.cancel()
    debouncedDragMove.cancel()

    const cached = cachedReorderRef.current
    const activeId = stateRef.current.activeId
    const activeBlockData = activeId ? blocks.find(b => b.id === activeId) : null

    // Fire drag end callback
    if (activeBlockData) {
      const endEvent: DragEndEvent<T> = {
        block: activeBlockData,
        blockId: activeId!,
        targetZone: cached?.targetId ?? null,
        cancelled: false,
      }
      onDragEnd?.(endEvent)
    }

    // Fire block move callback
    if (cached && activeBlockData && fromPositionRef.current) {
      const toPosition = getBlockPosition(cached.reorderedBlocks, activeBlockData.id)

      const moveEvent: BlockMoveEvent<T> = {
        block: activeBlockData,
        from: fromPositionRef.current,
        to: toPosition,
        blocks: cached.reorderedBlocks,
      }

      onBlockMove?.(moveEvent)
    }

    // Reset state
    stateRef.current.activeId = null
    stateRef.current.hoverZone = null
    stateRef.current.virtualState = null
    stateRef.current.isDragging = false
    cachedReorderRef.current = null
    initialBlocksRef.current = []
    fromPositionRef.current = null

    // Notify parent of change
    if (cached && onChange) {
      onChange(cached.reorderedBlocks)
    }

    forceRender()
  }, [blocks, debouncedSetVirtual, debouncedDragMove, onChange, onDragEnd, onBlockMove])

  // Handle drag cancel
  const handleDragCancel = useCallback((_event: DragCancelEvent) => {
    debouncedSetVirtual.cancel()
    debouncedDragMove.cancel()

    const activeId = stateRef.current.activeId
    const activeBlockData = activeId ? blocks.find(b => b.id === activeId) : null

    // Fire callbacks
    if (activeBlockData) {
      const cancelEvent: DragEndEvent<T> = {
        block: activeBlockData,
        blockId: activeId!,
        targetZone: null,
        cancelled: true,
      }
      onDragCancel?.(cancelEvent)
      onDragEnd?.(cancelEvent)
    }

    // Reset state
    stateRef.current.activeId = null
    stateRef.current.hoverZone = null
    stateRef.current.virtualState = null
    stateRef.current.isDragging = false
    cachedReorderRef.current = null
    initialBlocksRef.current = []
    fromPositionRef.current = null

    forceRender()
  }, [blocks, debouncedSetVirtual, debouncedDragMove, onDragCancel, onDragEnd])

  // Handle hover from drop zones
  const handleHover = useCallback((zoneId: string, _parentId: string | null) => {
    const activeId = stateRef.current.activeId
    if (!activeId) return

    const activeBlockData = blocks.find(b => b.id === activeId)
    const targetBlockId = extractBlockId(zoneId)
    const targetBlock = blocks.find(b => b.id === targetBlockId) ?? null

    // Check canDrop filter
    if (canDrop && activeBlockData && !canDrop(activeBlockData, zoneId, targetBlock)) {
      return
    }

    // Fire hover change callback if zone changed
    if (stateRef.current.hoverZone !== zoneId) {
      const zoneType: DropZoneType = getDropZoneType(zoneId)

      const hoverEvent: HoverChangeEvent<T> = {
        zoneId,
        zoneType,
        targetBlock,
      }

      onHoverChange?.(hoverEvent)
    }

    stateRef.current.hoverZone = zoneId

    // Compute preview from snapshot
    const baseIndex = computeNormalizedIndex(initialBlocksRef.current)
    const updatedIndex = reparentBlockIndex(baseIndex, activeId, zoneId, containerTypes)
    const orderedBlocks = buildOrderedBlocks(updatedIndex, containerTypes)

    // Cache for drag end
    cachedReorderRef.current = { targetId: zoneId, reorderedBlocks: orderedBlocks }

    // Debounced preview update (only if enabled)
    if (showDropPreview) {
      debouncedSetVirtual(orderedBlocks)
    }
  }, [blocks, containerTypes, debouncedSetVirtual, canDrop, onHoverChange, showDropPreview])

  // Handle expand toggle
  const handleToggleExpand = useCallback((id: string) => {
    const newExpanded = stateRef.current.expandedMap[id] === false
    stateRef.current.expandedMap = {
      ...stateRef.current.expandedMap,
      [id]: newExpanded,
    }

    // Fire expand change callback
    const block = blocks.find(b => b.id === id)
    if (block && onExpandChange) {
      const expandEvent: ExpandChangeEvent<T> = {
        block,
        blockId: id,
        expanded: newExpanded,
      }
      onExpandChange(expandEvent)
    }

    forceRender()
  }, [blocks, onExpandChange])

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetection ?? stickyCollisionRef.current}
      onDragStart={handleDragStart}
      onDragMove={handleDragMove}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className={className} style={{ minWidth: 0 }}>
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
          canDrag={canDrag}
          previewPosition={previewPosition}
          draggedBlock={draggedBlock}
        />
      </div>
      <DragOverlay activeBlock={activeBlock}>
        {dragOverlay}
      </DragOverlay>
    </DndContext>
  )
}
