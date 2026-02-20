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
        'rounded-xl border border-border/50 bg-card overflow-hidden',
        'transition-all duration-200',
        isDragging && 'opacity-40 scale-[0.98]'
      )}
    >
      <div className="flex items-center gap-2 p-3 folder-header group">
        <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab drag-handle" />

        <button
          onClick={(e) => {
            e.stopPropagation()
            onToggleExpand()
          }}
          className={cn(
            'p-1 rounded-md transition-colors',
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

        <span className="font-semibold text-foreground flex-1">
          {block.title}
        </span>

        <span className="text-[10px] text-muted-foreground/60 uppercase tracking-widest font-medium">
          Section
        </span>
      </div>

      {isExpanded && (
        <div className="px-3 pb-3 folder-children">
          {children}
        </div>
      )}
    </div>
  )
}
