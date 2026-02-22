import { blockReducer, computeNormalizedIndex, buildOrderedBlocks, getDescendantIds, generateId, generateKeyBetween, } from '@dnd-block-tree/core';
import { getContext, setContext } from 'svelte';
const BLOCK_STATE_KEY = Symbol('block-state');
export function createBlockState(options = {}) {
    const { initialBlocks = [], containerTypes = [], orderingStrategy = 'integer', maxDepth, onChange, onBlockAdd, onBlockDelete, } = options;
    let index = $state(computeNormalizedIndex(initialBlocks, orderingStrategy));
    function dispatch(action) {
        index = blockReducer(index, action, containerTypes, orderingStrategy, maxDepth);
    }
    const blocks = $derived.by(() => {
        return buildOrderedBlocks(index, containerTypes, orderingStrategy);
    });
    const blockMap = $derived(index.byId);
    const childrenMap = $derived.by(() => {
        const map = new Map();
        for (const [parentId, ids] of index.byParent.entries()) {
            map.set(parentId, ids.map(id => index.byId.get(id)).filter(Boolean));
        }
        return map;
    });
    // Notify onChange when blocks change
    $effect(() => {
        onChange?.(blocks);
    });
    const state = {
        get blocks() { return blocks; },
        get blockMap() { return blockMap; },
        get childrenMap() { return childrenMap; },
        get normalizedIndex() { return index; },
        createItem(type, parentId = null) {
            const siblings = index.byParent.get(parentId) ?? [];
            let order = siblings.length;
            if (orderingStrategy === 'fractional') {
                const lastId = siblings[siblings.length - 1];
                const lastOrder = lastId ? String(index.byId.get(lastId).order) : null;
                order = generateKeyBetween(lastOrder, null);
            }
            const newItem = { id: generateId(), type, parentId, order };
            dispatch({ type: 'ADD_ITEM', payload: newItem });
            onBlockAdd?.({ block: newItem, parentId, index: siblings.length });
            return newItem;
        },
        insertItem(type, referenceId, position) {
            const referenceBlock = index.byId.get(referenceId);
            if (!referenceBlock)
                throw new Error(`Reference block ${referenceId} not found`);
            const parentId = referenceBlock.parentId ?? null;
            const siblings = index.byParent.get(parentId) ?? [];
            const refIdx = siblings.indexOf(referenceId);
            const insertIdx = position === 'before' ? refIdx : refIdx + 1;
            let order = insertIdx;
            if (orderingStrategy === 'fractional') {
                const prevId = insertIdx > 0 ? siblings[insertIdx - 1] : null;
                const nextId = insertIdx < siblings.length ? siblings[insertIdx] : null;
                const prevOrder = prevId ? String(index.byId.get(prevId).order) : null;
                const nextOrder = nextId ? String(index.byId.get(nextId).order) : null;
                order = generateKeyBetween(prevOrder, nextOrder);
            }
            const newItem = { id: generateId(), type, parentId, order };
            dispatch({ type: 'INSERT_ITEM', payload: { item: newItem, parentId, index: insertIdx } });
            onBlockAdd?.({ block: newItem, parentId, index: insertIdx });
            return newItem;
        },
        deleteItem(id) {
            const block = index.byId.get(id);
            if (block && onBlockDelete) {
                const deletedIds = [...getDescendantIds(index, id)];
                onBlockDelete({ block, deletedIds, parentId: block.parentId });
            }
            dispatch({ type: 'DELETE_ITEM', payload: { id } });
        },
        moveItem(activeId, targetZone) {
            dispatch({ type: 'MOVE_ITEM', payload: { activeId, targetZone } });
        },
        setAll(allBlocks) {
            dispatch({ type: 'SET_ALL', payload: allBlocks });
        },
    };
    return state;
}
/** Set block state in context */
export function setBlockStateContext(state) {
    setContext(BLOCK_STATE_KEY, state);
}
/** Get block state from context */
export function getBlockStateContext() {
    const ctx = getContext(BLOCK_STATE_KEY);
    if (!ctx)
        throw new Error('getBlockStateContext must be called inside a component that called setBlockStateContext');
    return ctx;
}
