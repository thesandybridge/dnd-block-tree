import type { BaseBlock } from '@dnd-block-tree/react'

export interface ProductivityBlock extends BaseBlock {
  type: 'section' | 'task' | 'note'
  title: string
  completed?: boolean
  dueDate?: string
}

export const CONTAINER_TYPES = ['section'] as const
