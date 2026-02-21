'use client'

import { DragOverlay as DndKitDragOverlay } from '@dnd-kit/core'
import type { ReactNode } from 'react'
import type { BaseBlock } from '../core/types'

export interface DragOverlayProps<T extends BaseBlock> {
  activeBlock: T | null
  children?: (block: T) => ReactNode
  /** Number of selected items being dragged (for multi-select badge) */
  selectedCount?: number
}

/**
 * Default drag overlay component
 * Shows a preview of the dragged item
 */
export function DragOverlay<T extends BaseBlock>({
  activeBlock,
  children,
  selectedCount = 0,
}: DragOverlayProps<T>) {
  const showBadge = selectedCount > 1
  return (
    <DndKitDragOverlay>
      {activeBlock && (
        <div style={{ position: 'relative' }}>
          {showBadge && (
            <>
              {/* Stacked card effect */}
              <div
                style={{
                  position: 'absolute',
                  top: 4,
                  left: 4,
                  right: -4,
                  bottom: -4,
                  borderRadius: 8,
                  border: '1px solid #d1d5db',
                  background: '#f3f4f6',
                  opacity: 0.6,
                  zIndex: -1,
                }}
              />
              {/* Count badge */}
              <div
                style={{
                  position: 'absolute',
                  top: -8,
                  right: -8,
                  background: '#3b82f6',
                  color: 'white',
                  borderRadius: '50%',
                  width: 22,
                  height: 22,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 11,
                  fontWeight: 700,
                  zIndex: 10,
                  boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                }}
              >
                {selectedCount}
              </div>
            </>
          )}
          {children ? (
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
          )}
        </div>
      )}
    </DndKitDragOverlay>
  )
}
