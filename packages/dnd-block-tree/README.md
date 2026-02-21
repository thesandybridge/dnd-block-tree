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
- **Mobile & Touch Support** - Separate touch/pointer activation constraints prevent interference with scrolling on mobile devices
- **Snapshot-Based Computation** - State captured at drag start. All preview computations use snapshot, ensuring consistent behavior
- **Debounced Preview** - 150ms debounced virtual state for smooth drag previews without jitter
- **Customizable Drag Rules** - `canDrag` and `canDrop` filters for fine-grained control over drag behavior
- **Max Depth Constraint** - Limit nesting depth via `maxDepth` prop, enforced in both drag validation and programmatic APIs
- **Keyboard Navigation** - Arrow key traversal, Enter/Space to expand/collapse, Home/End to jump. Opt-in via `keyboardNavigation` prop
- **Multi-Select Drag** - Cmd/Ctrl+Click and Shift+Click selection with batch drag. Opt-in via `multiSelect` prop
- **Undo/Redo** - Composable `useBlockHistory` hook with past/future stacks for state history management
- **Lifecycle Callbacks** - `onBlockAdd`, `onBlockDelete`, `onBlockMove`, `onBeforeMove` middleware, and more
- **Fractional Indexing** - Opt-in CRDT-compatible ordering via `orderingStrategy: 'fractional'`

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
| `collisionDetection` | `CollisionDetection` | sticky | Custom collision detection algorithm (from `@dnd-kit/core`) |
| `sensors` | `SensorConfig` | - | Sensor configuration (`{ activationDistance, activationDelay, tolerance }`) |
| `maxDepth` | `number` | - | Maximum nesting depth (1 = flat, 2 = one level, etc.) |
| `keyboardNavigation` | `boolean` | `false` | Enable keyboard navigation with arrow keys |
| `multiSelect` | `boolean` | `false` | Enable multi-select with Cmd/Ctrl+Click and Shift+Click |
| `selectedIds` | `Set<string>` | - | Externally-controlled selected IDs (for multi-select) |
| `onSelectionChange` | `(ids: Set<string>) => void` | - | Called when selection changes |
| `orderingStrategy` | `'integer' \| 'fractional'` | `'integer'` | Sibling ordering strategy |
| `initialExpanded` | `string[] \| 'all' \| 'none'` | `'all'` | Initially expanded container IDs |
| `className` | `string` | - | Root container class |
| `dropZoneClassName` | `string` | - | Drop zone class |
| `dropZoneActiveClassName` | `string` | - | Active drop zone class |
| `indentClassName` | `string` | - | Nested children indent class |

### Callbacks

| Callback | Type | Description |
|----------|------|-------------|
| `onDragStart` | `(event: DragStartEvent<T>) => boolean \| void` | Called when drag starts. Return `false` to prevent. |
| `onDragMove` | `(event: DragMoveEvent<T>) => void` | Called during drag movement (debounced) |
| `onDragEnd` | `(event: DragEndEvent<T>) => void` | Called when drag ends |
| `onDragCancel` | `(event: DragEndEvent<T>) => void` | Called when drag is cancelled |
| `onBeforeMove` | `(op: MoveOperation<T>) => MoveOperation<T> \| false \| void` | Middleware to transform or cancel moves |
| `onBlockMove` | `(event: BlockMoveEvent<T>) => void` | Called after a block is moved |
| `onBlockAdd` | `(event: BlockAddEvent<T>) => void` | Called after a block is added |
| `onBlockDelete` | `(event: BlockDeleteEvent<T>) => void` | Called after a block is deleted |
| `onExpandChange` | `(event: ExpandChangeEvent<T>) => void` | Called when expand/collapse changes |
| `onHoverChange` | `(event: HoverChangeEvent<T>) => void` | Called when hover zone changes |

### Event Types

All event types are exported and generic over your block type `T`.

#### DragStartEvent

```typescript
interface DragStartEvent<T> {
  block: T
  blockId: string
}
```

#### DragMoveEvent

```typescript
interface DragMoveEvent<T> {
  block: T
  blockId: string
  overZone: string | null       // Current hover zone ID
  coordinates: { x: number; y: number }
}
```

#### DragEndEvent

