# @dnd-block-tree/svelte

## 2.3.1

### Patch Changes

- 9eaa6a0: Fix multi-select for nested blocks: DraggableBlock now stops click propagation when handling block clicks, preventing parent containers from overriding child block selection. This fixes an issue where clicking a task or note inside a section would select the section instead.
