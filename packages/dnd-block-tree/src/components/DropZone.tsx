'use client'

import { useDroppable } from '@dnd-kit/core'
import { memo, useCallback, useEffect } from 'react'
import { extractUUID } from '../utils/helper'

export interface DropZoneProps {
  id: string
  parentId: string | null
  onHover: (zoneId: string, parentId: string | null) => void
  activeId: string | null
  className?: string
  activeClassName?: string
  height?: number
}

/**
 * Drop zone indicator component
 * Shows where blocks can be dropped
 */
function DropZoneComponent({
  id,
  parentId,
  onHover,
  activeId,
  className = 'h-1 rounded transition-colors',
  activeClassName = 'bg-blue-500',
  height = 4,
}: DropZoneProps) {
  const { setNodeRef, isOver, active } = useDroppable({ id })

  const handleInternalHover = useCallback(() => {
    onHover(id, parentId)
  }, [onHover, id, parentId])

  useEffect(() => {
    if (isOver) handleInternalHover()
  }, [isOver, handleInternalHover])

  // Hide zone if it belongs to the active block
  if (active?.id && extractUUID(id) === String(active.id)) return null
  // Also hide if activeId matches (from context)
  if (activeId && extractUUID(id) === activeId) return null

  return (
    <div
      ref={setNodeRef}
      data-zone-id={id}
      data-parent-id={parentId ?? ''}
      style={{ height: isOver ? height * 2 : height }}
      className={`${className} ${isOver ? activeClassName : 'bg-transparent'}`}
    />
  )
}

export const DropZone = memo(DropZoneComponent)
