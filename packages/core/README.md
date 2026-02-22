# @dnd-block-tree/core

[![npm version](https://img.shields.io/npm/v/@dnd-block-tree/core.svg)](https://www.npmjs.com/package/@dnd-block-tree/core)

Framework-agnostic core for [dnd-block-tree](https://github.com/thesandybridge/dnd-block-tree) — types, collision detection, reducers, tree factory, and utilities with zero dependencies.

## Installation

```bash
npm install @dnd-block-tree/core
```

No peer dependencies required. Works in any JavaScript runtime (Node.js, Deno, Bun, browsers).

## What's Included

- **Types** — `BaseBlock`, `BlockIndex`, event types, config types
- **Tree Factory** — `createBlockTree()` for stateful tree instances with event-driven updates
- **Reducers** — `blockReducer`, `expandReducer`, `historyReducer` for immutable state management
- **Collision Detection** — `weightedVerticalCollision`, `closestCenterCollision`, `createStickyCollision` (framework-agnostic `CoreCollisionDetection` type)
- **Tree Utilities** — `computeNormalizedIndex`, `buildOrderedBlocks`, `reparentBlockIndex`, `getDescendantIds`, `getBlockDepth`, `validateBlockTree`, and more
- **Serialization** — `flatToNested` / `nestedToFlat` for flat array ↔ nested tree conversion
- **Fractional Indexing** — `generateKeyBetween`, `initFractionalOrder` for CRDT-compatible ordering
- **Event Emitter** — typed `EventEmitter` class for subscribe/unsubscribe patterns

## Quick Example

```typescript
import { createBlockTree, type BaseBlock } from '@dnd-block-tree/core'

interface Task extends BaseBlock {
  type: 'section' | 'task'
  title: string
}

const tree = createBlockTree<Task>({
  initialBlocks: [
    { id: '1', type: 'section', title: 'Tasks', parentId: null, order: 0 },
    { id: '2', type: 'task', title: 'Build app', parentId: '1', order: 0 },
  ],
  containerTypes: ['section'],
})

tree.on('blocks:change', (blocks) => {
  console.log('Tree updated:', blocks)
})

tree.addBlock('task', '1') // Add a task to the section
tree.moveBlock('2', 'after-1') // Move task to root level
tree.toggleExpand('1') // Collapse the section

tree.destroy() // Clean up listeners
```

## When to Use Core

- Server-side tree manipulation (no DOM or React needed)
- Non-React frameworks (Vue, Svelte, vanilla JS)
- Testing tree logic without UI dependencies
- Shared tree operations between client and server

For React applications, use [`@dnd-block-tree/react`](https://www.npmjs.com/package/@dnd-block-tree/react) which wraps this package with React components and @dnd-kit integration.

## Documentation

Full docs at **[blocktree.sandybridge.io](https://blocktree.sandybridge.io/docs)**.

## License

MIT
