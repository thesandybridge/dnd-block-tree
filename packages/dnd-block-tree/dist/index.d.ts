import * as react from 'react';
import { ReactNode } from 'react';
import * as _dnd_kit_core from '@dnd-kit/core';
import { UniqueIdentifier, CollisionDetection } from '@dnd-kit/core';
import * as react_jsx_runtime from 'react/jsx-runtime';

/**
 * Base block interface - extend this for your custom block types
 */
interface BaseBlock {
    id: string;
    type: string;
    parentId: string | null;
    order: number;
}
/**
 * Normalized index structure for efficient tree operations
 */
interface BlockIndex<T extends BaseBlock = BaseBlock> {
    byId: Map<string, T>;
    byParent: Map<string | null, string[]>;
}
/**
 * Props passed to non-container block renderers
 */
interface BlockRendererProps<T extends BaseBlock = BaseBlock> {
    block: T;
    children?: ReactNode;
    isDragging?: boolean;
    isOver?: boolean;
    depth: number;
}
/**
 * Props passed to container block renderers (blocks that can have children)
 */
interface ContainerRendererProps<T extends BaseBlock = BaseBlock> extends BlockRendererProps<T> {
    children: ReactNode;
    isExpanded: boolean;
    onToggleExpand: () => void;
}
/**
 * Get the appropriate props type for a renderer based on whether it's a container type
 *
 * @example
 * type SectionProps = RendererPropsFor<MyBlock, 'section', typeof CONTAINER_TYPES>
 * // If CONTAINER_TYPES includes 'section', this is ContainerRendererProps
 * // Otherwise, it's BlockRendererProps
 */
type RendererPropsFor<T extends BaseBlock, K extends T['type'], C extends readonly string[]> = K extends C[number] ? ContainerRendererProps<T & {
    type: K;
}> : BlockRendererProps<T & {
    type: K;
}>;
/**
 * Map of block types to their renderers with automatic container detection
 *
 * @example
 * const CONTAINER_TYPES = ['section'] as const
 *
 * const renderers: BlockRenderers<MyBlock, typeof CONTAINER_TYPES> = {
 *   section: (props) => <Section {...props} />,  // props includes isExpanded, onToggleExpand
 *   task: (props) => <Task {...props} />,        // props is BlockRendererProps
 * }
 */
type BlockRenderers<T extends BaseBlock = BaseBlock, C extends readonly string[] = readonly string[]> = {
    [K in T['type']]: (props: RendererPropsFor<T, K, C>) => ReactNode;
};
/**
 * Internal renderer type used by TreeRenderer (less strict for flexibility)
 */
type InternalRenderers<T extends BaseBlock = BaseBlock> = {
    [K in T['type']]: (props: BlockRendererProps<T> | ContainerRendererProps<T>) => ReactNode;
};
/**
 * Block action types for the reducer
 */
type BlockAction<T extends BaseBlock> = {
    type: 'ADD_ITEM';
    payload: T;
} | {
    type: 'DELETE_ITEM';
    payload: {
        id: string;
    };
} | {
    type: 'SET_ALL';
    payload: T[];
} | {
    type: 'MOVE_ITEM';
    payload: {
        activeId: UniqueIdentifier;
        targetZone: string;
    };
} | {
    type: 'INSERT_ITEM';
    payload: {
        item: T;
        parentId: string | null;
        index: number;
    };
};
/**
 * Drag overlay renderer
 */
interface DragOverlayProps$1<T extends BaseBlock = BaseBlock> {
    block: T;
}
/**
 * BlockTree configuration options
 */
interface BlockTreeConfig {
    activationDistance?: number;
    previewDebounce?: number;
    dropZoneHeight?: number;
}
/**
 * Block state context value
 */
interface BlockStateContextValue<T extends BaseBlock = BaseBlock> {
    blocks: T[];
    blockMap: Map<string, T>;
    childrenMap: Map<string | null, T[]>;
    indexMap: Map<string, number>;
    normalizedIndex: BlockIndex<T>;
    createItem: (type: T['type'], parentId?: string | null) => T;
    insertItem: (type: T['type'], referenceId: string, position: 'before' | 'after') => T;
    deleteItem: (id: string) => void;
    moveItem: (activeId: UniqueIdentifier, targetZone: string) => void;
    setAll: (blocks: T[]) => void;
}
/**
 * Tree state context value (UI state)
 */
