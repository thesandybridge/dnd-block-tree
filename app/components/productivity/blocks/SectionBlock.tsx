'use client'

import { ChevronDown, ChevronRight, GripVertical, Plus } from 'lucide-react'
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
        'rounded-xl border border-border/50 bg-card corona-glow-hover',
        isDragging && 'opacity-50'
      )}
    >
      <div className="flex items-center gap-2 p-3">
        <button
          onClick={(e) => {
            e.stopPropagation()
            onToggleExpand()
          }}
          className="p-1 hover:bg-muted rounded"
        >
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
        </button>

        <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />

        <span className="font-semibold text-foreground flex-1">
          {block.title}
        </span>

        <span className="text-xs text-muted-foreground uppercase tracking-wider">
          Section
        </span>
      </div>

      {isExpanded && (
        <div className="px-3 pb-3">
          {children}
        </div>
      )}
    </div>
  )
}
