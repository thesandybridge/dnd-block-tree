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
  import type { BlockTreeCustomization } from '../types'
  import { adaptCollisionDetection } from '../bridge'
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

  // Sticky collision detection bridged from core
  const coreStickyDetector = createStickyCollision(20)
  const adaptedCollision = $derived(
    adaptCollisionDetection(userCollisionDetection ?? coreStickyDetector)
  )

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

    coreStickyDetector.reset()
    fromPositionRef = getBlockPosition(blocks, id)

    if (multiSelect && selectedIds.has(id)) {
      draggedIdsRef = blocks.filter(b => selectedIds.has(b.id)).map(b => b.id)
    } else {
      draggedIdsRef = [id]
    }

    if (sensorConfig?.hapticFeedback) triggerHaptic()

    activeId = id
    isDragging = true
    initialBlocksRef = [...blocks]
    cachedReorderRef = null
  }

  function handleDragOver(event: any) {
    const targetId = String(event.operation?.target?.id ?? event.over?.id ?? '')
    if (!targetId || !activeId) return
    processHover(targetId)
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
  <div class={className} style:min-width="0">
    <TreeRenderer
      {blocks}
      {blocksByParent}
      parentId={null}
      {activeId}
      {expandedMap}
      {containerTypes}
      onHover={handleHover}
      onToggleExpand={handleToggleExpand}
      {renderBlock}
      {dropZoneClass}
      {dropZoneActiveClass}
      {canDrag}
      {previewPosition}
      draggedBlock={activeBlock}
      {selectedIds}
      {animation}
    />
  </div>
  <DragOverlay {activeBlock} selectedCount={multiSelect ? selectedIds.size : 0}>
    {#snippet children(block)}
      {#if dragOverlay}
        {@render dragOverlay(block)}
      {/if}
    {/snippet}
  </DragOverlay>
</DragDropProvider>
