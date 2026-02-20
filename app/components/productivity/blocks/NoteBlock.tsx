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
        'flex items-start gap-3 p-3 rounded-lg border border-border/30 bg-card/50',
        'block-item group',
        isDragging && 'opacity-40 scale-[0.98]'
      )}
    >
      <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab drag-handle mt-0.5" />

      <StickyNote className="h-4 w-4 text-primary/80 mt-0.5 transition-colors group-hover:text-primary" />

      <span className="flex-1 text-sm text-muted-foreground leading-relaxed">
        {block.title}
      </span>

      <span className="text-[10px] text-muted-foreground/50 uppercase tracking-widest font-medium opacity-0 group-hover:opacity-100 transition-opacity">
        Note
      </span>
    </div>
  )
}
