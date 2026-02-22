'use client'

import { useCallback, useRef, useReducer, useMemo, useEffect, useState, type ReactNode, type KeyboardEvent } from 'react'
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
  BlockIndex,
  BlockTreeCallbacks,
  BlockPosition,
  DragStartEvent,
  DragMoveEvent,
  DragEndEvent,
  BlockMoveEvent,
  MoveOperation,
  ExpandChangeEvent,
  HoverChangeEvent,
  DropZoneType,
  Rect,
  SnapshotRectsRef,
} from '@dnd-block-tree/core'
import {
  getDropZoneType,
  extractBlockId,
  createStickyCollision,
  computeNormalizedIndex,
  reparentBlockIndex,
  reparentMultipleBlocks,
  buildOrderedBlocks,
  debounce,
} from '@dnd-block-tree/core'
import type { BlockRenderers, InternalRenderers, BlockTreeCustomization } from '../types'
import { useConfiguredSensors } from '../hooks/useConfiguredSensors'
import { adaptCollisionDetection } from '../bridge'
import { triggerHaptic } from '../utils/haptic'
import { TreeRenderer } from './TreeRenderer'
import { DragOverlay } from './DragOverlay'

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
  /** Enable keyboard navigation with arrow keys (default: false) */
  keyboardNavigation?: boolean
  /** Enable multi-select with Cmd/Ctrl+Click and Shift+Click (default: false) */
  multiSelect?: boolean
  /** Externally-controlled selected IDs (for multi-select) */
  selectedIds?: Set<string>
  /** Called when selection changes (for multi-select) */
  onSelectionChange?: (selectedIds: Set<string>) => void
  /** Enable virtual scrolling for large trees (fixed item height only) */
  virtualize?: {
    /** Fixed height of each item in pixels */
    itemHeight: number
    /** Number of extra items to render outside the visible range (default: 5) */
    overscan?: number
  }
}

interface InternalState<T extends BaseBlock> {
  activeId: string | null
  hoverZone: string | null
  expandedMap: Record<string, boolean>
  virtualState: BlockIndex<T> | null
  isDragging: boolean
}

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

