import type { BaseBlock } from '@dnd-block-tree/core';
import type { Snippet } from 'svelte';
interface Props {
    activeBlock: BaseBlock | null;
    selectedCount?: number;
    children?: Snippet<[BaseBlock]>;
}
declare const DragOverlay: import("svelte").Component<Props, {}, "">;
type DragOverlay = ReturnType<typeof DragOverlay>;
export default DragOverlay;
//# sourceMappingURL=DragOverlay.svelte.d.ts.map