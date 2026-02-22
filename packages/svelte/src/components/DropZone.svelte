<script lang="ts">
  import { createDroppable } from '@dnd-kit/svelte'
  import { extractUUID } from '@dnd-block-tree/core'

  interface Props {
    id: string
    parentId: string | null
    onHover: (zoneId: string, parentId: string | null) => void
    activeId: string | null
    height?: number
    class?: string
    activeClass?: string
  }

  let {
    id,
    parentId,
    onHover,
    activeId,
    height = 4,
    class: className = '',
    activeClass = '',
  }: Props = $props()

  const droppable = createDroppable({ get id() { return id } })

  // Hide "into-" zones for the active block (can't drop a container into itself)
  const zoneBlockId = $derived(extractUUID(id))
  const isIntoZone = $derived(id.startsWith('into-'))
  const shouldHide = $derived(isIntoZone && activeId != null && zoneBlockId === activeId)

  // Fire hover callback when drop target is active
  $effect(() => {
    if (droppable.isDropTarget) {
      onHover(id, parentId)
    }
  })
</script>

{#if !shouldHide}
  <div
    {@attach droppable.attach}
    data-zone-id={id}
    data-parent-id={parentId ?? ''}
    style:height="{droppable.isDropTarget ? height * 2 : height}px"
    style:transition="height 150ms ease, background-color 150ms ease"
    class={droppable.isDropTarget ? `${className} ${activeClass}` : className}
    data-zone-active={droppable.isDropTarget || undefined}
  ></div>
{/if}
