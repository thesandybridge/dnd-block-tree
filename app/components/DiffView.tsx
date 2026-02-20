'use client'

import { useMemo, useRef, useEffect } from 'react'
import type { BaseBlock } from 'dnd-block-tree'
import { cn } from '@/lib/utils'

interface DiffViewProps<T extends BaseBlock> {
  blocks: T[]
  getLabel?: (block: T) => string
}

type ChangeType = 'added' | 'moved' | 'unchanged'

interface DiffBlock<T extends BaseBlock> {
  block: T
  changeType: ChangeType
  depth: number
}

function computeDiff<T extends BaseBlock>(
  prev: T[],
  next: T[]
): Map<string, ChangeType> {
  const prevMap = new Map(prev.map(b => [b.id, b]))
  const changeMap = new Map<string, ChangeType>()

  for (const block of next) {
    const prevBlock = prevMap.get(block.id)

    if (!prevBlock) {
      changeMap.set(block.id, 'added')
    } else if (prevBlock.parentId !== block.parentId || prevBlock.order !== block.order) {
      changeMap.set(block.id, 'moved')
    } else {
      changeMap.set(block.id, 'unchanged')
    }
  }

  return changeMap
}

function buildTree<T extends BaseBlock>(
  blocks: T[],
  changeMap: Map<string, ChangeType>
): DiffBlock<T>[] {
  const result: DiffBlock<T>[] = []
  const byParent = new Map<string | null, T[]>()

  for (const block of blocks) {
    const key = block.parentId ?? null
    const list = byParent.get(key) ?? []
    list.push(block)
    byParent.set(key, list)
  }

  function walk(parentId: string | null, depth: number) {
    const children = byParent.get(parentId) ?? []
    children.sort((a, b) => a.order - b.order)

    for (const block of children) {
      result.push({
        block,
        changeType: changeMap.get(block.id) ?? 'unchanged',
        depth,
      })
      walk(block.id, depth + 1)
    }
  }

  walk(null, 0)
  return result
}

export function DiffView<T extends BaseBlock>({
  blocks,
  getLabel = (b) => b.type,
}: DiffViewProps<T>) {
  const prevBlocksRef = useRef<T[]>(blocks)

  // Compute diff during render (before ref update)
  const changeMap = useMemo(
    () => computeDiff(prevBlocksRef.current, blocks),
    [blocks]
  )

  // Update prev ref after render
  useEffect(() => {
    prevBlocksRef.current = blocks
  }, [blocks])

  const tree = useMemo(
    () => buildTree(blocks, changeMap),
    [blocks, changeMap]
  )

  const stats = useMemo(() => {
    let added = 0
    let moved = 0
    for (const { changeType } of tree) {
      if (changeType === 'added') added++
      if (changeType === 'moved') moved++
    }
    return { added, moved }
  }, [tree])

  const hasChanges = stats.added > 0 || stats.moved > 0

  return (
    <div className="rounded-lg border border-border/50 bg-card overflow-hidden flex flex-col h-full">
      {/* Header */}
      <div className="px-3 py-2 border-b border-border/50 bg-muted/30 flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Tree View
        </span>
        <div className="flex gap-3 text-xs">
          {stats.added > 0 && (
            <span className="text-green-600 dark:text-green-400">
              +{stats.added} added
            </span>
          )}
          {stats.moved > 0 && (
            <span className="text-amber-600 dark:text-amber-400">
              ~{stats.moved} moved
            </span>
          )}
          {!hasChanges && (
            <span className="text-muted-foreground">No changes</span>
          )}
        </div>
      </div>

      {/* Tree */}
      <div className="p-2 flex-1 overflow-auto font-mono text-xs">
        {tree.map(({ block, changeType, depth }) => (
          <div
            key={block.id}
            style={{ paddingLeft: depth * 16 }}
            className={cn(
              'py-0.5 px-2 rounded flex items-center gap-2',
              changeType === 'added' && 'bg-green-500/10 text-green-700 dark:text-green-400',
              changeType === 'moved' && 'bg-amber-500/10 text-amber-700 dark:text-amber-400',
              changeType === 'unchanged' && 'text-muted-foreground'
            )}
          >
            <span className="w-4 text-center font-bold">
              {changeType === 'added' && '+'}
              {changeType === 'moved' && '~'}
            </span>
            <span className="uppercase text-[10px] opacity-70 w-16">
              {block.type}
            </span>
            <span className="truncate flex-1">
              {getLabel(block)}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
