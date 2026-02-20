import { useDroppable, useSensors, useSensor, PointerSensor, TouchSensor, KeyboardSensor, DragOverlay as DragOverlay$1, DndContext, useDraggable } from '@dnd-kit/core';
import { memo, useCallback, useEffect, Fragment, useRef, useReducer, createContext, useContext, useState, useMemo } from 'react';
import { jsx, jsxs, Fragment as Fragment$1 } from 'react/jsx-runtime';

// src/core/types.ts
function getDropZoneType(zoneId) {
  if (zoneId.startsWith("before-")) return "before";
  if (zoneId.startsWith("into-")) return "into";
  return "after";
}
function extractBlockId(zoneId) {
  return zoneId.replace(/^(before|after|into)-/, "");
}

// src/core/collision.ts
var weightedVerticalCollision = ({
  droppableContainers,
  collisionRect
}) => {
  if (!collisionRect) return [];
  const pointerY = collisionRect.top + collisionRect.height / 2;
  const candidates = droppableContainers.map((container) => {
    const rect = container.rect.current;
    if (!rect) return null;
    const distanceToTop = Math.abs(pointerY - rect.top);
    const distanceToBottom = Math.abs(pointerY - rect.bottom);
    const edgeDistance = Math.min(distanceToTop, distanceToBottom);
    const isBelowCenter = pointerY > rect.top + rect.height / 2;
    const bias = isBelowCenter ? -5 : 0;
    return {
      id: container.id,
      data: {
        droppableContainer: container,
        value: edgeDistance + bias
      }
    };
  }).filter((c) => c !== null);
  candidates.sort((a, b) => {
    const aValue = a.data.value;
    const bValue = b.data.value;
    return aValue - bValue;
  });
  return candidates.slice(0, 1);
};
var closestCenterCollision = ({
  droppableContainers,
  collisionRect
}) => {
  if (!collisionRect) return [];
  const centerY = collisionRect.top + collisionRect.height / 2;
  const centerX = collisionRect.left + collisionRect.width / 2;
  const candidates = droppableContainers.map((container) => {
    const rect = container.rect.current;
    if (!rect) return null;
    const containerCenterX = rect.left + rect.width / 2;
    const containerCenterY = rect.top + rect.height / 2;
    const distance = Math.sqrt(
      Math.pow(centerX - containerCenterX, 2) + Math.pow(centerY - containerCenterY, 2)
    );
    return {
      id: container.id,
      data: {
        droppableContainer: container,
        value: distance
      }
    };
  }).filter((c) => c !== null);
  candidates.sort((a, b) => {
    const aValue = a.data.value;
    const bValue = b.data.value;
    return aValue - bValue;
  });
  return candidates.slice(0, 1);
};
var DEFAULT_ACTIVATION_DISTANCE = 8;
function useConfiguredSensors(config = {}) {
  const { activationDistance = DEFAULT_ACTIVATION_DISTANCE } = config;
  return useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: activationDistance
      }
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        distance: activationDistance
      }
    }),
    useSensor(KeyboardSensor)
  );
}
function getSensorConfig(activationDistance = DEFAULT_ACTIVATION_DISTANCE) {
  return {
    pointer: {
      activationConstraint: {
        distance: activationDistance
      }
    },
    touch: {
      activationConstraint: {
        distance: activationDistance
      }
    }
  };
}

