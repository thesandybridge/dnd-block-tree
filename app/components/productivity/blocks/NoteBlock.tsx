'use client'

import { GripVertical, StickyNote } from 'lucide-react'
import type { BlockRendererProps } from 'dnd-block-tree'
import type { ProductivityBlock } from '../types'
import { cn } from '@/lib/utils'

type Props = BlockRendererProps<ProductivityBlock & { type: 'note' }>

export function NoteBlock({ block, isDragging }: Props) {
  return (
    <div
      className={cn(
        'flex items-start gap-3 p-3 rounded-lg border border-border/50 bg-card block-item corona-glow-hover',
        isDragging && 'opacity-50'
      )}
    >
      <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab mt-0.5" />

      <StickyNote className="h-4 w-4 text-primary mt-0.5" />

      <span className="flex-1 text-sm">
        {block.title}
      </span>

      <span className="text-xs text-muted-foreground uppercase tracking-wider">
        Note
      </span>
    </div>
  )
}
