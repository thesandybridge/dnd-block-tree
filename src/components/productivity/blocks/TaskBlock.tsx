import { Check, GripVertical } from 'lucide-react'
import type { BlockRendererProps } from '@dnd-block-tree/react'
import type { ProductivityBlock } from '../types'
import { cn } from '@/lib/utils'

type Props = BlockRendererProps<ProductivityBlock & { type: 'task' }> & {
  onToggle?: () => void
}

export function TaskBlock({ block, isDragging, onToggle }: Props) {
  return (
    <div
      className={cn(
        'flex items-center gap-2 p-2 rounded-lg border border-border/30 bg-card/50',
        'block-item group w-full min-w-0 max-w-full',
        isDragging && 'opacity-40 scale-[0.98]'
      )}
    >
      <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground cursor-grab drag-handle" />

      <button
        onClick={(e) => {
          e.stopPropagation()
          onToggle?.()
        }}
        className={cn(
          'h-5 w-5 shrink-0 rounded-full border-2 flex items-center justify-center',
          'transition-all duration-200',
          block.completed
            ? 'bg-primary border-primary checkbox-complete'
            : 'border-muted-foreground/40 hover:border-primary hover:scale-110'
        )}
      >
        {block.completed && (
          <Check className="h-3 w-3 text-primary-foreground" strokeWidth={3} />
        )}
      </button>

      <span
        className={cn(
          'flex-1 min-w-0 truncate transition-all duration-200',
          block.completed && 'line-through text-muted-foreground/60'
        )}
      >
        {block.title}
      </span>

      {block.dueDate && (
        <span className={cn(
          'hidden sm:inline-block text-xs px-2.5 py-1 rounded-full shrink-0',
          'bg-muted/80 text-muted-foreground',
          'transition-colors duration-150'
        )}>
          {block.dueDate}
        </span>
      )}

      <span className="hidden xs:inline text-[10px] text-muted-foreground/50 uppercase tracking-widest font-medium shrink-0 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
        Task
      </span>
    </div>
  )
}