// src/utils/helper.ts
function extractUUID(id, pattern = "^(before|after|into)-") {
  const regex = new RegExp(pattern);
  return id.replace(regex, "");
}
function debounce(fn, delay) {
  let timeoutId = null;
  const debounced = ((...args) => {
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      fn(...args);
      timeoutId = null;
    }, delay);
  });
  debounced.cancel = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
  };
  return debounced;
}
function generateId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}
function DropZoneComponent({
  id,
  parentId,
  onHover,
  activeId,
  className = "h-1 rounded transition-colors",
  activeClassName = "bg-blue-500",
  height = 4
}) {
  const { setNodeRef, isOver, active } = useDroppable({ id });
  const handleInternalHover = useCallback(() => {
    onHover(id, parentId);
  }, [onHover, id, parentId]);
  useEffect(() => {
    if (isOver) handleInternalHover();
  }, [isOver, handleInternalHover]);
  if (active?.id && extractUUID(id) === String(active.id)) return null;
  if (activeId && extractUUID(id) === activeId) return null;
  return /* @__PURE__ */ jsx(
    "div",
    {
      ref: setNodeRef,
      "data-zone-id": id,
      "data-parent-id": parentId ?? "",
      style: { height: isOver ? height * 2 : height },
      className: `${className} ${isOver ? activeClassName : "bg-transparent"}`
    }
  );
}
var DropZone = memo(DropZoneComponent);
function DraggableBlock({
  block,
  children
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: block.id
  });
  return /* @__PURE__ */ jsx("div", { ref: setNodeRef, ...attributes, ...listeners, children: children({ isDragging }) });
}
function TreeRenderer({
  blocks,
  blocksByParent,
  parentId,
  activeId,
  expandedMap,
  renderers,
  containerTypes,
  onHover,
  onToggleExpand,
  depth = 0,
  dropZoneClassName,
  dropZoneActiveClassName,
  indentClassName = "ml-6 border-l border-gray-200 pl-4",
  rootClassName = "flex flex-col gap-1"
}) {
  const items = blocksByParent.get(parentId) ?? [];
  const filteredBlocks = items.filter((block) => block.id !== activeId);
  const firstVisibleBlockId = filteredBlocks[0]?.id;
  const containerClass = depth === 0 ? rootClassName : indentClassName;
  return /* @__PURE__ */ jsx("div", { className: containerClass, children: filteredBlocks.map((block) => {
    const isContainer = containerTypes.includes(block.type);
    const isExpanded = expandedMap[block.id] !== false;
    const Renderer = renderers[block.type];
    if (!Renderer) {
      console.warn(`No renderer found for block type: ${block.type}`);
      return null;
    }
    return /* @__PURE__ */ jsxs(Fragment, { children: [
      block.id === firstVisibleBlockId && /* @__PURE__ */ jsx(
        DropZone,
        {
          id: `before-${block.id}`,
          parentId: block.parentId,
          onHover,
          activeId,
          className: dropZoneClassName,
          activeClassName: dropZoneActiveClassName
        }
      ),
      /* @__PURE__ */ jsx(DraggableBlock, { block, children: ({ isDragging }) => {
        if (isContainer) {
          const childContent = isExpanded ? /* @__PURE__ */ jsxs(Fragment$1, { children: [
            /* @__PURE__ */ jsx(
              DropZone,
              {
                id: `into-${block.id}`,
                parentId: block.id,
                onHover,
                activeId,
                className: dropZoneClassName,
                activeClassName: dropZoneActiveClassName
              }
            ),
            /* @__PURE__ */ jsx(
              TreeRenderer,
              {
                blocks,
                blocksByParent,
                parentId: block.id,
                activeId,
                expandedMap,
                renderers,
                containerTypes,
                onHover,
                onToggleExpand,
                depth: depth + 1,
                dropZoneClassName,
                dropZoneActiveClassName,
                indentClassName,
                rootClassName
              }
            )
          ] }) : null;
          return Renderer({
            block,
            children: childContent,
            isDragging,
            depth,
            isExpanded,
            onToggleExpand: () => onToggleExpand(block.id)
          });
        }
        return Renderer({
          block,
          isDragging,
          depth
        });
      } }),
      /* @__PURE__ */ jsx(
        DropZone,
        {
          id: `after-${block.id}`,
          parentId: block.parentId,
          onHover,
          activeId,
          className: dropZoneClassName,
          activeClassName: dropZoneActiveClassName
        }
      )
    ] }, block.id);
  }) });
}
function DragOverlay({
  activeBlock,
  children
}) {
  return /* @__PURE__ */ jsx(DragOverlay$1, { children: activeBlock && (children ? children(activeBlock) : /* @__PURE__ */ jsxs("div", { className: "bg-white border border-gray-300 shadow-md rounded-md p-3 text-sm w-64 pointer-events-none", children: [
    /* @__PURE__ */ jsx("div", { className: "text-gray-500 uppercase text-xs tracking-wide mb-1", children: activeBlock.type }),
    /* @__PURE__ */ jsxs("div", { className: "font-semibold text-gray-800", children: [
      "Block ",
      activeBlock.id.slice(0, 8)
    ] })
  ] })) });
}

