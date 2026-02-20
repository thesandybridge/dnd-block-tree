'use client'

import { ChevronDown, ChevronRight, Folder, FolderOpen, GripVertical } from 'lucide-react'
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
  return (
    <div
      className={cn(
        'rounded-lg border border-border/50 bg-card',
        isDragging && 'opacity-50'
      )}
    >
      <div className="flex items-center gap-2 p-2 hover:bg-muted/50 rounded-t-lg transition-colors">
        <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />

        <button
          onClick={(e) => {
            e.stopPropagation()
            onToggleExpand()
          }}
          className="p-0.5 hover:bg-muted rounded"
        >
          {isExpanded ? (
            <ChevronDown className="h-3 w-3 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-3 w-3 text-muted-foreground" />
          )}
        </button>

        {isExpanded ? (
          <FolderOpen className="h-4 w-4 text-primary" />
        ) : (
          <Folder className="h-4 w-4 text-primary" />
        )}

        <span className="font-medium text-foreground text-sm flex-1">
          {block.name}
        </span>
      </div>

      {isExpanded && (
        <div className="px-2 pb-2">
          {children}
        </div>
      )}
    </div>
  )
}
