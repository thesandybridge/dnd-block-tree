<script lang="ts">
  import type { Snippet } from 'svelte'

  interface Props {
    children: Snippet
  }

  let { children }: Props = $props()
</script>

<div data-dnd-ghost style="opacity: 0.5; pointer-events: none;">
  {@render children()}
</div>
