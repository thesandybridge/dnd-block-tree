<script lang="ts">
  import { DragDropProvider } from '@dnd-kit/svelte'
  import type {
    BaseBlock,
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
  } from '@dnd-block-tree/core'
  import {
    getDropZoneType,
    extractBlockId,
    computeNormalizedIndex,
    reparentBlockIndex,
    reparentMultipleBlocks,
    buildOrderedBlocks,
    debounce,
  } from '@dnd-block-tree/core'
  import type { BlockTreeCustomization } from '../types'
  import { triggerHaptic } from '../utils/haptic'
  import TreeRenderer from './TreeRenderer.svelte'
  import DragOverlay from './DragOverlay.svelte'
  import type { Snippet } from 'svelte'

  interface Props extends BlockTreeCallbacks<BaseBlock>, BlockTreeCustomization<BaseBlock> {
    blocks: BaseBlock[]
    containerTypes?: readonly string[]
    onChange?: (blocks: BaseBlock[]) => void
    renderBlock: Snippet<[{
      block: BaseBlock
      isDragging: boolean
      depth: number
      isExpanded: boolean
      isSelected: boolean
      onToggleExpand: (() => void) | null
      children: Snippet | null
    }]>
    dragOverlay?: Snippet<[BaseBlock]>
    activationDistance?: number
    previewDebounce?: number
    showDropPreview?: boolean
    multiSelect?: boolean
    selectedIds?: Set<string>
    onSelectionChange?: (selectedIds: Set<string>) => void
    dropZoneClass?: string
    dropZoneActiveClass?: string
    class?: string
  }

  let {
    blocks,
    containerTypes = [],
    onChange,
    renderBlock,
    dragOverlay,
    activationDistance = 8,
    previewDebounce = 150,
    showDropPreview = true,
    class: className = '',
    dropZoneClass = '',
    dropZoneActiveClass = '',
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
    collisionDetection: userCollisionDetection,
    sensors: sensorConfig,
    animation,
    initialExpanded,
    orderingStrategy = 'integer',
    maxDepth,
    multiSelect = false,
    selectedIds: externalSelectedIds,
    onSelectionChange,
  }: Props = $props()

  // ---------- Snapshot-based collision detection ----------
  // @dnd-kit/dom uses per-droppable collision that re-measures element rects
  // continuously, causing feedback loops when the ghost preview shifts layout.
  // We bypass it entirely: snapshot zone rects at drag start and run our own
  // nearest-zone detection on every pointermove. This mirrors the React
  // adapter's snapshotRects pattern.

  const STICKY_THRESHOLD = 20
  let stickyTargetId: string | null = null
  let snapshotRects: Map<string, { top: number; bottom: number }> | null = null
  let containerEl: HTMLDivElement | undefined = undefined

  function captureZoneRects() {
    const rects = new Map<string, { top: number; bottom: number }>()
    // Scope to this tree's container so multiple BlockTree instances
    // on the same page (e.g. realtime demo) don't interfere.
    const root = containerEl ?? document
    const zones = root.querySelectorAll('[data-zone-id]')
    for (const zone of zones) {
      const id = zone.getAttribute('data-zone-id')
      if (id) {
        const rect = zone.getBoundingClientRect()
        rects.set(id, { top: rect.top, bottom: rect.bottom })
      }
    }
    return rects
  }

  function findNearestZone(pointerY: number): string | null {
    if (!snapshotRects || snapshotRects.size === 0) return null

    let bestId: string | null = null
    let bestDist = Infinity

    for (const [id, rect] of snapshotRects) {
      const distTop = Math.abs(pointerY - rect.top)
      const distBottom = Math.abs(pointerY - rect.bottom)
      const edgeDist = Math.min(distTop, distBottom)

      // Sticky hysteresis: reduce distance for current target
      const effectiveDist = (stickyTargetId === id)
        ? Math.max(0, edgeDist - STICKY_THRESHOLD)
        : edgeDist

      if (effectiveDist < bestDist) {
        bestDist = effectiveDist
        bestId = id
      }
    }

    return bestId
  }

  // Internal state
  let activeId = $state<string | null>(null)
  let hoverZone = $state<string | null>(null)
  let expandedMap = $state<Record<string, boolean>>({})
  let prevInitialExpanded: typeof initialExpanded = undefined

  $effect.pre(() => {
    if (initialExpanded !== prevInitialExpanded) {
      prevInitialExpanded = initialExpanded
      expandedMap = computeInitialExpanded(blocks, containerTypes, initialExpanded)
    }
  })
  let virtualState = $state<ReturnType<typeof computeNormalizedIndex> | null>(null)
  let isDragging = $state(false)
  let dragPosition = $state<{ x: number; y: number } | null>(null)

  // Track cursor position during drag for overlay positioning AND collision detection.
  // Must use capture phase: @dnd-kit/dom's PointerSensor calls stopPropagation()
  // on pointermove during drag, so bubble-phase listeners on document never fire.
  $effect(() => {
    if (!isDragging) {
      dragPosition = null
      return
    }
    function onPointerMove(e: PointerEvent) {
      dragPosition = { x: e.clientX, y: e.clientY }

      // Run our own collision detection on every pointer move
      if (snapshotRects && activeId) {
        const nearestZone = findNearestZone(e.clientY)
        if (nearestZone && nearestZone !== hoverZone) {
          processHover(nearestZone)
        }
      }
    }
    document.addEventListener('pointermove', onPointerMove, true)
    return () => document.removeEventListener('pointermove', onPointerMove, true)
  })

  // Non-reactive refs
  let initialBlocksRef: BaseBlock[] = []
  let cachedReorderRef: { targetId: string; reorderedBlocks: BaseBlock[] } | null = null
  let fromPositionRef: BlockPosition | null = null
  let draggedIdsRef: string[] = []

  // Selection
  let internalSelectedIds = $state(new Set<string>())
  const selectedIds = $derived(externalSelectedIds ?? internalSelectedIds)

  function setSelectedIds(ids: Set<string>) {
    if (onSelectionChange) {
      onSelectionChange(ids)
    } else {
      internalSelectedIds = ids
    }
  }

  // Computed
  const originalIndex = $derived(computeNormalizedIndex(blocks, orderingStrategy))

  const blocksByParent = $derived.by(() => {
    const effectiveIdx = virtualState ?? originalIndex
    const map = new Map<string | null, BaseBlock[]>()
    for (const [parentId, ids] of effectiveIdx.byParent.entries()) {
      map.set(parentId, ids.map(id => effectiveIdx.byId.get(id)!).filter(Boolean))
    }
    return map
  })

  const activeBlock = $derived(
    activeId ? originalIndex.byId.get(activeId) ?? null : null
  )

  const previewPosition = $derived.by(() => {
    if (!showDropPreview || !virtualState || !activeId) return null
    const block = virtualState.byId.get(activeId)
    if (!block) return null
    const parentId = block.parentId ?? null
    const siblings = virtualState.byParent.get(parentId) ?? []
    const index = siblings.indexOf(activeId)
    return { parentId, index }
  })

  const debouncedSetVirtual = $derived(
    debounce((newBlocks: BaseBlock[] | null) => {
      if (newBlocks) {
        virtualState = computeNormalizedIndex(newBlocks)
      } else {
        virtualState = null
      }
    }, previewDebounce)
  )

  // Event handlers
  function handleDragStart(event: any) {
    const id = String(event.operation?.source?.id ?? event.active?.id)
    const block = blocks.find(b => b.id === id)
    if (!block) return
    if (canDrag && !canDrag(block)) return

    const dragEvent: DragStartEvent<BaseBlock> = { block, blockId: id }
    const result = onDragStart?.(dragEvent)
    if (result === false) return

    stickyTargetId = null
    fromPositionRef = getBlockPosition(blocks, id)

    if (multiSelect && selectedIds.has(id)) {
      draggedIdsRef = blocks.filter(b => selectedIds.has(b.id)).map(b => b.id)
    } else {
      draggedIdsRef = [id]
    }

    if (sensorConfig?.hapticFeedback) triggerHaptic()

    // Set initial position from the activator event so overlay appears immediately
    const nativeEvent = event.nativeEvent ?? event.operation?.activatorEvent
    if (nativeEvent && 'clientX' in nativeEvent) {
      dragPosition = { x: nativeEvent.clientX, y: nativeEvent.clientY }
    }

    activeId = id
    isDragging = true
    initialBlocksRef = [...blocks]
    cachedReorderRef = null

    // Capture zone rects after DOM reflows (dragged block hidden).
    // Uses rAF to ensure layout has settled before measuring.
    requestAnimationFrame(() => {
      if (isDragging) {
        snapshotRects = captureZoneRects()
      }
    })
  }

  function handleDragOver(_event: any) {
    // Collision detection is handled by our own pointermove-based system.
    // We keep this handler registered to satisfy DragDropProvider's API
    // but don't use @dnd-kit's collision results.
  }

  function processHover(targetZone: string) {
    const block = blocks.find(b => b.id === activeId)
    const targetBlockId = extractBlockId(targetZone)
    const targetBlock = blocks.find(b => b.id === targetBlockId) ?? null

    if (canDrop && block && !canDrop(block, targetZone, targetBlock)) return

    if (hoverZone !== targetZone) {
      const zoneType: DropZoneType = getDropZoneType(targetZone)
      onHoverChange?.({ zoneId: targetZone, zoneType, targetBlock })
    }

    hoverZone = targetZone
    stickyTargetId = targetZone

    const baseIndex = computeNormalizedIndex(initialBlocksRef, orderingStrategy)
    const ids = draggedIdsRef
    const updatedIndex = ids.length > 1
      ? reparentMultipleBlocks(baseIndex, ids, targetZone, containerTypes, orderingStrategy, maxDepth)
      : reparentBlockIndex(baseIndex, activeId!, targetZone, containerTypes, orderingStrategy, maxDepth)
    const orderedBlocks = buildOrderedBlocks(updatedIndex, containerTypes, orderingStrategy)

    cachedReorderRef = { targetId: targetZone, reorderedBlocks: orderedBlocks }
    if (showDropPreview) debouncedSetVirtual(orderedBlocks)
  }

  function handleDragEnd(event: any) {
    debouncedSetVirtual.cancel()

    let cached = cachedReorderRef
    const dragId = activeId
    const block = dragId ? blocks.find(b => b.id === dragId) : null
    const cancelled = event?.canceled ?? false

    if (cancelled) {
      if (block && dragId) {
        const cancelEvent: DragEndEvent<BaseBlock> = { block, blockId: dragId, targetZone: null, cancelled: true }
        onDragCancel?.(cancelEvent)
        onDragEnd?.(cancelEvent)
      }
      resetDragState()
      return
    }

    // onBeforeMove middleware
    if (cached && block && fromPositionRef && onBeforeMove) {
      const operation: MoveOperation<BaseBlock> = {
        block,
        from: fromPositionRef,
        targetZone: cached.targetId,
      }
      const result = onBeforeMove(operation)
      if (result === false) {
        resetDragState()
        return
      }
      if (result && result.targetZone !== cached.targetId) {
        const baseIndex = computeNormalizedIndex(initialBlocksRef, orderingStrategy)
        const ids = draggedIdsRef
        const updatedIndex = ids.length > 1
          ? reparentMultipleBlocks(baseIndex, ids, result.targetZone, containerTypes, orderingStrategy, maxDepth)
          : reparentBlockIndex(baseIndex, dragId!, result.targetZone, containerTypes, orderingStrategy, maxDepth)
        cached = { targetId: result.targetZone, reorderedBlocks: buildOrderedBlocks(updatedIndex, containerTypes, orderingStrategy) }
      }
    }

    if (block && dragId) {
      onDragEnd?.({ block, blockId: dragId, targetZone: cached?.targetId ?? null, cancelled: false })
    }

    if (cached && block && fromPositionRef) {
      const toPosition = getBlockPosition(cached.reorderedBlocks, block.id)
      onBlockMove?.({ block, from: fromPositionRef, to: toPosition, blocks: cached.reorderedBlocks, movedIds: [...draggedIdsRef] })
    }

    if (cached && onChange) {
      onChange(cached.reorderedBlocks)
    }

    resetDragState()
  }

  function resetDragState() {
    activeId = null
    hoverZone = null
    virtualState = null
    isDragging = false
    cachedReorderRef = null
    initialBlocksRef = []
    fromPositionRef = null
    draggedIdsRef = []
    stickyTargetId = null
    snapshotRects = null
  }

  function handleBlockClick(blockId: string, event: MouseEvent) {
    if (!multiSelect) return

    if (event.metaKey || event.ctrlKey) {
      const next = new Set(selectedIds)
      if (next.has(blockId)) {
        next.delete(blockId)
      } else {
        next.add(blockId)
      }
      setSelectedIds(next)
    } else {
      setSelectedIds(new Set([blockId]))
    }
  }

  function handleToggleExpand(id: string) {
    const newExpanded = expandedMap[id] === false
    expandedMap = { ...expandedMap, [id]: newExpanded }

    const block = blocks.find(b => b.id === id)
    if (block && onExpandChange) {
      onExpandChange({ block, blockId: id, expanded: newExpanded })
    }
  }

  function handleHover(zoneId: string, _parentId: string | null) {
    if (!activeId) return
    processHover(zoneId)
  }

  function getBlockPosition(blocks: BaseBlock[], blockId: string): BlockPosition {
    const block = blocks.find(b => b.id === blockId)
    if (!block) return { parentId: null, index: 0 }
    const siblings = blocks.filter(b => b.parentId === block.parentId)
    const index = siblings.findIndex(b => b.id === blockId)
    return { parentId: block.parentId, index }
  }

  function computeInitialExpanded(
    blocks: BaseBlock[],
    containerTypes: readonly string[],
    initialExpanded: string[] | 'all' | 'none' | undefined
  ): Record<string, boolean> {
    if (initialExpanded === 'none') {
      const map: Record<string, boolean> = {}
      for (const b of blocks) {
        if (containerTypes.includes(b.type)) map[b.id] = false
      }
      return map
    }
    const map: Record<string, boolean> = {}
    if (initialExpanded === 'all' || initialExpanded === undefined) {
      for (const b of blocks) {
        if (containerTypes.includes(b.type)) map[b.id] = true
      }
    } else if (Array.isArray(initialExpanded)) {
      for (const id of initialExpanded) {
        map[id] = true
      }
    }
    return map
  }
</script>

<DragDropProvider
  onDragStart={handleDragStart}
  onDragOver={handleDragOver}
  onDragEnd={handleDragEnd}
>
  <div bind:this={containerEl} class={className} style:min-width="0">
    <TreeRenderer
      {blocks}
      {blocksByParent}
      parentId={null}
      {activeId}
      {expandedMap}
      {containerTypes}
      onHover={handleHover}
      onToggleExpand={handleToggleExpand}
      onBlockClick={multiSelect ? handleBlockClick : undefined}
      {renderBlock}
      {dropZoneClass}
      {dropZoneActiveClass}
      {canDrag}
      {hoverZone}
      {previewPosition}
      draggedBlock={activeBlock}
      {selectedIds}
      {animation}
    />
  </div>
  <DragOverlay {activeBlock} position={dragPosition} selectedCount={multiSelect ? selectedIds.size : 0}>
    {#snippet children(block)}
      {#if dragOverlay}
        {@render dragOverlay(block)}
      {/if}
    {/snippet}
  </DragOverlay>
</DragDropProvider>
