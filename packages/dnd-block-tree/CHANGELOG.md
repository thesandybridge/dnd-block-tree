# Changelog

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
