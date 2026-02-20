'use client'

import { Fragment, type ReactNode } from 'react'
import { useDraggable } from '@dnd-kit/core'
import type { BaseBlock, InternalRenderers, ContainerRendererProps } from '../core/types'
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
}

/**
 * Draggable wrapper for individual blocks
 */
function DraggableBlock<T extends BaseBlock>({
  block,
  children,
}: {
  block: T
  children: (props: { isDragging: boolean }) => ReactNode
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: block.id,
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
}: TreeRendererProps<T>) {
  const items = blocksByParent.get(parentId) ?? []

  // Filter out the active block from visible items
  const filteredBlocks = items.filter(block => block.id !== activeId)

  // Find first visible block for the single before-zone
  const firstVisibleBlockId = filteredBlocks[0]?.id

  const containerClass = depth === 0 ? rootClassName : indentClassName

  return (
    <div className={containerClass}>
      {filteredBlocks.map((block) => {
        const isContainer = containerTypes.includes(block.type)
        const isExpanded = expandedMap[block.id] !== false // Default to expanded
        const Renderer = renderers[block.type as keyof typeof renderers]

        if (!Renderer) {
          console.warn(`No renderer found for block type: ${block.type}`)
          return null
        }

        return (
          <Fragment key={block.id}>
            {/* Before-zone: only for the first visible non-active block */}
            {block.id === firstVisibleBlockId && (
              <DropZone
                id={`before-${block.id}`}
                parentId={block.parentId}
                onHover={onHover}
                activeId={activeId}
                className={dropZoneClassName}
                activeClassName={dropZoneActiveClassName}
              />
            )}

            {/* Render the block */}
            <DraggableBlock block={block}>
              {({ isDragging }) => {
                if (isContainer) {
                  const childContent = isExpanded ? (
                    <>
                      {/* Into-zone for dropping inside */}
                      <DropZone
                        id={`into-${block.id}`}
                        parentId={block.id}
                        onHover={onHover}
                        activeId={activeId}
                        className={dropZoneClassName}
                        activeClassName={dropZoneActiveClassName}
                      />
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

            {/* After-zone */}
            <DropZone
              id={`after-${block.id}`}
              parentId={block.parentId}
              onHover={onHover}
              activeId={activeId}
              className={dropZoneClassName}
              activeClassName={dropZoneActiveClassName}
            />
          </Fragment>
        )
      })}
    </div>
  )
}
