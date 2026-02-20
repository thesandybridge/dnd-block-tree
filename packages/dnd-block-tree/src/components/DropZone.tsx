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

  // Only hide "into-" zones for the active block (can't drop a container into itself)
  // "after-" zones are fine - dropping after yourself is just a no-op
  const zoneBlockId = extractUUID(id)
  const isIntoZone = id.startsWith('into-')
  if (isIntoZone && active?.id && zoneBlockId === String(active.id)) return null
  if (isIntoZone && activeId && zoneBlockId === activeId) return null

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
