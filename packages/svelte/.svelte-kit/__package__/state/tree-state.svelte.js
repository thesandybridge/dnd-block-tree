import { expandReducer, computeNormalizedIndex, reparentBlockIndex, reparentMultipleBlocks, buildOrderedBlocks, debounce, getDropZoneType, extractBlockId, } from '@dnd-block-tree/core';
import { getContext, setContext } from 'svelte';
const TREE_STATE_KEY = Symbol('tree-state');
export function createTreeState(blocks, blockMap, options = {}) {
    const { previewDebounce = 150, containerTypes = [], orderingStrategy = 'integer', } = options;
    let activeId = $state(null);
    let hoverZone = $state(null);
    let expandedMap = $state({});
    let virtualState = $state(null);
    let isDragging = $state(false);
    // Non-reactive refs (snapshots)
    let initialBlocks = [];
    let cachedReorder = null;
    let draggedIds = [];
    const activeBlock = $derived(activeId ? blockMap().get(activeId) ?? null : null);
    const debouncedSetVirtual = debounce((newBlocks) => {
        if (newBlocks) {
            virtualState = computeNormalizedIndex(newBlocks);
        }
        else {
            virtualState = null;
        }
    }, previewDebounce);
    const effectiveState = $derived(virtualState ?? computeNormalizedIndex(blocks(), orderingStrategy));
    const effectiveBlocks = $derived(buildOrderedBlocks(effectiveState, containerTypes, orderingStrategy));
    const blocksByParent = $derived.by(() => {
        const map = new Map();
        for (const [parentId, ids] of effectiveState.byParent.entries()) {
            map.set(parentId, ids.map(id => effectiveState.byId.get(id)).filter(Boolean));
        }
        return map;
    });
    const state = {
        get activeId() { return activeId; },
        get activeBlock() { return activeBlock; },
        get hoverZone() { return hoverZone; },
        get expandedMap() { return expandedMap; },
        get effectiveBlocks() { return effectiveBlocks; },
        get blocksByParent() { return blocksByParent; },
        get isDragging() { return isDragging; },
        setActiveId(id) {
            activeId = id;
        },
        setHoverZone(zone) {
            hoverZone = zone;
        },
        toggleExpand(id) {
            expandedMap = expandReducer(expandedMap, { type: 'TOGGLE', id });
        },
        setExpandAll(expanded) {
            const containerIds = blocks()
                .filter(b => containerTypes.includes(b.type))
                .map(b => b.id);
            expandedMap = expandReducer(expandedMap, { type: 'SET_ALL', expanded, ids: containerIds });
        },
        handleHover(zoneId, _parentId) {
            if (!activeId)
                return;
            state.handleDragOver(zoneId);
        },
        handleDragStart(id, currentBlocks, ids) {
            activeId = id;
            isDragging = true;
            initialBlocks = [...currentBlocks];
            cachedReorder = null;
            draggedIds = ids ?? [id];
        },
        handleDragOver(targetZone) {
            if (!activeId)
                return;
            hoverZone = targetZone;
            const baseIndex = computeNormalizedIndex(initialBlocks, orderingStrategy);
            const updatedIndex = draggedIds.length > 1
                ? reparentMultipleBlocks(baseIndex, draggedIds, targetZone, containerTypes, orderingStrategy)
                : reparentBlockIndex(baseIndex, activeId, targetZone, containerTypes, orderingStrategy);
            const orderedBlocks = buildOrderedBlocks(updatedIndex, containerTypes, orderingStrategy);
            cachedReorder = { targetId: targetZone, reorderedBlocks: orderedBlocks };
            debouncedSetVirtual(orderedBlocks);
        },
        handleDragEnd() {
            debouncedSetVirtual.cancel();
            virtualState = null;
            const result = cachedReorder;
            activeId = null;
            hoverZone = null;
            isDragging = false;
            cachedReorder = null;
            initialBlocks = [];
            draggedIds = [];
            return result;
        },
        cancelDrag() {
            debouncedSetVirtual.cancel();
            virtualState = null;
            activeId = null;
            hoverZone = null;
            isDragging = false;
            cachedReorder = null;
            initialBlocks = [];
            draggedIds = [];
        },
        getInitialBlocks: () => initialBlocks,
        getCachedReorder: () => cachedReorder,
        getDraggedIds: () => draggedIds,
    };
    return state;
}
/** Set tree state in context */
export function setTreeStateContext(state) {
    setContext(TREE_STATE_KEY, state);
}
/** Get tree state from context */
export function getTreeStateContext() {
    const ctx = getContext(TREE_STATE_KEY);
    if (!ctx)
        throw new Error('getTreeStateContext must be called inside a component that called setTreeStateContext');
    return ctx;
}
