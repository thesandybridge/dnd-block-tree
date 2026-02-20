'use client'

import { ChevronRight, Folder, FolderOpen, GripVertical } from 'lucide-react'
import type { ContainerRendererProps } from 'dnd-block-tree'
import type { FileSystemBlock } from '../types'
import { cn } from '@/lib/utils'

type Props = ContainerRendererProps<FileSystemBlock & { type: 'folder' }>

export function FolderBlock({
  block,
  children,
  isDragging,
  isExpanded,
  onToggleExpand,
}: Props) {
  const Icon = isExpanded ? FolderOpen : Folder

  return (
    <div
      className={cn(
        'rounded-lg border border-border/30 bg-card/50 w-full min-w-0 max-w-full',
        'transition-all duration-200',
        isDragging && 'opacity-40 scale-[0.98]'
      )}
    >
      <div className={cn(
        'flex items-center gap-2 p-2 folder-header group min-w-0',
        'transition-colors duration-150',
        'hover:bg-muted/40'
      )}>
        <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground cursor-grab drag-handle" />

        <button
          onClick={(e) => {
            e.stopPropagation()
            onToggleExpand()
          }}
          className={cn(
            'p-0.5 shrink-0 rounded transition-colors',
            'hover:bg-muted/80 active:scale-95'
          )}
        >
          <div className={cn(
            'transition-transform duration-200',
            isExpanded && 'rotate-90'
          )}>
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
        </button>

        <Icon className={cn(
          'h-4 w-4 shrink-0 transition-colors duration-200',
          isExpanded ? 'text-primary' : 'text-primary/70'
        )} />

        <span className="font-medium text-foreground text-sm flex-1 min-w-0 truncate">
          {block.name}
        </span>
      </div>

      {isExpanded && (
        <div className="px-2 pb-2 folder-children w-full min-w-0 max-w-full">
          {children}
        </div>
      )}
    </div>
  )
}
