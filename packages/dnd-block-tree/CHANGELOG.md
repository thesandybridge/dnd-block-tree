# Changelog

## 1.2.0

### Features

- **Floating DevTools panel** — `BlockTreeDevTools` is now a self-contained floating UI (like TanStack Query DevTools) instead of an embedded tab. Circular trigger button in a configurable corner opens a draggable, resizable dark card with tree state, event log, and performance metrics.
- **Built-in structure diff** — The diff view is now part of the DevTools panel, toggled via a "Diff" button in the title bar. Shows added/moved/unchanged blocks in a second column that auto-widens the panel. Accepts a `getLabel` prop for custom block labels.
- **Resizable panel** — Drag any edge or corner to resize the DevTools card (min 280×200). Toggling the diff view auto-adjusts width.
- **Tooltips throughout** — Hover any stat row, section heading, or event badge to see what it means.
- **Trigger button tooltip** — Hovering the floating button shows "dnd-block-tree DevTools" when the panel is closed.

### New Props

- `getLabel?: (block: T) => string` — Label function for the diff view (default: `block.type`)
- `initialOpen?: boolean` — Whether the panel starts open (default: `false`)
- `position?: 'bottom-left' | 'bottom-right' | 'top-left' | 'top-right'` — Corner for the trigger button
- `buttonStyle?: CSSProperties` — Custom styles for the trigger button
- `panelStyle?: CSSProperties` — Custom styles for the floating card

### Breaking Changes

- `BlockTreeDevToolsProps.className` and `BlockTreeDevToolsProps.style` removed — the component is now self-positioning with fixed layout. Use `buttonStyle` and `panelStyle` for customization.

### Docs

- New **DevTools** documentation page covering all panels, props, and usage patterns.

## 1.1.0

### Robustness

- **Cycle detection** — `getBlockDepth()` and `getSubtreeDepth()` now detect circular parentId chains and terminate instead of looping infinitely.
- **Descendant move rejection** — `reparentBlockIndex()` rejects moves that would place a block inside its own descendants, preventing corrupted tree state.
- **`validateBlockTree()` utility** — New opt-in validation function checks a `BlockIndex` for cycles, orphans (parentId references non-existent block), and stale refs (byParent lists IDs not in byId). Returns `{ valid, issues }` and warns per issue. New `TreeValidationResult` type exported.

### Performance

- **Memoized `originalIndex`** — `computeNormalizedIndex` result in `BlockTree` is now wrapped in `useMemo`, avoiding recomputation on every render when `blocks` and `orderingStrategy` haven't changed.
- **Memoized `blocksByParent`** — The parent-to-blocks map is now derived from `originalIndex` via `useMemo` instead of being rebuilt each render.
- **`TreeRenderer` memoized** — Wrapped with `React.memo` to skip re-renders when props are referentially stable.

### Accessibility

- **WAI-ARIA TreeView attributes** — Each block element now includes `aria-level`, `aria-posinset`, `aria-setsize`, `aria-expanded` (containers only), and `aria-selected`, conforming to the WAI-ARIA TreeView pattern.

### Type Safety

- **Typed collision data** — Replaced all `as unknown as` and `as { value: number }` casts in `collision.ts` with a `WeightedCollisionData` interface and typed accessor functions (`collisionValue`, `collisionLeft`).

### Fixes

- **`initialExpanded="none"` now works correctly** — Previously, containers defaulted to expanded because the expanded map was empty. Now explicitly sets all containers to `false`.

### Tests

- 38 new tests across 6 files (161 total):
  - `blocks.test.ts` — cycle detection, descendant move rejection, `validateBlockTree`
  - `TreeRenderer.test.tsx` — rendering, expandedMap, all ARIA attributes
  - `DropZone.test.tsx` — data-zone-id, self-drop hiding
  - `BlockTree.test.tsx` — rendering, `role="tree"`, `initialExpanded="none"`
  - `useBlockHistory.test.tsx` — set/undo/redo, maxSteps, no-ops
  - `useVirtualTree.test.tsx` — totalHeight, visibleRange, overscan, offsetY

## 1.0.0

Stable release. All roadmap items complete.

### Features (since 0.5.0)

