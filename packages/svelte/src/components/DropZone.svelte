<script lang="ts">
  import { createDroppable } from '@dnd-kit/svelte'
  import { extractUUID } from '@dnd-block-tree/core'

  interface Props {
    id: string
    parentId: string | null
    onHover: (zoneId: string, parentId: string | null) => void
    activeId: string | null
    hoverZone?: string | null
    height?: number
    class?: string
    activeClass?: string
  }

  let {
    id,
    parentId,
    onHover,
    activeId,
    hoverZone = null,
    height = 4,
    class: className = '',
    activeClass = '',
  }: Props = $props()

  // We still register as a droppable so @dnd-kit/dom tracks the element,
  // but collision detection is handled by BlockTree's own snapshot system.
  const droppable = createDroppable({
    get id() { return id },
  })

  // Hide "into-" zones for the active block (can't drop a container into itself)
  const zoneBlockId = $derived(extractUUID(id))
  const isIntoZone = $derived(id.startsWith('into-'))
  const shouldHide = $derived(isIntoZone && activeId != null && zoneBlockId === activeId)

  // Visual active state driven by BlockTree's hoverZone (our own collision detection)
  const isActive = $derived(hoverZone === id)
</script>

{#if !shouldHide}
  <div
    {@attach droppable.attach}
    data-zone-id={id}
    data-parent-id={parentId ?? ''}
    style:height="{isActive ? height * 2 : height}px"
    style:transition="height 150ms ease, background-color 150ms ease"
    class={isActive ? `${className} ${activeClass}` : className}
    data-zone-active={isActive || undefined}
  ></div>
{/if}
