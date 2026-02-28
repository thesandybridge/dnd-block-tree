<script lang="ts">
  import type { BaseBlock, CanDragFn, AnimationConfig } from '@dnd-block-tree/core'
  import type { Snippet } from 'svelte'
  import DropZone from './DropZone.svelte'
  import DraggableBlock from './DraggableBlock.svelte'
  import GhostPreview from './GhostPreview.svelte'
  import Self from './TreeRenderer.svelte'

  interface Props {
    blocks: BaseBlock[]
    blocksByParent: Map<string | null, BaseBlock[]>
    parentId: string | null
    activeId: string | null
    expandedMap: Record<string, boolean>
    containerTypes: readonly string[]
    onHover: (zoneId: string, parentId: string | null) => void
    onToggleExpand: (id: string) => void
    onBlockClick?: (blockId: string, event: MouseEvent) => void
    renderBlock: Snippet<[{ block: BaseBlock; isDragging: boolean; depth: number; isExpanded: boolean; isSelected: boolean; onToggleExpand: (() => void) | null; children: Snippet | null }]>
    depth?: number
    dropZoneClass?: string
    dropZoneActiveClass?: string
    canDrag?: CanDragFn<BaseBlock>
    hoverZone?: string | null
    previewPosition?: { parentId: string | null; index: number } | null
    draggedBlock?: BaseBlock | null
    selectedIds?: Set<string>
    animation?: AnimationConfig
  }

  let {
    blocks,
    blocksByParent,
    parentId,
    activeId,
    expandedMap,
    containerTypes,
    onHover,
    onToggleExpand,
    onBlockClick,
    renderBlock,
    depth = 0,
    dropZoneClass = '',
    dropZoneActiveClass = '',
    canDrag,
    hoverZone = null,
    previewPosition = null,
    draggedBlock = null,
    selectedIds,
    animation,
  }: Props = $props()

  const items = $derived(blocksByParent.get(parentId) ?? [])
  const filteredBlocks = $derived(items.filter(block => block.id !== activeId))
  const showGhostHere = $derived(previewPosition?.parentId === parentId && draggedBlock != null)
</script>

<div style:min-width="0" role={depth === 0 ? 'tree' : 'group'}>
  <!-- Start zone -->
  <DropZone
    id={parentId ? `into-${parentId}` : 'root-start'}
    {parentId}
    {onHover}
    {activeId}
    {hoverZone}
    class={dropZoneClass}
    activeClass={dropZoneActiveClass}
  />

  {#each filteredBlocks as block, index (block.id)}
    {@const isContainer = containerTypes.includes(block.type)}
    {@const isExpanded = expandedMap[block.id] !== false}
    {@const isDragDisabled = canDrag ? !canDrag(block) : false}
    {@const ghostBeforeThis = showGhostHere && previewPosition!.index === index}
    {@const originalIndex = items.findIndex(b => b.id === block.id)}
    {@const isLastInOriginal = originalIndex === items.length - 1}
    {@const isSelected = selectedIds?.has(block.id) ?? false}

    <!-- Ghost preview before this block -->
    {#if ghostBeforeThis && draggedBlock}
      <GhostPreview>
        {#snippet children()}
          {@render renderBlock({
            block: draggedBlock,
            isDragging: true,
            depth,
            isExpanded: false,
            isSelected: false,
            onToggleExpand: null,
            children: null,
          })}
        {/snippet}
      </GhostPreview>
    {/if}

    <!-- The block itself -->
    <DraggableBlock
      {block}
      disabled={isDragDisabled}
      {isContainer}
      {isExpanded}
      {isSelected}
      {depth}
      {onBlockClick}
    >
      {#snippet children({ isDragging })}
        {#if isContainer}
          {@const animated = animation?.expandDuration && animation.expandDuration > 0}
          {@const easing = animation?.easing ?? 'ease'}
          {@const duration = animation?.expandDuration ?? 0}

          {#snippet childContent()}
            <Self
              {blocks}
              {blocksByParent}
              parentId={block.id}
              {activeId}
              {expandedMap}
              {containerTypes}
              {onHover}
              {onToggleExpand}
              {onBlockClick}
              {renderBlock}
              depth={depth + 1}
              {dropZoneClass}
              {dropZoneActiveClass}
              {canDrag}
              {hoverZone}
              {previewPosition}
              {draggedBlock}
              {selectedIds}
              {animation}
            />
          {/snippet}

          {#if animated}
            {@render renderBlock({
              block,
              isDragging,
              depth,
              isExpanded,
              isSelected,
              onToggleExpand: () => onToggleExpand(block.id),
              children: childContent,
            })}
          {:else}
            {@render renderBlock({
              block,
              isDragging,
              depth,
              isExpanded,
              isSelected,
              onToggleExpand: () => onToggleExpand(block.id),
              children: isExpanded ? childContent : null,
            })}
          {/if}
        {:else}
          {@render renderBlock({
            block,
            isDragging,
            depth,
            isExpanded: false,
            isSelected,
            onToggleExpand: null,
            children: null,
          })}
        {/if}
      {/snippet}
    </DraggableBlock>

    <!-- After-zone for non-last blocks -->
    {#if !isLastInOriginal}
      <DropZone
        id={`after-${block.id}`}
        parentId={block.parentId}
        {onHover}
        {activeId}
        {hoverZone}
        class={dropZoneClass}
        activeClass={dropZoneActiveClass}
      />
    {/if}
  {/each}

  <!-- Ghost at end of container -->
  {#if showGhostHere && previewPosition!.index >= filteredBlocks.length && draggedBlock}
    <GhostPreview>
      {#snippet children()}
        {@render renderBlock({
          block: draggedBlock,
          isDragging: true,
          depth,
          isExpanded: false,
          isSelected: false,
          onToggleExpand: null,
          children: null,
        })}
      {/snippet}
    </GhostPreview>
  {/if}

  <!-- End zone -->
  <DropZone
    id={parentId ? `end-${parentId}` : 'root-end'}
    {parentId}
    {onHover}
    {activeId}
    {hoverZone}
    class={dropZoneClass}
    activeClass={dropZoneActiveClass}
  />
</div>
