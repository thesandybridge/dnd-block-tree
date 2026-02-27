import { GripVertical, StickyNote } from 'lucide-react'
import type { BlockRendererProps } from '@dnd-block-tree/react'
import type { ProductivityBlock } from '../types'
import { cn } from '@/lib/utils'

type Props = BlockRendererProps<ProductivityBlock & { type: 'note' }>

export function NoteBlock({ block, isDragging }: Props) {
  return (
    <div
      className={cn(
        'flex items-start gap-2 p-2 rounded-lg border border-border/30 bg-card/50',
        'block-item group w-full min-w-0 max-w-full',
        isDragging && 'opacity-40 scale-[0.98]'
      )}
    >
      <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground cursor-grab drag-handle mt-0.5" />

      <StickyNote className="h-4 w-4 shrink-0 text-primary/80 mt-0.5 transition-colors group-hover:text-primary" />

      <span className="flex-1 min-w-0 text-sm text-muted-foreground leading-relaxed break-words">
        {block.title}
      </span>

      <span className="hidden xs:inline text-[10px] text-muted-foreground/50 uppercase tracking-widest font-medium shrink-0 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
        Note
      </span>
    </div>
  )
}
