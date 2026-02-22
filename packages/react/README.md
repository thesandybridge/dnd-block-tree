# @dnd-block-tree/react

[![npm version](https://img.shields.io/npm/v/@dnd-block-tree/react.svg)](https://www.npmjs.com/package/@dnd-block-tree/react)

React adapter for [dnd-block-tree](https://github.com/thesandybridge/dnd-block-tree) — components, hooks, and [@dnd-kit](https://dndkit.com/) integration for building hierarchical drag-and-drop interfaces.

## Installation

```bash
npm install @dnd-block-tree/core @dnd-block-tree/react @dnd-kit/core @dnd-kit/utilities
```

Requires **@dnd-block-tree/core 2+**, **React 18+**, and **@dnd-kit/core 6+**.

## What's Included

- **Components** — `BlockTree`, `BlockTreeSSR`, `TreeRenderer`, `DropZone`, `DragOverlay`
- **Hooks** — `useBlockHistory`, `useLayoutAnimation`, `useVirtualTree`, `useConfiguredSensors`
- **Collision Bridge** — `adaptCollisionDetection` to bridge core's `CoreCollisionDetection` to @dnd-kit's `CollisionDetection`
- **Re-exports** — all types and utilities from `@dnd-block-tree/core`

## Quick Example

```tsx
import { BlockTree, type BaseBlock, type BlockRenderers } from '@dnd-block-tree/react'

interface MyBlock extends BaseBlock {
  type: 'section' | 'task'
  title: string
}

const renderers: BlockRenderers<MyBlock, ['section']> = {
  section: ({ block, children, isExpanded, onToggleExpand }) => (
    <div>
      <button onClick={onToggleExpand}>{isExpanded ? '▼' : '▶'} {block.title}</button>
      {isExpanded && <div className="ml-4">{children}</div>}
    </div>
  ),
  task: ({ block }) => <div>{block.title}</div>,
}

function App() {
  const [blocks, setBlocks] = useState<MyBlock[]>(initialBlocks)
  return (
    <BlockTree
      blocks={blocks}
      renderers={renderers}
      containerTypes={['section']}
      onChange={setBlocks}
    />
  )
}
```

## Documentation

Full docs at **[blocktree.sandybridge.io](https://blocktree.sandybridge.io/docs)**.

## License

MIT
