# @dnd-block-tree/vanilla

[![npm version](https://img.shields.io/npm/v/@dnd-block-tree/vanilla.svg)](https://www.npmjs.com/package/@dnd-block-tree/vanilla)

Vanilla JS/TS adapter for [dnd-block-tree](https://github.com/thesandybridge/dnd-block-tree) — zero framework dependencies. A two-layer architecture with a headless controller for state management and an optional default renderer for automatic DOM updates.

## Installation

```bash
npm install @dnd-block-tree/core @dnd-block-tree/vanilla
```

Requires **@dnd-block-tree/core 2+**. No framework peer dependencies.

## What's Included

- **Headless Controller** — `createBlockTreeController` manages all tree state, drag logic, sensors, and events without touching the DOM
- **Default Renderer** — `createDefaultRenderer` subscribes to controller events and automatically builds/updates the DOM
- **Sensors** — pointer (mouse), touch (long-press + haptic), and keyboard navigation
- **Collision Bridge** — DOM rect measurement and collision detection against snapshotted zones
- **History** — opt-in undo/redo via `controller.enableHistory()`
- **Layout Animation** — FLIP-based position animation for reorders
- **Virtual Scroller** — windowed rendering for large trees

## Quick Example

```typescript
import {
  createBlockTreeController,
  createDefaultRenderer,
  createElement,
  type BaseBlock,
} from '@dnd-block-tree/vanilla'

interface MyBlock extends BaseBlock {
  type: 'folder' | 'file'
  label: string
}

const controller = createBlockTreeController<MyBlock>({
  initialBlocks: [
    { id: '1', type: 'folder', label: 'Documents', parentId: null, order: 0 },
    { id: '2', type: 'file', label: 'readme.txt', parentId: '1', order: 0 },
  ],
  containerTypes: ['folder'],
})

const container = document.getElementById('tree')!

const renderer = createDefaultRenderer(controller, {
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

## Data Attributes

The renderer sets data attributes for CSS styling:

| Attribute | Element | Description |
|-----------|---------|-------------|
| `data-block-id` | Block | Block's unique ID |
| `data-block-type` | Block | Block's type string |
| `data-depth` | Block | Nesting depth (0-based) |
| `data-dragging` | Block | Present when being dragged |
| `data-selected` | Block | Present when selected |
| `data-zone-id` | Drop zone | Zone identifier |
| `data-zone-active` | Drop zone | Present on active hover zone |
| `data-drag-overlay` | Overlay | Floating drag ghost |
| `data-dnd-ghost` | Ghost | Semi-transparent preview |

## Documentation

Full docs at **[blocktree.sandybridge.io](https://blocktree.sandybridge.io/docs)**.

## License

MIT
