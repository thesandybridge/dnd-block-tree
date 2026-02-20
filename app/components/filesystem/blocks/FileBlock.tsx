'use client'

import { File, FileCode, FileImage, FileText, GripVertical } from 'lucide-react'
import type { BlockRendererProps } from 'dnd-block-tree'
import type { FileSystemBlock } from '../types'
import { cn } from '@/lib/utils'

type Props = BlockRendererProps<FileSystemBlock & { type: 'file' }>

const FILE_ICONS: Record<string, { icon: typeof File; color: string }> = {
  ts: { icon: FileCode, color: 'text-blue-500' },
  tsx: { icon: FileCode, color: 'text-blue-500' },
  js: { icon: FileCode, color: 'text-yellow-500' },
  jsx: { icon: FileCode, color: 'text-yellow-500' },
  py: { icon: FileCode, color: 'text-green-500' },
  rs: { icon: FileCode, color: 'text-orange-500' },
  png: { icon: FileImage, color: 'text-purple-500' },
  jpg: { icon: FileImage, color: 'text-purple-500' },
  svg: { icon: FileImage, color: 'text-pink-500' },
  gif: { icon: FileImage, color: 'text-purple-500' },
  md: { icon: FileText, color: 'text-muted-foreground' },
  txt: { icon: FileText, color: 'text-muted-foreground' },
  json: { icon: FileCode, color: 'text-amber-500' },
}

function getFileIcon(extension?: string) {
  const config = extension ? FILE_ICONS[extension] : undefined
  const Icon = config?.icon ?? File
  const color = config?.color ?? 'text-muted-foreground/70'
  return { Icon, color }
}

export function FileBlock({ block, isDragging }: Props) {
  const { Icon, color } = getFileIcon(block.extension)

  return (
    <div
      className={cn(
        'flex items-center gap-2 p-2 rounded-md w-full min-w-0 max-w-full',
        'block-item group',
        'transition-all duration-150',
        isDragging && 'opacity-40 scale-[0.98]'
      )}
    >
      <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground cursor-grab drag-handle" />

      <Icon className={cn('h-4 w-4 shrink-0 transition-colors', color)} />

      <span className="flex-1 min-w-0 text-sm text-foreground truncate">
        {block.name}
      </span>

      {block.size && (
        <span className="hidden sm:inline text-[11px] text-muted-foreground/60 tabular-nums shrink-0">
          {block.size}
        </span>
      )}
    </div>
  )
}
