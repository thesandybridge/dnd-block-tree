<script lang="ts">
  import { DragOverlay as DndKitDragOverlay } from '@dnd-kit/svelte'
  import type { BaseBlock } from '@dnd-block-tree/core'
  import type { Snippet } from 'svelte'

  interface Props {
    activeBlock: BaseBlock | null
    selectedCount?: number
    children?: Snippet<[BaseBlock]>
  }

  let {
    activeBlock,
    selectedCount = 0,
    children: renderContent,
  }: Props = $props()

  const showBadge = $derived(selectedCount > 1)
</script>

<DndKitDragOverlay>
  {#snippet children(source)}
    {#if activeBlock}
      <div style="position: relative;">
        {#if showBadge}
          <!-- Stacked card effect -->
          <div
            style="position: absolute; top: 4px; left: 4px; right: -4px; bottom: -4px; border-radius: 8px; border: 1px solid #d1d5db; background: #f3f4f6; opacity: 0.6; z-index: -1;"
          ></div>
          <!-- Count badge -->
          <div
            style="position: absolute; top: -8px; right: -8px; background: #3b82f6; color: white; border-radius: 50%; width: 22px; height: 22px; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; z-index: 10; box-shadow: 0 1px 3px rgba(0,0,0,0.2);"
          >
            {selectedCount}
          </div>
        {/if}
        {#if renderContent}
          {@render renderContent(activeBlock)}
        {:else}
          <div style="background: white; border: 1px solid #d1d5db; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); border-radius: 6px; padding: 12px; font-size: 14px; width: 256px; pointer-events: none;">
            <div style="color: #6b7280; text-transform: uppercase; font-size: 11px; letter-spacing: 0.05em; margin-bottom: 4px;">
              {activeBlock.type}
            </div>
            <div style="font-weight: 600; color: #1f2937;">
              Block {activeBlock.id.slice(0, 8)}
            </div>
          </div>
        {/if}
      </div>
    {/if}
  {/snippet}
</DndKitDragOverlay>
