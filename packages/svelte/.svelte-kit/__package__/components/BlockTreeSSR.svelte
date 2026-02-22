<script lang="ts">
  import { onMount } from 'svelte'
  import type { Snippet } from 'svelte'

  interface Props {
    children: Snippet
    fallback?: Snippet
  }

  let { children, fallback }: Props = $props()
  let mounted = $state(false)

  onMount(() => {
    mounted = true
  })
</script>

{#if mounted}
  {@render children()}
{:else if fallback}
  {@render fallback()}
{/if}
