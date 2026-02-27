<script lang="ts">
  import type { BaseBlock } from '@dnd-block-tree/core'

  interface Props {
    blocks: BaseBlock[]
    expandedMap: Record<string, boolean>
    activeId?: string | null
    hoverZone?: string | null
    open?: boolean
  }

  let {
    blocks,
    expandedMap,
    activeId = null,
    hoverZone = null,
    open = false,
  }: Props = $props()

  let isOpen = $state(false)

  $effect.pre(() => {
    isOpen = open
  })
</script>

{#if isOpen}
  <div
    style="position: fixed; bottom: 10px; right: 10px; width: 360px; max-height: 400px; overflow: auto; background: #1f2937; color: #e5e7eb; font-family: monospace; font-size: 12px; padding: 12px; border-radius: 8px; z-index: 9999; box-shadow: 0 4px 16px rgba(0,0,0,0.3);"
  >
    <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
      <strong>BlockTree DevTools</strong>
      <button onclick={() => isOpen = false} style="background: none; border: none; color: #9ca3af; cursor: pointer;">x</button>
    </div>
    <div style="margin-bottom: 8px;">
      <span style="color: #9ca3af;">Blocks:</span> {blocks.length}
      {#if activeId}
        <span style="color: #fbbf24; margin-left: 8px;">Dragging: {activeId.slice(0, 8)}</span>
      {/if}
      {#if hoverZone}
        <span style="color: #34d399; margin-left: 8px;">Hover: {hoverZone}</span>
      {/if}
    </div>
    <pre style="margin: 0; white-space: pre-wrap; font-size: 11px;">{JSON.stringify(blocks.map(b => ({
      id: b.id.slice(0, 8),
      type: b.type,
      parentId: b.parentId?.slice(0, 8) ?? null,
      order: b.order,
    })), null, 2)}</pre>
  </div>
{:else}
  <button
    onclick={() => isOpen = true}
    style="position: fixed; bottom: 10px; right: 10px; background: #1f2937; color: #e5e7eb; border: none; border-radius: 8px; padding: 8px 12px; font-size: 12px; cursor: pointer; z-index: 9999; box-shadow: 0 2px 8px rgba(0,0,0,0.2);"
  >
    DevTools
  </button>
{/if}
