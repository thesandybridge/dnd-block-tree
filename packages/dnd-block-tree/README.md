# dnd-block-tree

[![npm version](https://img.shields.io/npm/v/dnd-block-tree.svg)](https://www.npmjs.com/package/dnd-block-tree)
[![npm downloads](https://img.shields.io/npm/dm/dnd-block-tree.svg)](https://www.npmjs.com/package/dnd-block-tree)
[![bundle size](https://img.shields.io/bundlephobia/minzip/dnd-block-tree)](https://bundlephobia.com/package/dnd-block-tree)
[![CI](https://github.com/thesandybridge/dnd-block-tree/actions/workflows/ci.yml/badge.svg)](https://github.com/thesandybridge/dnd-block-tree/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)
[![demo](https://img.shields.io/badge/demo-live-brightgreen.svg)](https://dnd-block-tree.vercel.app)

A headless React library for building hierarchical drag-and-drop interfaces. Bring your own components, we handle the complexity.

## Features

- **Stable Drop Zones** - Zones render based on original block positions, not preview state, ensuring consistent drop targets during drag
- **Ghost Preview** - Semi-transparent preview shows where blocks will land without affecting zone positions
- **Depth-Aware Collision** - Smart algorithm prefers nested zones when cursor is at indented levels, with hysteresis to prevent flickering
- **8px Activation Distance** - Prevents accidental drags. Pointer must move 8px before drag starts, allowing normal clicks
- **Snapshot-Based Computation** - State captured at drag start. All preview computations use snapshot, ensuring consistent behavior
- **Debounced Preview** - 150ms debounced virtual state for smooth drag previews without jitter
- **Customizable Drag Rules** - `canDrag` and `canDrop` filters for fine-grained control over drag behavior

## Installation

```bash
npm install dnd-block-tree
```

## Quick Start

```tsx
import { BlockTree, type BaseBlock, type BlockRenderers } from 'dnd-block-tree'

// Define your block type
interface MyBlock extends BaseBlock {
  type: 'section' | 'task' | 'note'
  title: string
}

// Define which types can have children
const CONTAINER_TYPES = ['section'] as const

// Create renderers for each block type
const renderers: BlockRenderers<MyBlock, typeof CONTAINER_TYPES> = {
  section: (props) => <SectionBlock {...props} />,  // Gets ContainerRendererProps
  task: (props) => <TaskBlock {...props} />,        // Gets BlockRendererProps
  note: (props) => <NoteBlock {...props} />,        // Gets BlockRendererProps
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

## API

### BlockTree Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `blocks` | `T[]` | required | Array of blocks to render |
| `renderers` | `BlockRenderers<T, C>` | required | Map of block types to render functions |
| `containerTypes` | `readonly string[]` | `[]` | Block types that can have children |
| `onChange` | `(blocks: T[]) => void` | - | Called when blocks are reordered |
| `dragOverlay` | `(block: T) => ReactNode` | - | Custom drag overlay renderer |
| `activationDistance` | `number` | `8` | Pixels to move before drag starts |
| `previewDebounce` | `number` | `150` | Debounce delay for preview updates |
| `showDropPreview` | `boolean` | `true` | Show live preview of block at drop position |
| `canDrag` | `(block: T) => boolean` | - | Filter which blocks can be dragged |
| `canDrop` | `(block, zone, target) => boolean` | - | Filter valid drop targets |
| `className` | `string` | - | Root container class |
| `dropZoneClassName` | `string` | - | Drop zone class |
| `dropZoneActiveClassName` | `string` | - | Active drop zone class |
| `indentClassName` | `string` | - | Nested children indent class |

### Types

#### BaseBlock

All blocks must extend `BaseBlock`:

```typescript
interface BaseBlock {
  id: string
  type: string
  parentId: string | null
  order: number
}
```

#### BlockRendererProps

Props passed to non-container block renderers:

```typescript
interface BlockRendererProps<T extends BaseBlock> {
  block: T
  children?: ReactNode
  isDragging?: boolean
  isOver?: boolean
  depth: number
}
```

#### ContainerRendererProps

Props passed to container block renderers (extends BlockRendererProps):

```typescript
interface ContainerRendererProps<T extends BaseBlock> extends BlockRendererProps<T> {
  children: ReactNode
  isExpanded: boolean
  onToggleExpand: () => void
}
```

## Type Safety

The library provides automatic type inference for container vs non-container renderers:

```tsx
const CONTAINER_TYPES = ['section'] as const  // Must use `as const`

const renderers: BlockRenderers<MyBlock, typeof CONTAINER_TYPES> = {
  // TypeScript knows 'section' renderer gets ContainerRendererProps
  section: (props) => {
    const { isExpanded, onToggleExpand } = props  // Available!
    return <div>...</div>
  },
  // TypeScript knows 'task' renderer gets BlockRendererProps
  task: (props) => {
    // props.isExpanded would be a type error here
    return <div>...</div>
  },
}
```

## Utilities

The library exports several utility functions:

```typescript
import {
  computeNormalizedIndex,  // Convert flat array to normalized index
  buildOrderedBlocks,      // Convert index back to ordered array
  reparentBlockIndex,      // Move a block to a new position
  generateId,              // Generate unique block IDs
} from 'dnd-block-tree'
```

## Demo

Check out the [live demo](https://dnd-block-tree.vercel.app) to see the library in action with two example use cases:

- **Productivity** - Sections, tasks, and notes
- **File System** - Folders and files

## Built With

- [dnd-kit](https://dndkit.com/) - Modern drag and drop toolkit for React
- React 18+
- TypeScript

## License

MIT
