import type { BaseBlock, BlockTreeCallbacks } from '@dnd-block-tree/core';
import type { BlockTreeCustomization } from '../types';
import type { Snippet } from 'svelte';
interface Props extends BlockTreeCallbacks<BaseBlock>, BlockTreeCustomization<BaseBlock> {
    blocks: BaseBlock[];
    containerTypes?: readonly string[];
    onChange?: (blocks: BaseBlock[]) => void;
    renderBlock: Snippet<[
        {
            block: BaseBlock;
            isDragging: boolean;
            depth: number;
            isExpanded: boolean;
            onToggleExpand: (() => void) | null;
            children: Snippet | null;
        }
    ]>;
    dragOverlay?: Snippet<[BaseBlock]>;
    activationDistance?: number;
    previewDebounce?: number;
    showDropPreview?: boolean;
    multiSelect?: boolean;
    selectedIds?: Set<string>;
    onSelectionChange?: (selectedIds: Set<string>) => void;
    dropZoneClass?: string;
    dropZoneActiveClass?: string;
    class?: string;
}
declare const BlockTree: import("svelte").Component<Props, {}, "">;
type BlockTree = ReturnType<typeof BlockTree>;
export default BlockTree;
//# sourceMappingURL=BlockTree.svelte.d.ts.map