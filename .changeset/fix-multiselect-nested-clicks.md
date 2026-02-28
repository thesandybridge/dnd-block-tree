---
"@dnd-block-tree/react": patch
"@dnd-block-tree/svelte": patch
---

Fix multi-select for nested blocks: DraggableBlock now stops click propagation when handling block clicks, preventing parent containers from overriding child block selection. This fixes an issue where clicking a task or note inside a section would select the section instead.