function computeInitialExpanded<T extends BaseBlock>(
  blocks: T[],
  containerTypes: readonly string[],
  initialExpanded: string[] | 'all' | 'none' | undefined
): Record<string, boolean> {
  if (initialExpanded === 'none') {
    const expandedMap: Record<string, boolean> = {}
    const containers = blocks.filter(b => containerTypes.includes(b.type))
    for (const container of containers) {
      expandedMap[container.id] = false
    }
    return expandedMap
  }

  const expandedMap: Record<string, boolean> = {}
  const containers = blocks.filter(b => containerTypes.includes(b.type))

  if (initialExpanded === 'all' || initialExpanded === undefined) {
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

function getVisibleBlockIds<T extends BaseBlock>(
  blocksByParent: Map<string | null, T[]>,
  containerTypes: readonly string[],
  expandedMap: Record<string, boolean>,
  parentId: string | null = null
): string[] {
  const result: string[] = []
  const children = blocksByParent.get(parentId) ?? []
  for (const block of children) {
    result.push(block.id)
    if (containerTypes.includes(block.type) && expandedMap[block.id] !== false) {
      result.push(...getVisibleBlockIds(blocksByParent, containerTypes, expandedMap, block.id))
    }
  }
  return result
}

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
  onBeforeMove,
  onBlockMove,
  onExpandChange,
  onHoverChange,
  // Customization
  canDrag,
  canDrop,
  collisionDetection,
  sensors: sensorConfig,
  animation,
  initialExpanded,
  orderingStrategy = 'integer',
  maxDepth,
  keyboardNavigation = false,
  multiSelect = false,
  selectedIds: externalSelectedIds,
  onSelectionChange,
  virtualize,
}: BlockTreeProps<T, C>) {
  const sensors = useConfiguredSensors({
    activationDistance: sensorConfig?.activationDistance ?? activationDistance,
    activationDelay: sensorConfig?.activationDelay,
    tolerance: sensorConfig?.tolerance,
    longPressDelay: sensorConfig?.longPressDelay,
  })

  const initialExpandedMap = useMemo(
    () => computeInitialExpanded(blocks, containerTypes, initialExpanded),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  )

  const stateRef = useRef<InternalState<T>>({
    activeId: null,
    hoverZone: null,
    expandedMap: initialExpandedMap,
    virtualState: null,
    isDragging: false,
  })

  const initialBlocksRef = useRef<T[]>([])
  const cachedReorderRef = useRef<{ targetId: string; reorderedBlocks: T[] } | null>(null)
  const fromPositionRef = useRef<BlockPosition | null>(null)
  const draggedIdsRef = useRef<string[]>([])

  // Snapshotted drop zone rects -- collision detection reads from this instead
  // of live DOM to prevent feedback loops caused by in-flow ghost previews.
  const snapshotRectsRef = useRef<Map<string, Rect> | null>(null) as SnapshotRectsRef
  const needsResnapshot = useRef(false)

  // Sticky collision with hysteresis (core's createStickyCollision adapted to dnd-kit)
  const stickyCollisionRef = useRef(
    adaptCollisionDetection(createStickyCollision(20, snapshotRectsRef))
  )
  // Keep a direct ref to the core detector for reset
  const coreStickyRef = useRef(createStickyCollision(20, snapshotRectsRef))

  // Snapshot all drop zone rects from the DOM
  const snapshotZoneRects = useCallback(() => {
    const root = rootRef.current
    if (!root) return
    const zones = root.querySelectorAll('[data-zone-id]')
    const map = new Map<string, Rect>()
    zones.forEach(el => {
      const id = el.getAttribute('data-zone-id')
      if (id) map.set(id, el.getBoundingClientRect())
    })
    snapshotRectsRef.current = map
  }, [])

  const [, forceRender] = useReducer((x: number) => x + 1, 0)

  const debouncedSetVirtual = useRef(
    debounce((newBlocks: T[] | null) => {
      if (newBlocks) {
        stateRef.current.virtualState = computeNormalizedIndex(newBlocks)
      } else {
        stateRef.current.virtualState = null
      }
      needsResnapshot.current = true
      forceRender()
    }, previewDebounce)
  ).current

  const debouncedDragMove = useRef(
    debounce((event: DragMoveEvent<T>) => {
      onDragMove?.(event)
    }, 50)
  ).current

  const originalIndex = useMemo(
    () => computeNormalizedIndex(blocks, orderingStrategy),
    [blocks, orderingStrategy]
  )

  const blocksByParent = useMemo(() => {
    const map = new Map<string | null, T[]>()
    for (const [parentId, ids] of originalIndex.byParent.entries()) {
      map.set(parentId, ids.map(id => originalIndex.byId.get(id)!).filter(Boolean))
    }
    return map
  }, [originalIndex])

  // --- Keyboard navigation ---
  const focusedIdRef = useRef<string | null>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const lastClickedIdRef = useRef<string | null>(null)

  const [internalSelectedIds, setInternalSelectedIds] = useReducer(
    (_: Set<string>, next: Set<string>) => next,
    new Set<string>()
  )
  const selectedIds = externalSelectedIds ?? internalSelectedIds
  const setSelectedIds = useCallback((ids: Set<string>) => {
    if (onSelectionChange) {
      onSelectionChange(ids)
    } else {
      setInternalSelectedIds(ids)
    }
  }, [onSelectionChange])

  const visibleBlockIds = useMemo(
    () => getVisibleBlockIds(blocksByParent, containerTypes, stateRef.current.expandedMap),
    [blocksByParent, containerTypes, stateRef.current.expandedMap]
  )

  const focusBlock = useCallback((id: string | null) => {
    focusedIdRef.current = id
    if (id && rootRef.current) {
      const el = rootRef.current.querySelector(`[data-block-id="${id}"]`) as HTMLElement | null
      el?.focus()
    }
    forceRender()
  }, [])

  const toggleExpandRef = useRef<(id: string) => void>(() => {})

  const handleKeyDown = useCallback((event: KeyboardEvent<HTMLDivElement>) => {
    if (!keyboardNavigation) return

    const currentId = focusedIdRef.current
    const currentIndex = currentId ? visibleBlockIds.indexOf(currentId) : -1

    switch (event.key) {
      case 'ArrowDown': {
        event.preventDefault()
        const nextIndex = currentIndex < visibleBlockIds.length - 1 ? currentIndex + 1 : currentIndex
        focusBlock(visibleBlockIds[nextIndex] ?? null)
        break
      }
      case 'ArrowUp': {
        event.preventDefault()
        const prevIndex = currentIndex > 0 ? currentIndex - 1 : 0
        focusBlock(visibleBlockIds[prevIndex] ?? null)
        break
      }
      case 'ArrowRight': {
        event.preventDefault()
        if (currentId) {
          const block = originalIndex.byId.get(currentId)
          if (block && containerTypes.includes(block.type)) {
            if (stateRef.current.expandedMap[currentId] === false) {
              toggleExpandRef.current(currentId)
            } else {
              const children = blocksByParent.get(currentId) ?? []
              if (children.length > 0) focusBlock(children[0].id)
            }
          }
        }
        break
      }
      case 'ArrowLeft': {
        event.preventDefault()
        if (currentId) {
          const block = originalIndex.byId.get(currentId)
          if (block && containerTypes.includes(block.type) && stateRef.current.expandedMap[currentId] !== false) {
            toggleExpandRef.current(currentId)
          } else if (block?.parentId) {
            focusBlock(block.parentId)
          }
        }
        break
      }
      case 'Enter':
      case ' ': {
        event.preventDefault()
        if (currentId) {
          const block = originalIndex.byId.get(currentId)
          if (block && containerTypes.includes(block.type)) {
            toggleExpandRef.current(currentId)
          }
        }
        break
      }
      case 'Home': {
        event.preventDefault()
        if (visibleBlockIds.length > 0) focusBlock(visibleBlockIds[0])
        break
      }
      case 'End': {
        event.preventDefault()
        if (visibleBlockIds.length > 0) focusBlock(visibleBlockIds[visibleBlockIds.length - 1])
        break
      }
    }
  }, [keyboardNavigation, visibleBlockIds, focusBlock, originalIndex, containerTypes, blocksByParent])

  const handleBlockClick = useCallback((blockId: string, event: React.MouseEvent) => {
    if (!multiSelect) return

    if (event.metaKey || event.ctrlKey) {
      const next = new Set(selectedIds)
      if (next.has(blockId)) {
        next.delete(blockId)
      } else {
        next.add(blockId)
      }
      setSelectedIds(next)
    } else if (event.shiftKey && lastClickedIdRef.current) {
      const startIdx = visibleBlockIds.indexOf(lastClickedIdRef.current)
      const endIdx = visibleBlockIds.indexOf(blockId)
      if (startIdx !== -1 && endIdx !== -1) {
        const [from, to] = startIdx < endIdx ? [startIdx, endIdx] : [endIdx, startIdx]
        const next = new Set(selectedIds)
        for (let i = from; i <= to; i++) {
          next.add(visibleBlockIds[i])
        }
        setSelectedIds(next)
      }
    } else {
      setSelectedIds(new Set([blockId]))
    }
    lastClickedIdRef.current = blockId
  }, [multiSelect, selectedIds, setSelectedIds, visibleBlockIds])

  // Re-snapshot zone rects after DOM settles
  useEffect(() => {
    if (!needsResnapshot.current || !stateRef.current.isDragging) return
    needsResnapshot.current = false
    requestAnimationFrame(() => {
      snapshotZoneRects()
    })
  })

  useEffect(() => {
    if (!keyboardNavigation || !focusedIdRef.current || !rootRef.current) return
    const el = rootRef.current.querySelector(`[data-block-id="${focusedIdRef.current}"]`) as HTMLElement | null
    el?.focus()
  })

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

  const activeBlock = stateRef.current.activeId
    ? originalIndex.byId.get(stateRef.current.activeId) ?? null
    : null

  const draggedBlock = activeBlock

  const handleDragStart = useCallback((event: DndKitDragStartEvent) => {
    const id = String(event.active.id)
    const block = blocks.find(b => b.id === id)

    if (!block) return

    if (canDrag && !canDrag(block)) {
      return
    }

    const dragEvent: DragStartEvent<T> = {
      block,
      blockId: id,
    }

    const result = onDragStart?.(dragEvent)
    if (result === false) {
      return
    }

    fromPositionRef.current = getBlockPosition(blocks, id)

    // Reset sticky collision for fresh drag
    coreStickyRef.current.reset()

    if (multiSelect && selectedIds.has(id)) {
      draggedIdsRef.current = visibleBlockIds.filter(vid => selectedIds.has(vid))
    } else {
      draggedIdsRef.current = [id]
      if (multiSelect) {
        setSelectedIds(new Set([id]))
      }
    }

    if (sensorConfig?.hapticFeedback) {
      triggerHaptic()
    }

    stateRef.current.activeId = id
    stateRef.current.isDragging = true
    initialBlocksRef.current = [...blocks]
    cachedReorderRef.current = null
    needsResnapshot.current = true
    forceRender()
  }, [blocks, canDrag, onDragStart, multiSelect, selectedIds, setSelectedIds, visibleBlockIds, sensorConfig?.hapticFeedback])

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

  const handleDragOver = useCallback((event: DragOverEvent) => {
    if (!event.over) return

    const targetZone = String(event.over.id)
    const activeId = stateRef.current.activeId

    if (!activeId) return

    const activeBlock = blocks.find(b => b.id === activeId)
    const targetBlockId = extractBlockId(targetZone)
    const targetBlock = blocks.find(b => b.id === targetBlockId) ?? null

    if (canDrop && activeBlock && !canDrop(activeBlock, targetZone, targetBlock)) {
      return
    }

    if (maxDepth != null && activeBlock) {
      const baseIndex = computeNormalizedIndex(initialBlocksRef.current, orderingStrategy)
      const testResult = reparentBlockIndex(baseIndex, activeId, targetZone, containerTypes, orderingStrategy, maxDepth)
      if (testResult === baseIndex) return
    }

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

    const baseIndex = computeNormalizedIndex(initialBlocksRef.current, orderingStrategy)
    const ids = draggedIdsRef.current
    const updatedIndex = ids.length > 1
      ? reparentMultipleBlocks(baseIndex, ids, targetZone, containerTypes, orderingStrategy, maxDepth)
      : reparentBlockIndex(baseIndex, activeId, targetZone, containerTypes, orderingStrategy, maxDepth)
    const orderedBlocks = buildOrderedBlocks(updatedIndex, containerTypes, orderingStrategy)

    cachedReorderRef.current = { targetId: targetZone, reorderedBlocks: orderedBlocks }

    if (showDropPreview) {
      debouncedSetVirtual(orderedBlocks)
    }
  }, [blocks, containerTypes, debouncedSetVirtual, canDrop, onHoverChange, showDropPreview, maxDepth, orderingStrategy])

  const handleDragEnd = useCallback((_event: DndKitDragEndEvent) => {
    debouncedSetVirtual.cancel()
    debouncedDragMove.cancel()

    let cached = cachedReorderRef.current
    const activeId = stateRef.current.activeId
    const activeBlockData = activeId ? blocks.find(b => b.id === activeId) : null

    if (cached && activeBlockData && fromPositionRef.current && onBeforeMove) {
      const operation: MoveOperation<T> = {
        block: activeBlockData,
        from: fromPositionRef.current,
        targetZone: cached.targetId,
      }
      const result = onBeforeMove(operation)

      if (result === false) {
        stateRef.current.activeId = null
        stateRef.current.hoverZone = null
        stateRef.current.virtualState = null
        stateRef.current.isDragging = false
        cachedReorderRef.current = null
        initialBlocksRef.current = []
        fromPositionRef.current = null
        snapshotRectsRef.current = null
        forceRender()
        return
      }

      if (result && result.targetZone !== cached.targetId) {
        const baseIndex = computeNormalizedIndex(initialBlocksRef.current, orderingStrategy)
        const ids = draggedIdsRef.current
        const updatedIndex = ids.length > 1
          ? reparentMultipleBlocks(baseIndex, ids, result.targetZone, containerTypes, orderingStrategy, maxDepth)
          : reparentBlockIndex(baseIndex, activeId!, result.targetZone, containerTypes, orderingStrategy, maxDepth)
        const reorderedBlocks = buildOrderedBlocks(updatedIndex, containerTypes, orderingStrategy)
        cached = { targetId: result.targetZone, reorderedBlocks }
      }
    }

    if (activeBlockData) {
      const endEvent: DragEndEvent<T> = {
        block: activeBlockData,
        blockId: activeId!,
        targetZone: cached?.targetId ?? null,
        cancelled: false,
      }
      onDragEnd?.(endEvent)
    }

    if (cached && activeBlockData && fromPositionRef.current) {
      const toPosition = getBlockPosition(cached.reorderedBlocks, activeBlockData.id)

      const moveEvent: BlockMoveEvent<T> = {
        block: activeBlockData,
        from: fromPositionRef.current,
        to: toPosition,
        blocks: cached.reorderedBlocks,
        movedIds: [...draggedIdsRef.current],
      }

      onBlockMove?.(moveEvent)
    }

    stateRef.current.activeId = null
    stateRef.current.hoverZone = null
    stateRef.current.virtualState = null
    stateRef.current.isDragging = false
    cachedReorderRef.current = null
    initialBlocksRef.current = []
    fromPositionRef.current = null
    draggedIdsRef.current = []
    snapshotRectsRef.current = null

    if (cached && onChange) {
      onChange(cached.reorderedBlocks)
    }

    forceRender()
  }, [blocks, containerTypes, orderingStrategy, debouncedSetVirtual, debouncedDragMove, onChange, onDragEnd, onBlockMove, onBeforeMove])

  const handleDragCancel = useCallback((_event: DragCancelEvent) => {
    debouncedSetVirtual.cancel()
    debouncedDragMove.cancel()

    const activeId = stateRef.current.activeId
    const activeBlockData = activeId ? blocks.find(b => b.id === activeId) : null

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

    stateRef.current.activeId = null
    stateRef.current.hoverZone = null
    stateRef.current.virtualState = null
    stateRef.current.isDragging = false
    cachedReorderRef.current = null
    initialBlocksRef.current = []
    fromPositionRef.current = null
    draggedIdsRef.current = []
    snapshotRectsRef.current = null

    forceRender()
  }, [blocks, debouncedSetVirtual, debouncedDragMove, onDragCancel, onDragEnd])

  const handleHover = useCallback((zoneId: string, _parentId: string | null) => {
    const activeId = stateRef.current.activeId
    if (!activeId) return

    const activeBlockData = blocks.find(b => b.id === activeId)
    const targetBlockId = extractBlockId(zoneId)
    const targetBlock = blocks.find(b => b.id === targetBlockId) ?? null

    if (canDrop && activeBlockData && !canDrop(activeBlockData, zoneId, targetBlock)) {
      return
    }

    if (maxDepth != null && activeBlockData) {
      const baseIdx = computeNormalizedIndex(initialBlocksRef.current, orderingStrategy)
      const testResult = reparentBlockIndex(baseIdx, activeId, zoneId, containerTypes, orderingStrategy, maxDepth)
      if (testResult === baseIdx) return
    }

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

    const baseIndex = computeNormalizedIndex(initialBlocksRef.current, orderingStrategy)
    const ids = draggedIdsRef.current
    const updatedIndex = ids.length > 1
      ? reparentMultipleBlocks(baseIndex, ids, zoneId, containerTypes, orderingStrategy, maxDepth)
      : reparentBlockIndex(baseIndex, activeId, zoneId, containerTypes, orderingStrategy, maxDepth)
    const orderedBlocks = buildOrderedBlocks(updatedIndex, containerTypes, orderingStrategy)

    cachedReorderRef.current = { targetId: zoneId, reorderedBlocks: orderedBlocks }

    if (showDropPreview) {
      debouncedSetVirtual(orderedBlocks)
    }
  }, [blocks, containerTypes, orderingStrategy, debouncedSetVirtual, canDrop, onHoverChange, showDropPreview, maxDepth])

  const handleToggleExpand = useCallback((id: string) => {
    const newExpanded = stateRef.current.expandedMap[id] === false
    stateRef.current.expandedMap = {
      ...stateRef.current.expandedMap,
      [id]: newExpanded,
    }

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

  toggleExpandRef.current = handleToggleExpand

  // --- Virtual scrolling ---
  const virtualContainerRef = useRef<HTMLDivElement>(null)
  const [virtualScroll, setVirtualScroll] = useState({ scrollTop: 0, clientHeight: 0 })

  useEffect(() => {
    if (!virtualize) return
    const el = virtualContainerRef.current
    if (!el) return

    setVirtualScroll({ scrollTop: el.scrollTop, clientHeight: el.clientHeight })

    const onScroll = () => {
      setVirtualScroll({ scrollTop: el.scrollTop, clientHeight: el.clientHeight })
    }
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [virtualize])

  const virtualResult = useMemo(() => {
    if (!virtualize) return null

    const { itemHeight, overscan = 5 } = virtualize
    const { scrollTop, clientHeight } = virtualScroll
    const totalHeight = visibleBlockIds.length * itemHeight
    const startRaw = Math.floor(scrollTop / itemHeight)
    const visibleCount = Math.ceil(clientHeight / itemHeight)
    const start = Math.max(0, startRaw - overscan)
    const end = Math.min(visibleBlockIds.length - 1, startRaw + visibleCount + overscan)
    const offsetY = start * itemHeight

    const visibleSet = new Set<string>()
    for (let i = start; i <= end; i++) {
      visibleSet.add(visibleBlockIds[i])
    }

    return { totalHeight, offsetY, visibleSet }
  }, [virtualize, virtualScroll, visibleBlockIds])

  // Resolve effective collision detection: user-provided dnd-kit detector,
  // or the internal sticky collision adapted from core
  const effectiveCollision = collisionDetection ?? stickyCollisionRef.current

  const treeContent = (
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
      focusedId={keyboardNavigation ? focusedIdRef.current : undefined}
      selectedIds={multiSelect ? selectedIds : undefined}
      onBlockClick={multiSelect ? handleBlockClick : undefined}
      animation={animation}
      virtualVisibleIds={virtualResult?.visibleSet ?? null}
    />
  )

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={effectiveCollision}
      onDragStart={handleDragStart}
      onDragMove={handleDragMove}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      {virtualize ? (
        <div
          ref={(el) => {
            (virtualContainerRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
            (rootRef as React.MutableRefObject<HTMLDivElement | null>).current = el
          }}
          className={className}
          style={{ minWidth: 0, overflow: 'auto', position: 'relative' }}
          onKeyDown={keyboardNavigation ? handleKeyDown : undefined}
          role={keyboardNavigation ? 'tree' : undefined}
        >
          <div style={{ height: virtualResult!.totalHeight, position: 'relative' }}>
            <div style={{ position: 'absolute', top: virtualResult!.offsetY, left: 0, right: 0 }}>
              {treeContent}
            </div>
          </div>
        </div>
      ) : (
        <div
          ref={rootRef}
          className={className}
          style={{ minWidth: 0 }}
          onKeyDown={keyboardNavigation ? handleKeyDown : undefined}
          role={keyboardNavigation ? 'tree' : undefined}
        >
          {treeContent}
        </div>
      )}
      <DragOverlay activeBlock={activeBlock} selectedCount={multiSelect ? selectedIds.size : 0}>
        {dragOverlay}
      </DragOverlay>
    </DndContext>
  )
}
