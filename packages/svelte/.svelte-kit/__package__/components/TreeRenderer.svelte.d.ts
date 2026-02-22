import type { BaseBlock, CanDragFn, AnimationConfig } from '@dnd-block-tree/core';
import type { Snippet } from 'svelte';
interface Props {
    blocks: BaseBlock[];
    blocksByParent: Map<string | null, BaseBlock[]>;
    parentId: string | null;
    activeId: string | null;
    expandedMap: Record<string, boolean>;
    containerTypes: readonly string[];
    onHover: (zoneId: string, parentId: string | null) => void;
    onToggleExpand: (id: string) => void;
    renderBlock: Snippet<[{
        block: BaseBlock;
        isDragging: boolean;
        depth: number;
        isExpanded: boolean;
        onToggleExpand: (() => void) | null;
        children: Snippet | null;
    }]>;
    depth?: number;
    dropZoneClass?: string;
    dropZoneActiveClass?: string;
    canDrag?: CanDragFn<BaseBlock>;
    previewPosition?: {
        parentId: string | null;
        index: number;
    } | null;
    draggedBlock?: BaseBlock | null;
    selectedIds?: Set<string>;
    animation?: AnimationConfig;
}
declare const TreeRenderer: import("svelte").Component<Props, {}, "">;
type TreeRenderer = ReturnType<typeof TreeRenderer>;
export default TreeRenderer;
//# sourceMappingURL=TreeRenderer.svelte.d.ts.map