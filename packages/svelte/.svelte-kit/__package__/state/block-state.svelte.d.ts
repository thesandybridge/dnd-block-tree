import type { BaseBlock, BlockIndex, OrderingStrategy, BlockAddEvent, BlockDeleteEvent } from '@dnd-block-tree/core';
export interface BlockStateOptions<T extends BaseBlock> {
    initialBlocks?: T[];
    containerTypes?: readonly string[];
    orderingStrategy?: OrderingStrategy;
    maxDepth?: number;
    onChange?: (blocks: T[]) => void;
    onBlockAdd?: (event: BlockAddEvent<T>) => void;
    onBlockDelete?: (event: BlockDeleteEvent<T>) => void;
}
export interface BlockState<T extends BaseBlock> {
    readonly blocks: T[];
    readonly blockMap: Map<string, T>;
    readonly childrenMap: Map<string | null, T[]>;
    readonly normalizedIndex: BlockIndex<T>;
    createItem(type: T['type'], parentId?: string | null): T;
    insertItem(type: T['type'], referenceId: string, position: 'before' | 'after'): T;
    deleteItem(id: string): void;
    moveItem(activeId: string, targetZone: string): void;
    setAll(blocks: T[]): void;
}
export declare function createBlockState<T extends BaseBlock>(options?: BlockStateOptions<T>): BlockState<T>;
/** Set block state in context */
export declare function setBlockStateContext<T extends BaseBlock>(state: BlockState<T>): void;
/** Get block state from context */
export declare function getBlockStateContext<T extends BaseBlock>(): BlockState<T>;
//# sourceMappingURL=block-state.svelte.d.ts.map