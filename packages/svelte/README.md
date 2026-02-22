# @dnd-block-tree/svelte

[![npm version](https://img.shields.io/npm/v/@dnd-block-tree/svelte.svg)](https://www.npmjs.com/package/@dnd-block-tree/svelte)

Svelte 5 adapter for [dnd-block-tree](https://github.com/thesandybridge/dnd-block-tree) — components, state factories, and [@dnd-kit/svelte](https://dndkit.com/) integration for building hierarchical drag-and-drop interfaces.

## Installation

```bash
npm install @dnd-block-tree/svelte @dnd-kit/svelte @dnd-kit/dom svelte
```

Requires **Svelte 5.29+**, **@dnd-kit/svelte 0.3+**, and **@dnd-kit/dom 0.3+**.

## What's Included

- **Components** — `BlockTree`, `BlockTreeSSR`, `TreeRenderer`, `DropZone`, `DraggableBlock`, `DragOverlay`, `GhostPreview`, `BlockTreeDevTools`
- **State Factories** — `createBlockState`, `createTreeState`, `createBlockHistory` (runes-based)
- **Collision Bridge** — `adaptCollisionDetection` to bridge core's `CoreCollisionDetection` to @dnd-kit/svelte
- **Re-exports** — all types and utilities from `@dnd-block-tree/core`

## Quick Example

```svelte
<script lang="ts">
  import { BlockTree, type BaseBlock } from '@dnd-block-tree/svelte'

  interface MyBlock extends BaseBlock {
    type: 'section' | 'task'
    title: string
  }

  let blocks = $state<MyBlock[]>([
    { id: '1', type: 'section', title: 'Tasks', parentId: null, order: 0 },
    { id: '2', type: 'task', title: 'Do something', parentId: '1', order: 0 },
  ])
</script>

<BlockTree
  {blocks}
  containerTypes={['section']}
  onChange={(b) => blocks = b}
>
  {#snippet renderBlock({ block, children, isExpanded, onToggleExpand })}
    <div>
      {#if onToggleExpand}
        <button onclick={onToggleExpand}>{isExpanded ? '▼' : '▶'}</button>
      {/if}
      {block.title}
      {#if children}{@render children()}{/if}
    </div>
  {/snippet}
</BlockTree>
```

## Documentation

Full docs at **[blocktree.sandybridge.io](https://blocktree.sandybridge.io/docs)**.

## License

MIT
