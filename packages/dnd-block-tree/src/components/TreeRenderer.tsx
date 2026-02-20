'use client'

import { Fragment, type ReactNode } from 'react'
import { useDraggable } from '@dnd-kit/core'
import type { BaseBlock, InternalRenderers, ContainerRendererProps, CanDragFn } from '../core/types'
import { DropZone } from './DropZone'

export interface TreeRendererProps<T extends BaseBlock> {
  blocks: T[]
  blocksByParent: Map<string | null, T[]>
  parentId: string | null
  activeId: string | null
  expandedMap: Record<string, boolean>
  renderers: InternalRenderers<T>
  containerTypes: readonly string[]
  onHover: (zoneId: string, parentId: string | null) => void
  onToggleExpand: (id: string) => void
  depth?: number
  dropZoneClassName?: string
  dropZoneActiveClassName?: string
  indentClassName?: string
  rootClassName?: string
  canDrag?: CanDragFn<T>
  /** Show dragged block at preview position */
  showDropPreview?: boolean
}

/**
 * Draggable wrapper for individual blocks
 */
function DraggableBlock<T extends BaseBlock>({
  block,
  children,
  disabled,
}: {
  block: T
  children: (props: { isDragging: boolean }) => ReactNode
  disabled?: boolean
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: block.id,
    disabled,
  })

  return (
    <div ref={setNodeRef} {...attributes} {...listeners}>
      {children({ isDragging })}
    </div>
  )
}

/**
 * Recursive tree renderer with smart drop zones
 */
export function TreeRenderer<T extends BaseBlock>({
  blocks,
  blocksByParent,
  parentId,
  activeId,
  expandedMap,
  renderers,
  containerTypes,
  onHover,
  onToggleExpand,
  depth = 0,
  dropZoneClassName,
  dropZoneActiveClassName,
  indentClassName = 'ml-6 border-l border-gray-200 pl-4',
  rootClassName = 'flex flex-col gap-1',
  canDrag,
  showDropPreview = false,
}: TreeRendererProps<T>) {
  const items = blocksByParent.get(parentId) ?? []

  // When preview is enabled, show the block at its new position
  // When disabled, filter it out (only appears in drag overlay)
  const filteredBlocks = showDropPreview
    ? items
    : items.filter(block => block.id !== activeId)

  const containerClass = depth === 0 ? rootClassName : indentClassName

  return (
    <div className={containerClass}>
      {/* Position-0 zone: always at the start, stable regardless of which block is dragged */}
      <DropZone
        id={parentId ? `into-${parentId}` : 'root-start'}
        parentId={parentId}
        onHover={onHover}
        activeId={activeId}
        className={dropZoneClassName}
        activeClassName={dropZoneActiveClassName}
      />

      {filteredBlocks.map((block, index) => {
        const isContainer = containerTypes.includes(block.type)
        const isExpanded = expandedMap[block.id] !== false // Default to expanded
        const Renderer = renderers[block.type as keyof typeof renderers]
        const isDragDisabled = canDrag ? !canDrag(block) : false
        const isLastVisible = index === filteredBlocks.length - 1

        if (!Renderer) {
          console.warn(`No renderer found for block type: ${block.type}`)
          return null
        }

        return (
          <Fragment key={block.id}>
            {/* Render the block */}
            <DraggableBlock block={block} disabled={isDragDisabled}>
              {({ isDragging }) => {
                if (isContainer) {
                  const childContent = isExpanded ? (
                    <>
                      <TreeRenderer
                        blocks={blocks}
                        blocksByParent={blocksByParent}
                        parentId={block.id}
                        activeId={activeId}
                        expandedMap={expandedMap}
                        renderers={renderers}
                        containerTypes={containerTypes}
                        onHover={onHover}
                        onToggleExpand={onToggleExpand}
                        depth={depth + 1}
                        dropZoneClassName={dropZoneClassName}
                        dropZoneActiveClassName={dropZoneActiveClassName}
                        indentClassName={indentClassName}
                        rootClassName={rootClassName}
                        canDrag={canDrag}
                        showDropPreview={showDropPreview}
                      />
                    </>
                  ) : null

                  return Renderer({
                    block: block as T & { type: typeof block.type },
                    children: childContent,
                    isDragging,
                    depth,
                    isExpanded,
                    onToggleExpand: () => onToggleExpand(block.id),
                  } as ContainerRendererProps<T & { type: typeof block.type }>)
                }

                return Renderer({
                  block: block as T & { type: typeof block.type },
                  isDragging,
                  depth,
                })
              }}
            </DraggableBlock>

            {/* After-zone: skip for last visible block (end-zone handles that) */}
            {!isLastVisible && (
              <DropZone
                id={`after-${block.id}`}
                parentId={block.parentId}
                onHover={onHover}
                activeId={activeId}
                className={dropZoneClassName}
                activeClassName={dropZoneActiveClassName}
              />
            )}
          </Fragment>
        )
      })}

      {/* End zone: stable zone for the last position */}
      <DropZone
        id={parentId ? `end-${parentId}` : 'root-end'}
        parentId={parentId}
        onHover={onHover}
        activeId={activeId}
        className={dropZoneClassName}
        activeClassName={dropZoneActiveClassName}
      />
    </div>
  )
}
