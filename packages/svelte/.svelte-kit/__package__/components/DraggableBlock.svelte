<script lang="ts">
  import { createDraggable } from '@dnd-kit/svelte'
  import type { BaseBlock } from '@dnd-block-tree/core'
  import type { Snippet } from 'svelte'

  interface Props {
    block: BaseBlock
    disabled?: boolean
    isContainer?: boolean
    isExpanded?: boolean
    isSelected?: boolean
    depth?: number
    onBlockClick?: (blockId: string, event: MouseEvent) => void
    children: Snippet<[{ isDragging: boolean }]>
  }

  let {
    block,
    disabled = false,
    isContainer = false,
    isExpanded = false,
    isSelected = false,
    depth = 0,
    onBlockClick,
    children,
  }: Props = $props()

  function handleClick(event: MouseEvent) {
    if (onBlockClick) {
      event.stopPropagation()
      onBlockClick(block.id, event)
    }
  }

  const draggable = createDraggable({ get id() { return block.id }, get disabled() { return disabled } })
</script>

<div
  {@attach draggable.attach}
  onclick={handleClick}
  data-block-id={block.id}
  style:touch-action="none"
  style:min-width="0"
  style:outline="none"
  role="treeitem"
  aria-level={depth + 1}
  aria-expanded={isContainer ? isExpanded : undefined}
  aria-selected={isSelected || undefined}
  data-selected={isSelected || undefined}
  tabindex="-1"
>
  {@render children({ isDragging: draggable.isDragging })}
</div>
