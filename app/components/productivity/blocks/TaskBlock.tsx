'use client'

import { Check, GripVertical } from 'lucide-react'
import type { BlockRendererProps } from 'dnd-block-tree'
import type { ProductivityBlock } from '../types'
import { cn } from '@/lib/utils'

type Props = BlockRendererProps<ProductivityBlock & { type: 'task' }> & {
  onToggle?: () => void
}

export function TaskBlock({ block, isDragging, onToggle }: Props) {
  return (
    <div
      className={cn(
        'flex items-center gap-3 p-3 rounded-lg border border-border/50 bg-card block-item corona-glow-hover',
        isDragging && 'opacity-50'
      )}
    >
      <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />

      <button
        onClick={(e) => {
          e.stopPropagation()
          onToggle?.()
        }}
        className={cn(
          'h-5 w-5 rounded-full border-2 flex items-center justify-center transition-colors',
          block.completed
            ? 'bg-primary border-primary'
            : 'border-muted-foreground hover:border-primary'
        )}
      >
        {block.completed && <Check className="h-3 w-3 text-primary-foreground" />}
      </button>

      <span
        className={cn(
          'flex-1',
          block.completed && 'line-through text-muted-foreground'
        )}
      >
        {block.title}
      </span>

      {block.dueDate && (
        <span className="text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground">
          {block.dueDate}
        </span>
      )}

      <span className="text-xs text-muted-foreground uppercase tracking-wider">
        Task
      </span>
    </div>
  )
}
