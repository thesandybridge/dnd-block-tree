'use client'

import { ChevronRight, GripVertical } from 'lucide-react'
import type { ContainerRendererProps } from 'dnd-block-tree'
import type { ProductivityBlock } from '../types'
import { cn } from '@/lib/utils'

type Props = ContainerRendererProps<ProductivityBlock & { type: 'section' }>

export function SectionBlock({
  block,
  children,
  isDragging,
  isExpanded,
  onToggleExpand,
}: Props) {
  return (
    <div
      className={cn(
        'rounded-xl border border-border/50 bg-card w-full min-w-0 max-w-full',
        'transition-all duration-200',
        isDragging && 'opacity-40 scale-[0.98]'
      )}
    >
      <div className="flex items-center gap-2 p-2 folder-header group min-w-0">
        <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground cursor-grab drag-handle" />

        <button
          onClick={(e) => {
            e.stopPropagation()
            onToggleExpand()
          }}
          className={cn(
            'p-1 shrink-0 rounded-md transition-colors',
            'hover:bg-muted/80 active:scale-95'
          )}
        >
          <div className={cn(
            'transition-transform duration-200',
            isExpanded && 'rotate-90'
          )}>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </div>
        </button>

        <span className="font-semibold text-foreground flex-1 min-w-0 truncate">
          {block.title}
        </span>

        <span className="hidden sm:inline text-[10px] text-muted-foreground/60 uppercase tracking-widest font-medium shrink-0">
          Section
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
