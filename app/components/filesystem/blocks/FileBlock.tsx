'use client'

import { File, FileCode, FileImage, FileText, GripVertical } from 'lucide-react'
import type { BlockRendererProps } from 'dnd-block-tree'
import type { FileSystemBlock } from '../types'
import { cn } from '@/lib/utils'

type Props = BlockRendererProps<FileSystemBlock & { type: 'file' }>

function getFileIcon(extension?: string) {
  switch (extension) {
    case 'ts':
    case 'tsx':
    case 'js':
    case 'jsx':
    case 'py':
    case 'rs':
      return <FileCode className="h-4 w-4 text-blue-500" />
    case 'png':
    case 'jpg':
    case 'svg':
    case 'gif':
      return <FileImage className="h-4 w-4 text-green-500" />
    case 'md':
    case 'txt':
    case 'doc':
      return <FileText className="h-4 w-4 text-yellow-500" />
    default:
      return <File className="h-4 w-4 text-muted-foreground" />
  }
}

export function FileBlock({ block, isDragging }: Props) {
  return (
    <div
      className={cn(
        'flex items-center gap-2 p-2 rounded-md hover:bg-muted/50 transition-colors block-item',
        isDragging && 'opacity-50'
      )}
    >
      <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />

      {getFileIcon(block.extension)}

      <span className="flex-1 text-sm text-foreground">
        {block.name}
      </span>

      {block.size && (
        <span className="text-xs text-muted-foreground">
          {block.size}
        </span>
      )}
    </div>
  )
}