```typescript
interface DragEndEvent<T> {
  block: T
  blockId: string
  targetZone: string | null     // Zone where block was dropped
  cancelled: boolean
}
```

#### BlockMoveEvent

```typescript
interface BlockMoveEvent<T> {
  block: T
  from: BlockPosition           // { parentId, index }
  to: BlockPosition
  blocks: T[]                   // Full block array after the move
  movedIds: string[]            // All moved block IDs (for multi-select)
}
```

#### MoveOperation

Passed to the `onBeforeMove` middleware:

```typescript
interface MoveOperation<T> {
  block: T
  from: BlockPosition
  targetZone: string            // Drop zone ID (e.g. "after-uuid", "into-uuid")
}
```

#### BlockAddEvent

```typescript
interface BlockAddEvent<T> {
  block: T
  parentId: string | null
  index: number
}
```

#### BlockDeleteEvent

```typescript
interface BlockDeleteEvent<T> {
  block: T
  deletedIds: string[]          // Block + all descendant IDs
  parentId: string | null
}
```

#### ExpandChangeEvent

```typescript
interface ExpandChangeEvent<T> {
  block: T
  blockId: string
  expanded: boolean
}
```

#### HoverChangeEvent

```typescript
interface HoverChangeEvent<T> {
  zoneId: string | null
  zoneType: 'before' | 'after' | 'into' | null
  targetBlock: T | null
}
```

### Types

#### BaseBlock

All blocks must extend `BaseBlock`:

```typescript
interface BaseBlock {
  id: string
  type: string
  parentId: string | null
  order: number | string  // number for integer ordering, string for fractional
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

## Undo/Redo

The `useBlockHistory` hook provides undo/redo support as a composable layer on top of `BlockTree`:

```tsx
import { BlockTree, useBlockHistory } from 'dnd-block-tree'

function App() {
  const { blocks, set, undo, redo, canUndo, canRedo } = useBlockHistory<MyBlock>(initialBlocks, {
    maxSteps: 50,  // optional, default 50
  })

  return (
    <>
      <div>
        <button onClick={undo} disabled={!canUndo}>Undo</button>
        <button onClick={redo} disabled={!canRedo}>Redo</button>
      </div>
      <BlockTree blocks={blocks} onChange={set} ... />
    </>
  )
}
```

## Keyboard Navigation

Enable accessible tree navigation with the `keyboardNavigation` prop:

```tsx
<BlockTree keyboardNavigation blocks={blocks} ... />
```

| Key | Action |
|-----|--------|
| Arrow Down | Focus next visible block |
| Arrow Up | Focus previous visible block |
| Arrow Right | Expand container, or focus first child |
| Arrow Left | Collapse container, or focus parent |
| Enter / Space | Toggle expand/collapse |
| Home | Focus first block |
| End | Focus last block |

Blocks receive `data-block-id` and `tabIndex` attributes for focus management, and the tree root gets `role="tree"`.

## Multi-Select Drag

Enable batch selection and drag with the `multiSelect` prop:

```tsx
<BlockTree multiSelect blocks={blocks} ... />
```

- **Cmd/Ctrl+Click** toggles a single block in the selection
- **Shift+Click** range-selects between the last clicked and current block
- **Plain click** clears selection and selects only the clicked block
- Dragging a selected block moves all selected blocks, preserving relative order
- The drag overlay shows a stacked card effect with a count badge

You can also control selection externally via `selectedIds` and `onSelectionChange`.

## Max Depth

Limit nesting depth to prevent deeply nested trees:

```tsx
<BlockTree maxDepth={2} blocks={blocks} ... />
```

- `maxDepth={1}` - flat list, no nesting allowed
- `maxDepth={2}` - blocks can nest one level inside containers
- When a move would exceed the limit, the drop zone is rejected and the move is a no-op

## Move Middleware (`onBeforeMove`)

The `onBeforeMove` callback intercepts moves before they are committed. You can use it to validate, transform, or cancel moves:

```tsx
<BlockTree
  blocks={blocks}
  onChange={setBlocks}
  onBeforeMove={(operation) => {
    // Cancel: return false to prevent the move
    if (operation.block.type === 'locked') {
      return false
    }

    // Transform: change the target zone
    if (operation.targetZone.startsWith('into-') && someCondition) {
      return { ...operation, targetZone: `after-${extractBlockId(operation.targetZone)}` }
    }

    // Allow: return void/undefined to proceed as-is
  }}