- **Snapshotted collision detection** — Zone rects are frozen on drag start and re-measured via `requestAnimationFrame` after each ghost commit. Collision detection uses these snapshots instead of live DOM measurements, preventing feedback loops caused by the in-flow ghost preview shifting zone positions. New `SnapshotRectsRef` type exported.
- **Cross-depth hysteresis** — The sticky collision threshold is reduced to 25% when switching between zones at different indentation levels (detected via `left` edge comparison). Makes it responsive to drag blocks in and out of containers while preventing flickering between same-depth adjacent zones.
- **Stronger horizontal scoring** — The within-bounds horizontal factor increased from 0.05 to 0.3, so zones at different indentation levels are clearly differentiated even when both are within the pointer's horizontal range.
- **In-flow ghost preview** — Ghost preview renders in normal document flow for accurate visual layout instead of absolute positioning.

### Fixes

- Fixed feedback loop where ghost preview shifting layout caused collision detection to oscillate between zones
- Fixed difficulty dragging blocks below expanded containers (end-zone competing with parent-level zones)
- Fixed difficulty dragging blocks into the last position of a container from below
- Fixed same-parent move no-op detection in `reparentBlockIndex` (block was removed before index lookup)

### CI

- Added typecheck step to CI pipeline

## 0.5.0

### Features

- **Serialization helpers** — New `flatToNested()` and `nestedToFlat()` utility functions for converting between flat block arrays and nested tree structures. New `NestedBlock<T>` type exported.
- **Touch/mobile enhancements** — `SensorConfig` now supports `longPressDelay` (override the default 200ms touch activation) and `hapticFeedback` (trigger `navigator.vibrate()` on drag start). New `triggerHaptic()` utility exported.
- **SSR compatibility** — New `BlockTreeSSR` component provides hydration-safe rendering for Next.js App Router and other SSR environments. Renders an optional `fallback` on the server, mounts the full `BlockTree` after hydration.
- **Animation/transition support** — `AnimationConfig.expandDuration` now controls CSS transitions on expand/collapse of container children. New `useLayoutAnimation` hook provides FLIP-based reorder animations as a standalone composable.
- **Virtual scrolling** — New `virtualize` prop on `BlockTree` enables windowed rendering for large trees (1000+ blocks). Fixed item height with configurable overscan. New `useVirtualTree` hook exported for custom implementations.

## 0.4.0

### Features

- **Max depth constraint** - New `maxDepth` prop limits nesting depth. Enforced in both drag validation and programmatic APIs. `getBlockDepth()` and `getSubtreeDepth()` utility functions exported.
- **Keyboard navigation** - Accessible tree navigation via `keyboardNavigation` prop. Arrow keys traverse visible blocks, Enter/Space toggles expand/collapse, Home/End jump to first/last. Tree root gets `role="tree"` and blocks get `role="treeitem"` with roving `tabIndex`.
- **Multi-select drag** - Batch selection via `multiSelect` prop. Cmd/Ctrl+Click toggles, Shift+Click range-selects. Drag overlay shows stacked card effect with count badge. New `reparentMultipleBlocks()` utility. `BlockMoveEvent` now includes `movedIds`.
- **Undo/redo support** - New `useBlockHistory` composable hook with configurable `maxSteps`. Returns `{ blocks, set, undo, redo, canUndo, canRedo }` for easy integration.
- **Block lifecycle callbacks** - New `onBlockAdd` and `onBlockDelete` callbacks with `BlockAddEvent` and `BlockDeleteEvent` types. Delete events include all descendant IDs.

## 0.3.0

### Features

- **Mobile & touch support** - Separate activation constraints for touch vs pointer sensors. Touch uses a 200ms delay-based activation to prevent interference with scrolling, while pointer (mouse) continues using distance-based activation.
- **Overflow prevention** - Added `minWidth: 0` and `touchAction: 'none'` to tree containers and draggable blocks, preventing horizontal overflow on narrow/mobile viewports.

### Fixes

- Fixed touch drag interfering with page scrolling on mobile devices
- Fixed tree content overflowing container bounds on small screens

## 0.2.0

### Features

- **Stable drop zones** - Zones render based on original block positions, not preview state, ensuring consistent drop targets during drag
- **Ghost preview** - Semi-transparent preview shows where blocks will land without affecting zone positions
- **Depth-aware collision** - Smart algorithm prefers nested zones when cursor is at indented levels, with hysteresis to prevent flickering

### Fixes

- Fixed flickering between adjacent drop zones
- Fixed items disappearing when dragging near container boundaries
- Fixed end-zone handling for nested containers
- Fixed `extractUUID` to handle `end-` prefix

## 0.1.2

### Fixes

- CI fixes for root package-lock.json

## 0.1.0

- Initial release
