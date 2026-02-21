# Blocktree Roadmap

## High Priority

- [x] **Fractional indexing** — Opt-in ordering strategy for CRDT support. Replace integer `order` with sortable fractional keys to enable conflict-free collaborative editing without sibling reindexing.
- [x] **Plugin/middleware system** — `onBeforeMove` pipeline for the drag lifecycle. Allow consumers to intercept and transform move operations for use cases like collaborative editing, validation, and undo/redo.
- [x] **`orderingStrategy` prop** — Default to integer reindexing, swappable to fractional indexing via adapter pattern. Keep core lightweight while enabling advanced ordering.

## Medium Priority

- [x] **Undo/redo support** — Composable `useBlockHistory` hook that tracks block state history with past/future stacks.
- [x] **Keyboard navigation** — Arrow keys for traversal, enter/space for expand/collapse, Home/End for first/last. Opt-in via `keyboardNavigation` prop.
- [x] **Multi-select drag** — Cmd/Ctrl+click to toggle, Shift+click for range. Drag multiple blocks with stacked overlay. Opt-in via `multiSelect` prop.
- [x] **`onBlockDelete` / `onBlockAdd` callbacks** — Lifecycle hooks with `BlockAddEvent` and `BlockDeleteEvent` types, fired from `useBlockState`.
- [x] **Max depth constraint** — `maxDepth` prop enforced in `reparentBlockIndex` and drop zone validation. Prevents nesting beyond limit.

## Low Priority

- [x] **Virtual scrolling** — Windowed rendering for large trees (1000+ blocks) via `virtualize` prop and `useVirtualTree` hook.
- [x] **Serialization helpers** — `flatToNested` / `nestedToFlat` utility functions for flat array ↔ nested tree conversion.
- [x] **Touch/mobile sensor support** — `longPressDelay` and `hapticFeedback` options in `SensorConfig` for fine-tuned touch behavior.
- [x] **Animation/transition support** — `AnimationConfig` wired through `TreeRenderer` for expand/collapse transitions. Standalone `useLayoutAnimation` hook for FLIP-based reorder animations.
- [x] **SSR compatibility** — `BlockTreeSSR` hydration-safe wrapper component with optional `fallback` prop.
