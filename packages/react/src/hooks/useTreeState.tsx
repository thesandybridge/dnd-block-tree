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
} from 'react'
import type { BaseBlock, BlockIndex } from '@dnd-block-tree/core'
import {
  expandReducer,
  computeNormalizedIndex,
  reparentBlockIndex,
  buildOrderedBlocks,
  debounce,
} from '@dnd-block-tree/core'
import type { TreeStateContextValue, TreeStateProviderProps } from '../types'

interface CreateTreeStateOptions<T extends BaseBlock> {
  previewDebounce?: number
  containerTypes?: string[]
}

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

    const [virtualState, setVirtualState] = useState<BlockIndex<T> | null>(null)

    const [expandedMap, dispatchExpand] = useReducer(expandReducer, {})

    const initialBlocksRef = useRef<T[]>([])
    const cachedReorderRef = useRef<{ targetId: string; reorderedBlocks: T[] } | null>(null)

    const activeBlock = useMemo(() => {
      if (!activeId) return null
      return blockMap.get(activeId) ?? null
    }, [activeId, blockMap])

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

    const effectiveState = useMemo(() => {
      return virtualState ?? computeNormalizedIndex(blocks)
    }, [virtualState, blocks])

    const effectiveBlocks = useMemo(() => {
      return buildOrderedBlocks(effectiveState, containerTypes)
    }, [effectiveState, containerTypes])

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

    const handleDragOver = useCallback(
      (targetZone: string) => {
        if (!activeId) return

        setHoverZone(targetZone)

        const baseIndex = computeNormalizedIndex(initialBlocksRef.current)
        const updatedIndex = reparentBlockIndex(baseIndex, activeId, targetZone, containerTypes)
        const orderedBlocks = buildOrderedBlocks(updatedIndex, containerTypes)

        cachedReorderRef.current = { targetId: targetZone, reorderedBlocks: orderedBlocks }

        debouncedSetVirtualBlocks(orderedBlocks)
      },
      [activeId, debouncedSetVirtualBlocks, containerTypes]
    )

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

    const handleHover = useCallback(
      (zoneId: string, _parentId: string | null) => {
        if (!activeId) return
        handleDragOver(zoneId)
      },
      [activeId, handleDragOver]
    )

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