interface TreeStateContextValue<T extends BaseBlock = BaseBlock> {
    activeId: string | null;
    activeBlock: T | null;
    hoverZone: string | null;
    expandedMap: Record<string, boolean>;
    effectiveBlocks: T[];
    blocksByParent: Map<string | null, T[]>;
    setActiveId: (id: string | null) => void;
    setHoverZone: (zone: string | null) => void;
    toggleExpand: (id: string) => void;
    setExpandAll: (expanded: boolean) => void;
    handleHover: (zoneId: string, parentId: string | null) => void;
}
/**
 * Drop zone types
 */
type DropZoneType = 'before' | 'after' | 'into';
/**
 * Extract zone type from zone ID
 */
declare function getDropZoneType(zoneId: string): DropZoneType;
/**
 * Extract block ID from zone ID
 */
declare function extractBlockId(zoneId: string): string;
/**
 * Block state provider props
 */
interface BlockStateProviderProps<T extends BaseBlock = BaseBlock> {
    children: ReactNode;
    initialBlocks?: T[];
    containerTypes?: readonly string[];
    onChange?: (blocks: T[]) => void;
}
/**
 * Tree state provider props
 */
interface TreeStateProviderProps<T extends BaseBlock = BaseBlock> {
    children: ReactNode;
    blocks: T[];
    blockMap: Map<string, T>;
}

/**
 * Custom collision detection that scores drop zones by distance to nearest edge.
 * Uses edge-distance scoring with a bottom bias for more natural drag behavior.
 *
 * Key features:
 * - Scores by distance to nearest edge (top or bottom) of droppable
 * - Applies -5px bias to elements below pointer midpoint (prefers dropping below)
 * - Returns single winner (lowest score)
 */
declare const weightedVerticalCollision: CollisionDetection;
/**
 * Simple closest center collision (fallback)
 */
declare const closestCenterCollision: CollisionDetection;

interface SensorConfig {
    activationDistance?: number;
}
/**
 * Create configured sensors with activation distance constraint.
 * The activation distance prevents accidental drags while still allowing clicks.
 *
 * @param config - Sensor configuration
 * @returns Configured sensors for DndContext
 */
declare function useConfiguredSensors(config?: SensorConfig): _dnd_kit_core.SensorDescriptor<_dnd_kit_core.SensorOptions>[];
/**
 * Get sensor configuration for manual setup
 */
declare function getSensorConfig(activationDistance?: number): {
    pointer: {
        activationConstraint: {
            distance: number;
        };
    };
    touch: {
        activationConstraint: {
            distance: number;
        };
    };
};

interface BlockTreeProps<T extends BaseBlock, C extends readonly T['type'][] = readonly T['type'][]> {
    /** Current blocks array */
    blocks: T[];
    /** Block renderers for each type */
    renderers: BlockRenderers<T, C>;
    /** Block types that can have children */
    containerTypes?: C;
    /** Called when blocks are reordered */
    onChange?: (blocks: T[]) => void;
    /** Custom drag overlay renderer */
    dragOverlay?: (block: T) => ReactNode;
    /** Activation distance in pixels (default: 8) */
    activationDistance?: number;
    /** Preview debounce in ms (default: 150) */
    previewDebounce?: number;
    /** Root container className */
    className?: string;
    /** Drop zone className */
    dropZoneClassName?: string;
    /** Active drop zone className */
    dropZoneActiveClassName?: string;
    /** Indent className for nested items */
    indentClassName?: string;
}
/**
 * Main BlockTree component
 * Provides drag-and-drop functionality for hierarchical block structures
 */
declare function BlockTree<T extends BaseBlock, C extends readonly T['type'][] = readonly T['type'][]>({ blocks, renderers, containerTypes, onChange, dragOverlay, activationDistance, previewDebounce, className, dropZoneClassName, dropZoneActiveClassName, indentClassName, }: BlockTreeProps<T, C>): react_jsx_runtime.JSX.Element;

interface TreeRendererProps<T extends BaseBlock> {
    blocks: T[];
    blocksByParent: Map<string | null, T[]>;
    parentId: string | null;
    activeId: string | null;
    expandedMap: Record<string, boolean>;
    renderers: InternalRenderers<T>;
    containerTypes: readonly string[];
    onHover: (zoneId: string, parentId: string | null) => void;
    onToggleExpand: (id: string) => void;
    depth?: number;
    dropZoneClassName?: string;
    dropZoneActiveClassName?: string;
    indentClassName?: string;
    rootClassName?: string;
}
/**
 * Recursive tree renderer with smart drop zones
 */
declare function TreeRenderer<T extends BaseBlock>({ blocks, blocksByParent, parentId, activeId, expandedMap, renderers, containerTypes, onHover, onToggleExpand, depth, dropZoneClassName, dropZoneActiveClassName, indentClassName, rootClassName, }: TreeRendererProps<T>): react_jsx_runtime.JSX.Element;

