# @dnd-block-tree/vanilla

## 2.4.1

### Patch Changes

- 13628ec: Fix FLIP animation smoothness and reduce DOM flicker in default renderer.

  - Replace double-requestAnimationFrame FLIP pattern with forced reflow for seamless layout transitions
  - Add keyed element cache to default renderer — leaf block DOM nodes are reused across renders when data hasn't changed, preventing CSS transition resets and visual flicker

## 2.4.0

### Minor Changes

- 3561cf4: Add className-based styling options and drop zone highlighting to default renderer.

  **New features:**

  - `containerTypes` option on `DefaultRendererOptions` (previously read from tree internals and always returned empty)
  - `dropZoneClassName` / `dropZoneActiveClassName` for CSS-based drop zone styling
  - `rootClassName` / `indentClassName` for tree structure styling
  - Drop zone highlighting via `drag:statechange` event subscription
  - `drag:statechange` emitted on hover zone changes during drag

  **Bug fixes:**

  - Fix `containerTypes` never being exposed from tree instance, causing children to never render
  - Fix `classList.add()` throwing on space-separated class strings
  - Fix drag overlay positioning when no explicit `left`/`top` set
  - Fix `onBlockMove` callback reporting incorrect from/to positions
