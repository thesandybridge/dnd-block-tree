# dnd-block-tree

[![CI](https://github.com/thesandybridge/dnd-block-tree/actions/workflows/ci.yml/badge.svg)](https://github.com/thesandybridge/dnd-block-tree/actions/workflows/ci.yml)
[![demo](https://img.shields.io/badge/demo-live-brightgreen.svg)](https://blocktree.sandybridge.io)

A type-safe library for building hierarchical drag-and-drop interfaces. The framework-agnostic core (`@dnd-block-tree/core`) provides tree logic, reducers, and utilities with zero dependencies. Framework adapters for React, Svelte 5, and vanilla JS/TS add drag-and-drop integration on top.

## Packages

| Package | Version | Description |
|---------|---------|-------------|
| [`@dnd-block-tree/core`](./packages/core) | [![npm](https://img.shields.io/npm/v/@dnd-block-tree/core.svg)](https://www.npmjs.com/package/@dnd-block-tree/core) | Framework-agnostic core — types, collision detection, reducers, tree factory, utilities. Zero dependencies. |
| [`@dnd-block-tree/react`](./packages/react) | [![npm](https://img.shields.io/npm/v/@dnd-block-tree/react.svg)](https://www.npmjs.com/package/@dnd-block-tree/react) | React adapter — components, hooks, @dnd-kit/core integration. |
| [`@dnd-block-tree/svelte`](./packages/svelte) | [![npm](https://img.shields.io/npm/v/@dnd-block-tree/svelte.svg)](https://www.npmjs.com/package/@dnd-block-tree/svelte) | Svelte 5 adapter — components, runes-based state, @dnd-kit/svelte integration. |
| [`@dnd-block-tree/vanilla`](./packages/vanilla) | [![npm](https://img.shields.io/npm/v/@dnd-block-tree/vanilla.svg)](https://www.npmjs.com/package/@dnd-block-tree/vanilla) | Vanilla JS/TS adapter — headless controller + optional default renderer. Zero framework deps. |

Choose the adapter for your framework, or use `@dnd-block-tree/core` directly for headless tree operations (server-side manipulation, testing, custom integrations).

## Installation

### React

```bash
npm install @dnd-block-tree/react @dnd-kit/core @dnd-kit/utilities
```

Requires **React 18+** and **@dnd-kit/core 6+**.

### Svelte 5

```bash
npm install @dnd-block-tree/svelte @dnd-kit/svelte @dnd-kit/dom svelte
```

Requires **Svelte 5.29+**, **@dnd-kit/svelte 0.3+**, and **@dnd-kit/dom 0.3+**.

### Vanilla JS/TS

```bash
npm install @dnd-block-tree/vanilla
```

Only dependency is `@dnd-block-tree/core`. No framework peer dependencies.

## Quick Start

### React

```tsx
import { BlockTree, type BaseBlock, type BlockRenderers } from '@dnd-block-tree/react'

interface MyBlock extends BaseBlock {
  type: 'section' | 'task' | 'note'
  title: string
}

const CONTAINER_TYPES = ['section'] as const

const renderers: BlockRenderers<MyBlock, typeof CONTAINER_TYPES> = {
  section: (props) => <SectionBlock {...props} />,
  task: (props) => <TaskBlock {...props} />,
  note: (props) => <NoteBlock {...props} />,
}

function App() {
  const [blocks, setBlocks] = useState<MyBlock[]>(initialBlocks)

  return (
    <BlockTree
      blocks={blocks}
      renderers={renderers}
      containerTypes={CONTAINER_TYPES}
      onChange={setBlocks}
    />
  )
}
```

### Svelte 5

```svelte
<script lang="ts">
  import { BlockTree, type BaseBlock } from '@dnd-block-tree/svelte'

  let blocks = $state([
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

### Vanilla JS/TS

```typescript
import { createBlockTreeController, createDefaultRenderer, createElement } from '@dnd-block-tree/vanilla'

const controller = createBlockTreeController({
  initialBlocks: [
    { id: '1', type: 'folder', label: 'Documents', parentId: null, order: 0 },
    { id: '2', type: 'file', label: 'readme.txt', parentId: '1', order: 0 },
  ],
  containerTypes: ['folder'],
})

const container = document.getElementById('tree')!

createDefaultRenderer(controller, {
  container,
  renderBlock: (block, ctx) => {
    const el = createElement('div', { class: 'block' })
    el.textContent = block.label
    if (ctx.children) el.appendChild(ctx.children)
    return el
  },
})

controller.mount(container)
```

## Features

- **Framework-Agnostic Core** — zero-dependency headless core with tree factory, reducers, and utilities ([docs](https://blocktree.sandybridge.io/docs/core))
- **Stable Drop Zones** — zones render from original positions, not preview state
- **Ghost Preview** — in-flow semi-transparent preview with accurate layout
- **Snapshotted Collision** — frozen zone rects prevent layout-shift feedback loops
- **Depth-Aware Collision** — prefers nested zones at indented cursor levels
- **Mobile & Touch** — long-press activation, haptic feedback, touch-optimized sensors ([docs](https://blocktree.sandybridge.io/docs/touch-mobile))
- **Keyboard Navigation** — arrow keys, Home/End, Enter/Space with ARIA roles ([docs](https://blocktree.sandybridge.io/docs/keyboard-navigation))
- **Multi-Select Drag** — Cmd/Ctrl+Click and Shift+Click with batch drag ([docs](https://blocktree.sandybridge.io/docs/multi-select))
- **Undo/Redo** — composable `useBlockHistory` hook ([docs](https://blocktree.sandybridge.io/docs/undo-redo))
- **Max Depth** — limit nesting via `maxDepth` prop ([docs](https://blocktree.sandybridge.io/docs/constraints))
- **Move Middleware** — `onBeforeMove` to validate, transform, or cancel moves ([docs](https://blocktree.sandybridge.io/docs/constraints))
- **Fractional Indexing** — CRDT-compatible ordering with `orderingStrategy: 'fractional'` ([docs](https://blocktree.sandybridge.io/docs/fractional-indexing))
- **Serialization** — `flatToNested` / `nestedToFlat` converters ([docs](https://blocktree.sandybridge.io/docs/serialization))
- **SSR Compatible** — `BlockTreeSSR` for hydration-safe rendering ([docs](https://blocktree.sandybridge.io/docs/ssr))
- **Animation** — CSS expand/collapse transitions + FLIP reorder animations ([docs](https://blocktree.sandybridge.io/docs/animation))
- **Virtual Scrolling** — windowed rendering for 1000+ blocks ([docs](https://blocktree.sandybridge.io/docs/virtual-scrolling))
- **Custom Collision Detection** — pluggable algorithms with sticky hysteresis ([docs](https://blocktree.sandybridge.io/docs/collision-detection))

## Documentation

Full API reference, guides, and examples at **[blocktree.sandybridge.io](https://blocktree.sandybridge.io/docs)**.

## Demo

Check out the [live demo](https://blocktree.sandybridge.io) with two example use cases:

- **Productivity** — sections, tasks, and notes with undo/redo, max depth, keyboard nav
- **File System** — folders and files

## Built With

- [dnd-kit](https://dndkit.com/) — drag and drop toolkit (React via @dnd-kit/core, Svelte via @dnd-kit/svelte)
- [Turborepo](https://turbo.build/) — monorepo build system
- React 18+ / React 19
- Svelte 5 (runes, `{@attach}`, `{#snippet}`)
- TypeScript

## License

MIT
