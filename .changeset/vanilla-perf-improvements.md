---
"@dnd-block-tree/vanilla": patch
---

Fix FLIP animation smoothness and reduce DOM flicker in default renderer.

- Replace double-requestAnimationFrame FLIP pattern with forced reflow for seamless layout transitions
- Add keyed element cache to default renderer — leaf block DOM nodes are reused across renders when data hasn't changed, preventing CSS transition resets and visual flicker
