import type { BaseBlock } from '@dnd-block-tree/core';
interface Props {
    blocks: BaseBlock[];
    expandedMap: Record<string, boolean>;
    activeId?: string | null;
    hoverZone?: string | null;
    open?: boolean;
}
declare const BlockTreeDevTools: import("svelte").Component<Props, {}, "">;
type BlockTreeDevTools = ReturnType<typeof BlockTreeDevTools>;
export default BlockTreeDevTools;
//# sourceMappingURL=BlockTreeDevTools.svelte.d.ts.map