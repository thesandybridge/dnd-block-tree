# dnd-block-tree

[![npm version](https://img.shields.io/npm/v/dnd-block-tree.svg)](https://www.npmjs.com/package/dnd-block-tree)
[![CI](https://github.com/thesandybridge/dnd-block-tree/actions/workflows/ci.yml/badge.svg)](https://github.com/thesandybridge/dnd-block-tree/actions/workflows/ci.yml)
[![demo](https://img.shields.io/badge/demo-live-brightgreen.svg)](https://blocktree.sandybridge.io)

A type-safe library for building hierarchical drag-and-drop interfaces. The framework-agnostic core (`@dnd-block-tree/core`) provides tree logic, reducers, and utilities with zero dependencies. The React adapter adds components, hooks, and @dnd-kit integration on top.

## Packages

| Package | Description |
|---------|-------------|
| [`@dnd-block-tree/core`](./packages/core) | Framework-agnostic core — types, collision detection, reducers, tree factory, utilities. Zero dependencies. |
| [`@dnd-block-tree/react`](./packages/react) | React adapter — components, hooks, @dnd-kit integration. |

Use `@dnd-block-tree/react` for the full React API, or `@dnd-block-tree/core` directly for framework-agnostic tree operations (server-side manipulation, testing, non-React frameworks).

## Installation

```bash
npm install @dnd-block-tree/react @dnd-kit/core @dnd-kit/utilities
```

Requires **React 18+** and **@dnd-kit/core 6+**.

## Quick Start

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

- [dnd-kit](https://dndkit.com/) — drag and drop toolkit for React
- [Turborepo](https://turbo.build/) — monorepo build system
- React 18+ / React 19
- TypeScript

## License

MIT
