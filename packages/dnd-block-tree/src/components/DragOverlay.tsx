'use client'

import { DragOverlay as DndKitDragOverlay } from '@dnd-kit/core'
import type { ReactNode } from 'react'
import type { BaseBlock } from '../core/types'

export interface DragOverlayProps<T extends BaseBlock> {
  activeBlock: T | null
  children?: (block: T) => ReactNode
}

/**
 * Default drag overlay component
 * Shows a preview of the dragged item
 */
export function DragOverlay<T extends BaseBlock>({
  activeBlock,
  children,
}: DragOverlayProps<T>) {
  return (
    <DndKitDragOverlay>
      {activeBlock && (
        children ? (
          children(activeBlock)
        ) : (
          <div className="bg-white border border-gray-300 shadow-md rounded-md p-3 text-sm w-64 pointer-events-none">
            <div className="text-gray-500 uppercase text-xs tracking-wide mb-1">
              {activeBlock.type}
            </div>
            <div className="font-semibold text-gray-800">
              Block {activeBlock.id.slice(0, 8)}
            </div>
          </div>
        )
      )}
    </DndKitDragOverlay>
  )
}
