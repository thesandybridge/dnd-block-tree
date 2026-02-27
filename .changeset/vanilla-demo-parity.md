---
"@dnd-block-tree/vanilla": minor
---

Add className-based styling options and drop zone highlighting to default renderer.

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