interface DropZoneProps {
    id: string;
    parentId: string | null;
    onHover: (zoneId: string, parentId: string | null) => void;
    activeId: string | null;
    className?: string;
    activeClassName?: string;
    height?: number;
}
/**
 * Drop zone indicator component
 * Shows where blocks can be dropped
 */
declare function DropZoneComponent({ id, parentId, onHover, activeId, className, activeClassName, height, }: DropZoneProps): react_jsx_runtime.JSX.Element | null;
declare const DropZone: react.MemoExoticComponent<typeof DropZoneComponent>;

interface DragOverlayProps<T extends BaseBlock> {
    activeBlock: T | null;
    children?: (block: T) => ReactNode;
}
/**
 * Default drag overlay component
 * Shows a preview of the dragged item
 */
declare function DragOverlay<T extends BaseBlock>({ activeBlock, children, }: DragOverlayProps<T>): react_jsx_runtime.JSX.Element;

/**
 * Create block state context and hooks
 */
declare function createBlockState<T extends BaseBlock>(): {
    BlockStateProvider: ({ children, initialBlocks, containerTypes, onChange, }: BlockStateProviderProps<T>) => react_jsx_runtime.JSX.Element;
    useBlockState: () => BlockStateContextValue<T>;
};

interface CreateTreeStateOptions<T extends BaseBlock> {
    previewDebounce?: number;
    containerTypes?: string[];
}
/**
 * Create tree state context and hooks
 * Handles UI state: active drag, hover zone, expand/collapse, virtual preview
 */
declare function createTreeState<T extends BaseBlock>(options?: CreateTreeStateOptions<T>): {
    TreeStateProvider: ({ children, blocks, blockMap }: TreeStateProviderProps<T>) => react_jsx_runtime.JSX.Element;
    useTreeState: () => TreeStateContextValue<T>;
};

/**
 * Clone a Map
 */
declare function cloneMap<K, V>(map: Map<K, V>): Map<K, V>;
/**
 * Clone a parent map with arrays
 */
declare function cloneParentMap(map: Map<string | null, string[]>): Map<string | null, string[]>;
/**
 * Compute normalized index from flat block array
 */
declare function computeNormalizedIndex<T extends BaseBlock>(blocks: T[]): BlockIndex<T>;
/**
 * Build ordered flat array from BlockIndex
 */
declare function buildOrderedBlocks<T extends BaseBlock>(index: BlockIndex<T>, containerTypes?: readonly string[]): T[];
/**
 * Reparent a block based on drop zone ID
 *
 * @param state - Current block index
 * @param activeId - ID of the dragged block
 * @param targetZone - Drop zone ID (e.g., "after-uuid", "before-uuid", "into-uuid")
 * @param containerTypes - Block types that can have children
 */
declare function reparentBlockIndex<T extends BaseBlock>(state: BlockIndex<T>, activeId: UniqueIdentifier, targetZone: string, containerTypes?: readonly string[]): BlockIndex<T>;
/**
 * Get all descendant IDs of a block
 */
declare function getDescendantIds<T extends BaseBlock>(state: BlockIndex<T>, parentId: string): Set<string>;
/**
 * Delete a block and all its descendants
 */
declare function deleteBlockAndDescendants<T extends BaseBlock>(state: BlockIndex<T>, id: string): BlockIndex<T>;

/**
 * Extract UUID from a zone ID by removing the prefix (before-, after-, into-)
 */
declare function extractUUID(id: string, pattern?: string): string;
/**
 * Create a debounced function
 */
declare function debounce<Args extends unknown[]>(fn: (...args: Args) => void, delay: number): ((...args: Args) => void) & {
    cancel: () => void;
};
/**
 * Generate a unique ID (simple implementation)
 */
declare function generateId(): string;

export { type BaseBlock, type BlockAction, type BlockIndex, type BlockRendererProps, type BlockRenderers, type BlockStateContextValue, type BlockStateProviderProps, BlockTree, type BlockTreeConfig, type BlockTreeProps, type ContainerRendererProps, DragOverlay, type DragOverlayProps$1 as DragOverlayProps, DropZone, type DropZoneProps, type DropZoneType, type RendererPropsFor, TreeRenderer, type TreeRendererProps, type TreeStateContextValue, type TreeStateProviderProps, buildOrderedBlocks, cloneMap, cloneParentMap, closestCenterCollision, computeNormalizedIndex, createBlockState, createTreeState, debounce, deleteBlockAndDescendants, extractBlockId, extractUUID, generateId, getDescendantIds, getDropZoneType, getSensorConfig, reparentBlockIndex, useConfiguredSensors, weightedVerticalCollision };
