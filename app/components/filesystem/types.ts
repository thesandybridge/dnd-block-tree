import type { BaseBlock } from '@dnd-block-tree/react'

export interface FileSystemBlock extends BaseBlock {
  type: 'folder' | 'file'
  name: string
  size?: string
  extension?: string
}

export const CONTAINER_TYPES = ['folder'] as const