/>
```

The middleware receives a `MoveOperation` with the block, its original position (`from`), and the target drop zone. Returning:
- `false` cancels the move entirely
- A modified `MoveOperation` transforms the move (e.g. redirect to a different zone)
- `void` / `undefined` allows the move as-is

## Fractional Indexing

By default, siblings are reindexed `0, 1, 2, ...` on every move. For collaborative or CRDT-compatible scenarios, use fractional indexing:

```tsx
import { BlockTree, initFractionalOrder } from 'dnd-block-tree'

// Convert existing blocks to fractional ordering
const [blocks, setBlocks] = useState(() => initFractionalOrder(initialBlocks))

<BlockTree
  blocks={blocks}
  onChange={setBlocks}
  orderingStrategy="fractional"
/>
```

With fractional ordering, only the moved block receives a new `order` value (a lexicographically sortable string key). Siblings are never reindexed, making it safe for concurrent edits.

Related utilities:

```typescript
import {
  generateKeyBetween,     // Generate a key between two existing keys
  generateNKeysBetween,   // Generate N keys between two existing keys
  generateInitialKeys,    // Generate N evenly-spaced initial keys
  initFractionalOrder,    // Convert integer-ordered blocks to fractional
  compareFractionalKeys,  // Compare two fractional keys
} from 'dnd-block-tree'
```

## Collision Detection

The library ships with three collision detection strategies:

```typescript
import {
  weightedVerticalCollision,  // Default: edge-distance based, depth-aware
  closestCenterCollision,     // Simple closest-center algorithm
  createStickyCollision,      // Wraps any strategy with hysteresis to prevent flickering
} from 'dnd-block-tree'

// Use a custom collision strategy
<BlockTree collisionDetection={closestCenterCollision} ... />

// Or use the sticky wrapper with a custom threshold (px)
const collision = createStickyCollision(20)
<BlockTree collisionDetection={collision} ... />
```

You can also pass any `CollisionDetection` function from `@dnd-kit/core`.

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

The library exports utility functions for tree manipulation, ID generation, and zone parsing:

```typescript
import {
  // Tree operations
  computeNormalizedIndex,     // Convert flat array to { byId, byParent } index
  buildOrderedBlocks,         // Convert index back to ordered flat array
  reparentBlockIndex,         // Move a single block to a new position
  reparentMultipleBlocks,     // Move multiple blocks preserving relative order
  getDescendantIds,           // Get all descendant IDs of a block (Set)
  deleteBlockAndDescendants,  // Remove a block and all its descendants from index
  getBlockDepth,              // Compute depth of a block (root = 1)
  getSubtreeDepth,            // Max depth of a subtree (leaf = 1)

  // ID / zone helpers
  generateId,                 // Generate unique block IDs
  extractUUID,                // Extract block ID from zone ID string
  getDropZoneType,            // Parse zone type: 'before' | 'after' | 'into'
  extractBlockId,             // Extract block ID from zone ID (alias)

  // Fractional indexing
  generateKeyBetween,         // Generate a fractional key between two keys
  generateNKeysBetween,       // Generate N keys between two existing keys
  generateInitialKeys,        // Generate N evenly-spaced initial keys
  initFractionalOrder,        // Convert integer-ordered blocks to fractional
  compareFractionalKeys,      // Compare two fractional keys

  // Collision detection
  weightedVerticalCollision,  // Edge-distance collision, depth-aware
  closestCenterCollision,     // Simple closest-center collision
  createStickyCollision,      // Hysteresis wrapper to prevent flickering
} from 'dnd-block-tree'
```

## Demo

Check out the [live demo](https://dnd-block-tree.vercel.app) to see the library in action with two example use cases:

- **Productivity** - Sections, tasks, and notes with undo/redo, max depth control, and keyboard navigation
- **File System** - Folders and files

## Built With

- [dnd-kit](https://dndkit.com/) - Modern drag and drop toolkit for React
- React 18+ / React 19
- TypeScript

## License

MIT
