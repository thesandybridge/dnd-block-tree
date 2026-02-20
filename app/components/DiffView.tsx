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

  const changeMap = useMemo(
    () => computeDiff(prevBlocksRef.current, blocks),
    [blocks]
  )

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
    <div className="rounded-xl border border-border/30 bg-card/30 overflow-hidden flex flex-col max-h-64 backdrop-blur-sm">
      <div className="px-3 py-2.5 border-b border-border/30 flex items-center justify-between">
        <span className="text-[10px] font-semibold text-muted-foreground/70 uppercase tracking-widest">
          Structure
        </span>
        <div className="flex gap-3 text-[11px] font-medium">
          {stats.added > 0 && (
            <span className="text-emerald-500 dark:text-emerald-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-current" />
              {stats.added} new
            </span>
          )}
          {stats.moved > 0 && (
            <span className="text-amber-500 dark:text-amber-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-current" />
              {stats.moved} moved
            </span>
          )}
          {!hasChanges && (
            <span className="text-muted-foreground/50">No changes</span>
          )}
        </div>
      </div>

      <div className="p-2 flex-1 overflow-auto font-mono text-[11px] leading-relaxed">
        {tree.map(({ block, changeType, depth }) => (
          <div
            key={block.id}
            style={{ paddingLeft: depth * 14 }}
            className={cn(
              'py-1 px-2 rounded-md flex items-center gap-2',
              'transition-colors duration-150',
              changeType === 'added' && 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
              changeType === 'moved' && 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
              changeType === 'unchanged' && 'text-muted-foreground/70 hover:bg-muted/30'
            )}
          >
            <span className="w-3 text-center font-bold text-[10px]">
              {changeType === 'added' && '+'}
              {changeType === 'moved' && '~'}
            </span>
            <span className={cn(
              'uppercase text-[9px] tracking-wider w-14',
              changeType === 'unchanged' && 'opacity-50'
            )}>
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
