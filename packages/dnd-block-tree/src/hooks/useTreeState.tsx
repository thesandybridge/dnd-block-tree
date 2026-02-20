'use client'

import {
  createContext,
  useContext,
  useState,
  useMemo,
  useCallback,
  useReducer,
  useRef,
  useEffect,
  type ReactNode,
} from 'react'
import type { BaseBlock, BlockIndex, TreeStateContextValue, TreeStateProviderProps } from '../core/types'
import { computeNormalizedIndex, reparentBlockIndex, buildOrderedBlocks } from '../utils/blocks'
import { debounce } from '../utils/helper'

type ExpandAction =
  | { type: 'TOGGLE'; id: string }
  | { type: 'SET_ALL'; expanded: boolean; ids: string[] }

function expandReducer(
  state: Record<string, boolean>,
  action: ExpandAction
): Record<string, boolean> {
  switch (action.type) {
    case 'TOGGLE':
      return { ...state, [action.id]: !state[action.id] }
    case 'SET_ALL': {
      const newState: Record<string, boolean> = {}
      for (const id of action.ids) {
        newState[id] = action.expanded
      }
      return newState
    }
    default:
      return state
  }
}

interface CreateTreeStateOptions<T extends BaseBlock> {
  previewDebounce?: number
  containerTypes?: string[]
}

/**
 * Create tree state context and hooks
 * Handles UI state: active drag, hover zone, expand/collapse, virtual preview
 */
export function createTreeState<T extends BaseBlock>(options: CreateTreeStateOptions<T> = {}) {
  const { previewDebounce = 150, containerTypes = [] } = options

  const TreeContext = createContext<TreeStateContextValue<T> | null>(null)

  function useTreeState() {
    const ctx = useContext(TreeContext)
    if (!ctx) throw new Error('useTreeState must be used inside TreeStateProvider')
    return ctx
  }

  function TreeStateProvider({ children, blocks, blockMap }: TreeStateProviderProps<T>) {
    const [activeId, setActiveId] = useState<string | null>(null)
    const [hoverZone, setHoverZone] = useState<string | null>(null)

    // Virtual state for debounced preview
    const [virtualState, setVirtualState] = useState<BlockIndex<T> | null>(null)

    // Expand/collapse state
    const [expandedMap, dispatchExpand] = useReducer(expandReducer, {})

    // Snapshot-based computation refs
    const initialBlocksRef = useRef<T[]>([])
    const cachedReorderRef = useRef<{ targetId: string; reorderedBlocks: T[] } | null>(null)

    // Get active block
    const activeBlock = useMemo(() => {
      if (!activeId) return null
      return blockMap.get(activeId) ?? null
    }, [activeId, blockMap])

    // Debounced virtual state setter
    const debouncedSetVirtualBlocks = useMemo(
      () =>
        debounce((newBlocks: T[] | null) => {
          if (!newBlocks) {
            setVirtualState(null)
          } else {
            setVirtualState(computeNormalizedIndex(newBlocks))
          }
        }, previewDebounce),
      [previewDebounce]
    )

    // Compute effective state (virtual takes precedence)
    const effectiveState = useMemo(() => {
      return virtualState ?? computeNormalizedIndex(blocks)
    }, [virtualState, blocks])

    // Compute effective blocks array
    const effectiveBlocks = useMemo(() => {
      return buildOrderedBlocks(effectiveState, containerTypes)
    }, [effectiveState, containerTypes])

    // Blocks by parent for rendering
    const blocksByParent = useMemo(() => {
      const map = new Map<string | null, T[]>()
      for (const [parentId, ids] of effectiveState.byParent.entries()) {
        map.set(
          parentId,
          ids.map(id => effectiveState.byId.get(id)!).filter(Boolean)
        )
      }
      return map
    }, [effectiveState])

    // Handle drag start - capture snapshot
    const handleDragStart = useCallback(
      (id: string | null) => {
        setActiveId(id)
        if (id) {
          initialBlocksRef.current = [...blocks]
          cachedReorderRef.current = null
        }
      },
      [blocks]
    )

    // Handle drag over - compute preview
    const handleDragOver = useCallback(
      (targetZone: string) => {
        if (!activeId) return

        setHoverZone(targetZone)

        // Compute preview from snapshot
        const baseIndex = computeNormalizedIndex(initialBlocksRef.current)
        const updatedIndex = reparentBlockIndex(baseIndex, activeId, targetZone, containerTypes)
        const orderedBlocks = buildOrderedBlocks(updatedIndex, containerTypes)

        // Cache for drag end
        cachedReorderRef.current = { targetId: targetZone, reorderedBlocks: orderedBlocks }

        // Debounced preview update
        debouncedSetVirtualBlocks(orderedBlocks)
      },
      [activeId, debouncedSetVirtualBlocks, containerTypes]
    )

    // Handle drag end - return cached result
    const handleDragEnd = useCallback(() => {
      debouncedSetVirtualBlocks.cancel()
      setVirtualState(null)
      setActiveId(null)
      setHoverZone(null)

      const result = cachedReorderRef.current
      cachedReorderRef.current = null
      initialBlocksRef.current = []

      return result
    }, [debouncedSetVirtualBlocks])

    // Hover handler for drop zones
    const handleHover = useCallback(
      (zoneId: string, _parentId: string | null) => {
        if (!activeId) return
        handleDragOver(zoneId)
      },
      [activeId, handleDragOver]
    )

    // Expand/collapse handlers
    const toggleExpand = useCallback((id: string) => {
      dispatchExpand({ type: 'TOGGLE', id })
    }, [])

    const setExpandAll = useCallback(
      (expanded: boolean) => {
        const containerIds = blocks.filter(b => containerTypes.includes(b.type)).map(b => b.id)
        dispatchExpand({ type: 'SET_ALL', expanded, ids: containerIds })
      },
      [blocks, containerTypes]
    )

    // Cleanup on unmount
    useEffect(() => {
      return () => {
        debouncedSetVirtualBlocks.cancel()
      }
    }, [debouncedSetVirtualBlocks])

    const value: TreeStateContextValue<T> = useMemo(
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
        handleHover,
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
        handleHover,
      ]
    )

    return <TreeContext.Provider value={value}>{children}</TreeContext.Provider>
  }

  return {
    TreeStateProvider,
    useTreeState,
  }
}
