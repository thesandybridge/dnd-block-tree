'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { ChevronRight, GripVertical, Check, StickyNote } from 'lucide-react'
import type { BlockRenderers, ContainerRendererProps, BlockRendererProps } from '@dnd-block-tree/react'
import type { ProductivityBlock } from '../productivity/types'
import { cn } from '@/lib/utils'

function KeyBadge({ order }: { order: number | string }) {
  return (
    <span className="font-mono text-[10px] text-muted-foreground/70 bg-muted/60 px-1.5 py-0.5 rounded shrink-0">
      {String(order)}
    </span>
  )
}

interface EditableTitleProps {
  blockId: string
  title: string
  isEditing: boolean
  onStartEdit: (id: string) => void
  onCommitEdit: (id: string, title: string) => void
  onCancelEdit: () => void
  className?: string
}

function EditableTitle({
  blockId,
  title,
  isEditing,
  onStartEdit,
  onCommitEdit,
  onCancelEdit,
  className,
}: EditableTitleProps) {
  const [draft, setDraft] = useState(title)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isEditing) {
      setDraft(title)
      // Focus after render
      requestAnimationFrame(() => inputRef.current?.select())
    }
  }, [isEditing, title])

  const handleCommit = useCallback(() => {
    const trimmed = draft.trim()
    if (trimmed && trimmed !== title) {
      onCommitEdit(blockId, trimmed)
    } else {
      onCancelEdit()
    }
  }, [draft, title, blockId, onCommitEdit, onCancelEdit])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    // Stop ALL propagation so dnd-kit's KeyboardSensor on the
    // draggable wrapper doesn't intercept space/arrow keys
    e.stopPropagation()
    if (e.key === 'Enter') {
      e.preventDefault()
      handleCommit()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      onCancelEdit()
    }
  }, [handleCommit, onCancelEdit])

  if (isEditing) {
    return (
      <input
        ref={inputRef}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={handleCommit}
        onKeyDown={handleKeyDown}
        className={cn(
          'bg-transparent border-b border-primary outline-none w-full min-w-0',
          className,
        )}
      />
    )
  }

  return (
    <span
      onDoubleClick={(e) => {
        e.stopPropagation()
        onStartEdit(blockId)
      }}
      className={cn('cursor-text select-none', className)}
      title="Double-click to edit"
    >
      {title}
    </span>
  )
}

export interface RealtimeRendererOptions {
  editingBlockId: string | null
  onStartEdit: (id: string) => void
  onCommitEdit: (id: string, title: string) => void
  onCancelEdit: () => void
  onToggleTask: (id: string) => void
}

export function createRealtimeRenderers(
  opts: RealtimeRendererOptions
): BlockRenderers<ProductivityBlock> {
  const { editingBlockId, onStartEdit, onCommitEdit, onCancelEdit, onToggleTask } = opts

  return {
    section: (props: ContainerRendererProps<ProductivityBlock & { type: 'section' }>) => {
      const { block, children, isDragging, isExpanded, onToggleExpand } = props
      return (
        <div className={cn(
          'rounded-xl border border-border/50 bg-card w-full min-w-0 max-w-full',
          'transition-all duration-200',
          isDragging && 'opacity-40 scale-[0.98]',
          editingBlockId === block.id && 'ring-1 ring-primary/40',
        )}>
          <div className="flex items-center gap-2 p-2 folder-header group min-w-0">
            <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground cursor-grab drag-handle" />
            <button
              onClick={(e) => { e.stopPropagation(); onToggleExpand() }}
              className="p-1 shrink-0 rounded-md transition-colors hover:bg-muted/80 active:scale-95"
            >
              <div className={cn('transition-transform duration-200', isExpanded && 'rotate-90')}>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </div>
            </button>
            <EditableTitle
              blockId={block.id}
              title={block.title}
              isEditing={editingBlockId === block.id}
              onStartEdit={onStartEdit}
              onCommitEdit={onCommitEdit}
              onCancelEdit={onCancelEdit}
              className="font-semibold text-foreground flex-1 min-w-0 truncate"
            />
            <KeyBadge order={block.order} />
          </div>
          {isExpanded && (
            <div className="px-2 pb-2 folder-children w-full min-w-0 max-w-full">
              {children}
            </div>
          )}
        </div>
      )
    },

    task: (props: BlockRendererProps<ProductivityBlock & { type: 'task' }>) => {
      const { block, isDragging } = props
      return (
        <div className={cn(
          'flex items-center gap-2 p-2 rounded-lg border border-border/30 bg-card/50',
          'block-item group w-full min-w-0 max-w-full',
          isDragging && 'opacity-40 scale-[0.98]',
          editingBlockId === block.id && 'ring-1 ring-primary/40',
        )}>
          <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground cursor-grab drag-handle" />
          <button
            onClick={(e) => { e.stopPropagation(); onToggleTask(block.id) }}
            className={cn(
              'h-5 w-5 shrink-0 rounded-full border-2 flex items-center justify-center',
              'transition-all duration-200',
              block.completed
                ? 'bg-primary border-primary checkbox-complete'
                : 'border-muted-foreground/40 hover:border-primary hover:scale-110',
            )}
          >
            {block.completed && <Check className="h-3 w-3 text-primary-foreground" strokeWidth={3} />}
          </button>
          <EditableTitle
            blockId={block.id}
            title={block.title}
            isEditing={editingBlockId === block.id}
            onStartEdit={onStartEdit}
            onCommitEdit={onCommitEdit}
            onCancelEdit={onCancelEdit}
            className={cn(
              'flex-1 min-w-0 truncate transition-all duration-200',
              block.completed && 'line-through text-muted-foreground/60',
            )}
          />
          <KeyBadge order={block.order} />
        </div>
      )
    },

    note: (props: BlockRendererProps<ProductivityBlock & { type: 'note' }>) => {
      const { block, isDragging } = props
      return (
        <div className={cn(
          'flex items-start gap-2 p-2 rounded-lg border border-border/30 bg-card/50',
          'block-item group w-full min-w-0 max-w-full',
          isDragging && 'opacity-40 scale-[0.98]',
          editingBlockId === block.id && 'ring-1 ring-primary/40',
        )}>
          <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground cursor-grab drag-handle mt-0.5" />
          <StickyNote className="h-4 w-4 shrink-0 text-primary/80 mt-0.5 transition-colors group-hover:text-primary" />
          <EditableTitle
            blockId={block.id}
            title={block.title}
            isEditing={editingBlockId === block.id}
            onStartEdit={onStartEdit}
            onCommitEdit={onCommitEdit}
            onCancelEdit={onCancelEdit}
            className="flex-1 min-w-0 text-sm text-muted-foreground leading-relaxed"
          />
          <KeyBadge order={block.order} />
        </div>
      )
    },
  }
}
