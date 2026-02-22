import type { BaseBlock } from '@dnd-block-tree/core';
import type { Snippet } from 'svelte';
interface Props {
    block: BaseBlock;
    disabled?: boolean;
    isContainer?: boolean;
    isExpanded?: boolean;
    isSelected?: boolean;
    depth?: number;
    children: Snippet<[{
        isDragging: boolean;
    }]>;
}
declare const DraggableBlock: import("svelte").Component<Props, {}, "">;
type DraggableBlock = ReturnType<typeof DraggableBlock>;
export default DraggableBlock;
//# sourceMappingURL=DraggableBlock.svelte.d.ts.map