// src/utils/blocks.ts
function cloneMap(map) {
  return new Map(map);
}
function cloneParentMap(map) {
  const newMap = /* @__PURE__ */ new Map();
  for (const [k, v] of map.entries()) {
    newMap.set(k, [...v]);
  }
  return newMap;
}
function computeNormalizedIndex(blocks) {
  const byId = /* @__PURE__ */ new Map();
  const byParent = /* @__PURE__ */ new Map();
  for (const block of blocks) {
    byId.set(block.id, block);
    const key = block.parentId ?? null;
    const list = byParent.get(key) ?? [];
    byParent.set(key, [...list, block.id]);
  }
  return { byId, byParent };
}
function buildOrderedBlocks(index, containerTypes = []) {
  const result = [];
  const walk = (parentId) => {
    const children = index.byParent.get(parentId) ?? [];
    for (let i = 0; i < children.length; i++) {
      const id = children[i];
      const block = index.byId.get(id);
      if (block) {
        result.push({ ...block, order: i });
        if (containerTypes.includes(block.type)) {
          walk(block.id);
        }
      }
    }
  };
  walk(null);
  return result;
}
function reparentBlockIndex(state, activeId, targetZone, containerTypes = []) {
  const byId = cloneMap(state.byId);
  const byParent = cloneParentMap(state.byParent);
  const dragged = byId.get(String(activeId));
  if (!dragged) return state;
  const zoneTargetId = extractUUID(targetZone);
  const isAfter = targetZone.startsWith("after-");
  const isInto = targetZone.startsWith("into-");
  const target = byId.get(zoneTargetId);
  const oldParentId = dragged.parentId ?? null;
  const newParentId = isInto ? zoneTargetId : target?.parentId ?? null;
  if (containerTypes.includes(dragged.type) && newParentId !== null) {
    const newParent = byId.get(newParentId);
    if (newParent && !containerTypes.includes(newParent.type)) {
      return state;
    }
  }
  if (dragged.id === zoneTargetId) return state;
  const oldList = byParent.get(oldParentId) ?? [];
  const filtered = oldList.filter((id) => id !== dragged.id);
  byParent.set(oldParentId, filtered);
  const newList = [...byParent.get(newParentId) ?? []];
  let insertIndex = newList.length;
  if (!isInto) {
    const idx = newList.indexOf(zoneTargetId);
    insertIndex = idx === -1 ? newList.length : isAfter ? idx + 1 : idx;
  }
  const currentIndex = newList.indexOf(dragged.id);
  if (dragged.parentId === newParentId && currentIndex === insertIndex) {
    return state;
  }
  newList.splice(insertIndex, 0, dragged.id);
  byParent.set(newParentId, newList);
  byId.set(dragged.id, {
    ...dragged,
    parentId: newParentId
  });
  return { byId, byParent };
}
function getDescendantIds(state, parentId) {
  const toDelete = /* @__PURE__ */ new Set();
  const stack = [parentId];
  while (stack.length > 0) {
    const current = stack.pop();
    toDelete.add(current);
    const children = state.byParent.get(current) ?? [];
    stack.push(...children);
  }
  return toDelete;
}
function deleteBlockAndDescendants(state, id) {
  const byId = cloneMap(state.byId);
  const byParent = cloneParentMap(state.byParent);
  const idsToDelete = getDescendantIds(state, id);
  for (const deleteId of idsToDelete) {
    byId.delete(deleteId);
    byParent.delete(deleteId);
  }
  for (const [parent, list] of byParent.entries()) {
    byParent.set(parent, list.filter((itemId) => !idsToDelete.has(itemId)));
  }
  return { byId, byParent };
}
function BlockTree({
  blocks,
  renderers,
  containerTypes = [],
  onChange,
  dragOverlay,
  activationDistance = 8,
  previewDebounce = 150,
  className = "flex flex-col gap-1",
  dropZoneClassName,
  dropZoneActiveClassName,
  indentClassName
}) {
  const sensors = useConfiguredSensors({ activationDistance });
  const stateRef = useRef({
    activeId: null,
    hoverZone: null,
    expandedMap: {},
    virtualState: null
  });
  const initialBlocksRef = useRef([]);
  const cachedReorderRef = useRef(null);
  const [, forceRender] = useReducer((x) => x + 1, 0);
  const debouncedSetVirtual = useRef(
    debounce((newBlocks) => {
      if (newBlocks) {
        stateRef.current.virtualState = computeNormalizedIndex(newBlocks);
      } else {
        stateRef.current.virtualState = null;
      }
      forceRender();
    }, previewDebounce)
  ).current;
  const effectiveIndex = stateRef.current.virtualState ?? computeNormalizedIndex(blocks);
  const blocksByParent = /* @__PURE__ */ new Map();
  for (const [parentId, ids] of effectiveIndex.byParent.entries()) {
    blocksByParent.set(
      parentId,
      ids.map((id) => effectiveIndex.byId.get(id)).filter(Boolean)
    );
  }
  const activeBlock = stateRef.current.activeId ? effectiveIndex.byId.get(stateRef.current.activeId) ?? null : null;
  const handleDragStart = useCallback((event) => {
    const id = String(event.active.id);
    stateRef.current.activeId = id;
    initialBlocksRef.current = [...blocks];
    cachedReorderRef.current = null;
    forceRender();
  }, [blocks]);
  const handleDragOver = useCallback((event) => {
    if (!event.over) return;
    const targetZone = String(event.over.id);
    const activeId = stateRef.current.activeId;
    if (!activeId) return;
    stateRef.current.hoverZone = targetZone;
    const baseIndex = computeNormalizedIndex(initialBlocksRef.current);
    const updatedIndex = reparentBlockIndex(baseIndex, activeId, targetZone, containerTypes);
    const orderedBlocks = buildOrderedBlocks(updatedIndex, containerTypes);
    cachedReorderRef.current = { targetId: targetZone, reorderedBlocks: orderedBlocks };
    debouncedSetVirtual(orderedBlocks);
  }, [containerTypes, debouncedSetVirtual]);
  const handleDragEnd = useCallback((_event) => {
    debouncedSetVirtual.cancel();
    const cached = cachedReorderRef.current;
    stateRef.current.activeId = null;
    stateRef.current.hoverZone = null;
    stateRef.current.virtualState = null;
    cachedReorderRef.current = null;
    initialBlocksRef.current = [];
    if (cached && onChange) {
      onChange(cached.reorderedBlocks);
    }
    forceRender();
  }, [debouncedSetVirtual, onChange]);
  const handleHover = useCallback((zoneId, _parentId) => {
    const activeId = stateRef.current.activeId;
    if (!activeId) return;
    stateRef.current.hoverZone = zoneId;
    const baseIndex = computeNormalizedIndex(initialBlocksRef.current);
    const updatedIndex = reparentBlockIndex(baseIndex, activeId, zoneId, containerTypes);
    const orderedBlocks = buildOrderedBlocks(updatedIndex, containerTypes);
    cachedReorderRef.current = { targetId: zoneId, reorderedBlocks: orderedBlocks };
    debouncedSetVirtual(orderedBlocks);
  }, [containerTypes, debouncedSetVirtual]);
  const handleToggleExpand = useCallback((id) => {
    stateRef.current.expandedMap = {
      ...stateRef.current.expandedMap,
      [id]: stateRef.current.expandedMap[id] === false
    };
    forceRender();
  }, []);
  return /* @__PURE__ */ jsxs(
    DndContext,
    {
      sensors,
      collisionDetection: weightedVerticalCollision,
      onDragStart: handleDragStart,
      onDragOver: handleDragOver,
      onDragEnd: handleDragEnd,
      children: [
        /* @__PURE__ */ jsx("div", { className, children: /* @__PURE__ */ jsx(
          TreeRenderer,
          {
            blocks,
            blocksByParent,
            parentId: null,
            activeId: stateRef.current.activeId,
            expandedMap: stateRef.current.expandedMap,
            renderers,
            containerTypes,
            onHover: handleHover,
            onToggleExpand: handleToggleExpand,
            dropZoneClassName,
            dropZoneActiveClassName,
            indentClassName,
            rootClassName: className
          }
        ) }),
        /* @__PURE__ */ jsx(DragOverlay, { activeBlock, children: dragOverlay })
      ]
    }
  );
}
function blockReducer(state, action, containerTypes = []) {
  switch (action.type) {
    case "ADD_ITEM": {
      const byId = cloneMap(state.byId);
      const byParent = cloneParentMap(state.byParent);
      const item = action.payload;
      byId.set(item.id, item);
      const parentKey = item.parentId ?? null;
      const list = byParent.get(parentKey) ?? [];
      const insertAt = typeof item.order === "number" && item.order <= list.length ? item.order : list.length;
      const newList = [...list];
      newList.splice(insertAt, 0, item.id);
      byParent.set(parentKey, newList);
      return { byId, byParent };
    }
    case "INSERT_ITEM": {
      const { item, parentId, index } = action.payload;
      const updated = new Map(state.byParent);
      const siblings = [...updated.get(parentId) ?? []];
      siblings.splice(index, 0, item.id);
      updated.set(parentId, siblings);
      return {
        byId: new Map(state.byId).set(item.id, item),
        byParent: updated
      };
    }
    case "DELETE_ITEM": {
      return deleteBlockAndDescendants(state, action.payload.id);
    }
    case "SET_ALL": {
      return computeNormalizedIndex(action.payload);
    }
    case "MOVE_ITEM": {
      return reparentBlockIndex(
        state,
        action.payload.activeId,
        action.payload.targetZone,
        containerTypes
      );
    }
    default:
      return state;
  }
}
function createBlockState() {
  const BlockContext = createContext(null);
  function useBlockState() {
    const ctx = useContext(BlockContext);
    if (!ctx) throw new Error("useBlockState must be used inside BlockStateProvider");
    return ctx;
  }
  function BlockStateProvider({
    children,
    initialBlocks = [],
    containerTypes = [],
    onChange
  }) {
    const reducerWithContainerTypes = useCallback(
      (state2, action) => blockReducer(state2, action, containerTypes),
      [containerTypes]
    );
    const [state, dispatch] = useReducer(
      reducerWithContainerTypes,
      computeNormalizedIndex(initialBlocks)
    );
    const [lastCreatedItem, setLastCreatedItem] = useState(null);
    const blocks = useMemo(() => {
      const result = [];
      const walk = (parentId) => {
        const children2 = state.byParent.get(parentId) ?? [];
        for (let i = 0; i < children2.length; i++) {
          const id = children2[i];
          const b = state.byId.get(id);
          if (b) {
            result.push({ ...b, order: i });
            if (containerTypes.includes(b.type)) walk(b.id);
          }
        }
      };
      walk(null);
      return result;
    }, [state, containerTypes]);
    useMemo(() => {
      onChange?.(blocks);
    }, [blocks, onChange]);
    const blockMap = useMemo(() => state.byId, [state]);
    const childrenMap = useMemo(() => {
      const map = /* @__PURE__ */ new Map();
      for (const [parentId, ids] of state.byParent.entries()) {
        map.set(
          parentId,
          ids.map((id) => state.byId.get(id)).filter(Boolean)
        );
      }
      return map;
    }, [state]);
    const indexMap = useMemo(() => {
      const map = /* @__PURE__ */ new Map();
      for (const ids of state.byParent.values()) {
        ids.forEach((id, index) => {
          map.set(id, index);
        });
      }
      return map;
    }, [state]);
    const createItem = useCallback(
      (type, parentId = null) => {
        const newItem = {
          id: generateId(),
          type,
          parentId,
          order: 0
        };
        dispatch({ type: "ADD_ITEM", payload: newItem });
        setLastCreatedItem(newItem);
        return newItem;
      },
      []
    );
    const insertItem = useCallback(
      (type, referenceId, position) => {
        const referenceBlock = state.byId.get(referenceId);
        if (!referenceBlock) throw new Error(`Reference block ${referenceId} not found`);
        const parentId = referenceBlock.parentId ?? null;
        const siblings = state.byParent.get(parentId) ?? [];
        const index = siblings.indexOf(referenceId);
        const insertIndex = position === "before" ? index : index + 1;
        const newItem = {
          id: generateId(),
          type,
          parentId,
          order: insertIndex
        };
        dispatch({
          type: "INSERT_ITEM",
          payload: { item: newItem, parentId, index: insertIndex }
        });
        setLastCreatedItem(newItem);
        return newItem;
      },
      [state]
    );
    const deleteItem = useCallback((id) => {
      dispatch({ type: "DELETE_ITEM", payload: { id } });
    }, []);
    const moveItem = useCallback((activeId, targetZone) => {
      dispatch({ type: "MOVE_ITEM", payload: { activeId, targetZone } });
    }, []);
    const setAll = useCallback((all) => {
      dispatch({ type: "SET_ALL", payload: all });
    }, []);
    const value = useMemo(
      () => ({
        blocks,
        blockMap,
        childrenMap,
        indexMap,
        normalizedIndex: state,
        createItem,
        insertItem,
        deleteItem,
        moveItem,
        setAll
      }),
      [
        blocks,
        blockMap,
        childrenMap,
        indexMap,
        state,
        createItem,
        insertItem,
        deleteItem,
        moveItem,
        setAll
      ]
    );
    return /* @__PURE__ */ jsx(BlockContext.Provider, { value, children });
  }
  return {
    BlockStateProvider,
    useBlockState
  };
}
function expandReducer(state, action) {
  switch (action.type) {
    case "TOGGLE":
      return { ...state, [action.id]: !state[action.id] };
    case "SET_ALL": {
      const newState = {};
      for (const id of action.ids) {
        newState[id] = action.expanded;
      }
      return newState;
    }
    default:
      return state;
  }
}
function createTreeState(options = {}) {
  const { previewDebounce = 150, containerTypes = [] } = options;
  const TreeContext = createContext(null);
  function useTreeState() {
    const ctx = useContext(TreeContext);
    if (!ctx) throw new Error("useTreeState must be used inside TreeStateProvider");
    return ctx;
  }
  function TreeStateProvider({ children, blocks, blockMap }) {
    const [activeId, setActiveId] = useState(null);
    const [hoverZone, setHoverZone] = useState(null);
    const [virtualState, setVirtualState] = useState(null);
    const [expandedMap, dispatchExpand] = useReducer(expandReducer, {});
    const initialBlocksRef = useRef([]);
    const cachedReorderRef = useRef(null);
    const activeBlock = useMemo(() => {
      if (!activeId) return null;
      return blockMap.get(activeId) ?? null;
    }, [activeId, blockMap]);
    const debouncedSetVirtualBlocks = useMemo(
      () => debounce((newBlocks) => {
        if (!newBlocks) {
          setVirtualState(null);
        } else {
          setVirtualState(computeNormalizedIndex(newBlocks));
        }
      }, previewDebounce),
      [previewDebounce]
    );
    const effectiveState = useMemo(() => {
      return virtualState ?? computeNormalizedIndex(blocks);
    }, [virtualState, blocks]);
    const effectiveBlocks = useMemo(() => {
      return buildOrderedBlocks(effectiveState, containerTypes);
    }, [effectiveState, containerTypes]);
    const blocksByParent = useMemo(() => {
      const map = /* @__PURE__ */ new Map();
      for (const [parentId, ids] of effectiveState.byParent.entries()) {
        map.set(
          parentId,
          ids.map((id) => effectiveState.byId.get(id)).filter(Boolean)
        );
      }
      return map;
    }, [effectiveState]);
    const handleDragStart = useCallback(
      (id) => {
        setActiveId(id);
        if (id) {
          initialBlocksRef.current = [...blocks];
          cachedReorderRef.current = null;
        }
      },
      [blocks]
    );
    const handleDragOver = useCallback(
      (targetZone) => {
        if (!activeId) return;
        setHoverZone(targetZone);
        const baseIndex = computeNormalizedIndex(initialBlocksRef.current);
        const updatedIndex = reparentBlockIndex(baseIndex, activeId, targetZone, containerTypes);
        const orderedBlocks = buildOrderedBlocks(updatedIndex, containerTypes);
        cachedReorderRef.current = { targetId: targetZone, reorderedBlocks: orderedBlocks };
        debouncedSetVirtualBlocks(orderedBlocks);
      },
      [activeId, debouncedSetVirtualBlocks, containerTypes]
    );
    useCallback(() => {
      debouncedSetVirtualBlocks.cancel();
      setVirtualState(null);
      setActiveId(null);
      setHoverZone(null);
      const result = cachedReorderRef.current;
      cachedReorderRef.current = null;
      initialBlocksRef.current = [];
      return result;
    }, [debouncedSetVirtualBlocks]);
    const handleHover = useCallback(
      (zoneId, _parentId) => {
        if (!activeId) return;
        handleDragOver(zoneId);
      },
      [activeId, handleDragOver]
    );
    const toggleExpand = useCallback((id) => {
      dispatchExpand({ type: "TOGGLE", id });
    }, []);
    const setExpandAll = useCallback(
      (expanded) => {
        const containerIds = blocks.filter((b) => containerTypes.includes(b.type)).map((b) => b.id);
        dispatchExpand({ type: "SET_ALL", expanded, ids: containerIds });
      },
      [blocks, containerTypes]
    );
    useEffect(() => {
      return () => {
        debouncedSetVirtualBlocks.cancel();
      };
    }, [debouncedSetVirtualBlocks]);
    const value = useMemo(
      () => ({
        activeId,
        activeBlock,
        hoverZone,
        expandedMap,
        effectiveBlocks,
        blocksByParent,
        setActiveId: handleDragStart,
        setHoverZone,
        toggleExpand,
        setExpandAll,
        handleHover
      }),
      [
        activeId,
        activeBlock,
        hoverZone,
        expandedMap,
        effectiveBlocks,
        blocksByParent,
        handleDragStart,
        toggleExpand,
        setExpandAll,
        handleHover
      ]
    );
    return /* @__PURE__ */ jsx(TreeContext.Provider, { value, children });
  }
  return {
    TreeStateProvider,
    useTreeState
  };
}

export { BlockTree, DragOverlay, DropZone, TreeRenderer, buildOrderedBlocks, cloneMap, cloneParentMap, closestCenterCollision, computeNormalizedIndex, createBlockState, createTreeState, debounce, deleteBlockAndDescendants, extractBlockId, extractUUID, generateId, getDescendantIds, getDropZoneType, getSensorConfig, reparentBlockIndex, useConfiguredSensors, weightedVerticalCollision };
//# sourceMappingURL=index.mjs.map
//# sourceMappingURL=index.mjs.map