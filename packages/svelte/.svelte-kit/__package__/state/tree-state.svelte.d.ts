import type { BaseBlock, OrderingStrategy } from '@dnd-block-tree/core';
export interface TreeStateOptions {
    previewDebounce?: number;
    containerTypes?: readonly string[];
    orderingStrategy?: OrderingStrategy;
}
export interface TreeState<T extends BaseBlock> {
    readonly activeId: string | null;
    readonly activeBlock: T | null;
    readonly hoverZone: string | null;
    readonly expandedMap: Record<string, boolean>;
    readonly effectiveBlocks: T[];
    readonly blocksByParent: Map<string | null, T[]>;
    readonly isDragging: boolean;
    setActiveId(id: string | null): void;
    setHoverZone(zone: string | null): void;
    toggleExpand(id: string): void;
    setExpandAll(expanded: boolean): void;
    handleHover(zoneId: string, parentId: string | null): void;
    handleDragStart(id: string, blocks: T[], draggedIds?: string[]): void;
    handleDragOver(targetZone: string): void;
    handleDragEnd(): {
        targetId: string;
        reorderedBlocks: T[];
    } | null;
    cancelDrag(): void;
    getInitialBlocks(): T[];
    getCachedReorder(): {
        targetId: string;
        reorderedBlocks: T[];
    } | null;
    getDraggedIds(): string[];
}
export declare function createTreeState<T extends BaseBlock>(blocks: () => T[], blockMap: () => Map<string, T>, options?: TreeStateOptions): TreeState<T>;
/** Set tree state in context */
export declare function setTreeStateContext<T extends BaseBlock>(state: TreeState<T>): void;
/** Get tree state from context */
export declare function getTreeStateContext<T extends BaseBlock>(): TreeState<T>;
//# sourceMappingURL=tree-state.svelte.d.ts.map