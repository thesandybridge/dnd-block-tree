'use client'

import { Fragment, memo, type ReactNode } from 'react'
import { useDraggable } from '@dnd-kit/core'
import type { BaseBlock, CanDragFn, AnimationConfig } from '@dnd-block-tree/core'
import type { InternalRenderers, ContainerRendererProps } from '../types'
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
  /** Preview position info - where to show the ghost */
  previewPosition?: { parentId: string | null; index: number } | null
  /** The dragged block for rendering preview ghost */
  draggedBlock?: T | null
  /** Currently focused block ID for keyboard navigation */
  focusedId?: string | null
  /** Currently selected block IDs for multi-select */
  selectedIds?: Set<string>
  /** Click handler for multi-select */
  onBlockClick?: (blockId: string, event: React.MouseEvent) => void
  /** Animation configuration */
  animation?: AnimationConfig
  /** When virtual scrolling is active, only render blocks in this set */
  virtualVisibleIds?: Set<string> | null
}

/**
 * Ghost preview wrapper -- renders in normal document flow so the user sees
 * an accurate preview of the final layout. Collision detection uses
 * snapshotted zone rects to avoid feedback loops from the ghost's displacement.
 */
function GhostPreview({ children }: { children: ReactNode }) {
  return (
    <div data-dnd-ghost className="opacity-50" style={{ pointerEvents: 'none' }}>
      {children}
    </div>
  )
}

/**
 * Draggable wrapper for individual blocks
 */
function DraggableBlock<T extends BaseBlock>({
  block,
  children,
  disabled,
  focusedId,
  isSelected,
  onBlockClick,
  isContainer,
  isExpanded,
  depth,
  posInSet,
  setSize,
}: {
  block: T
  children: (props: { isDragging: boolean }) => ReactNode
  disabled?: boolean
  focusedId?: string | null
  isSelected?: boolean
  onBlockClick?: (blockId: string, event: React.MouseEvent) => void
  isContainer?: boolean
  isExpanded?: boolean
  depth: number
  posInSet: number
  setSize: number
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: block.id,
    disabled,
  })

  const isFocused = focusedId === block.id

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      data-block-id={block.id}
      tabIndex={isFocused ? 0 : -1}
      onClick={onBlockClick ? (e: React.MouseEvent) => onBlockClick(block.id, e) : undefined}
      data-selected={isSelected || undefined}
      style={{ touchAction: 'none', minWidth: 0, outline: 'none' }}
      role="treeitem"
      aria-level={depth + 1}
      aria-posinset={posInSet}
      aria-setsize={setSize}
      aria-expanded={isContainer ? isExpanded : undefined}
      aria-selected={isSelected ?? undefined}
    >
      {children({ isDragging })}
    </div>
  )
}

/**
 * Recursive tree renderer with smart drop zones
 */
function TreeRendererInner<T extends BaseBlock>({
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
  previewPosition,
  draggedBlock,
  focusedId,
  selectedIds,
  onBlockClick,
  animation,
  virtualVisibleIds,
}: TreeRendererProps<T>) {
  const items = blocksByParent.get(parentId) ?? []

  // Always filter out the dragged block - it appears in drag overlay
  let filteredBlocks = items.filter(block => block.id !== activeId)

  // When virtual scrolling is active at root level, only render visible blocks
  if (virtualVisibleIds && depth === 0) {
    filteredBlocks = filteredBlocks.filter(block => virtualVisibleIds.has(block.id))
  }

  // Check if preview ghost should appear in this container
  const showGhostHere = previewPosition?.parentId === parentId && draggedBlock

  const containerClass = depth === 0 ? rootClassName : indentClassName

  return (
    <div className={containerClass} style={{ minWidth: 0 }}>
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

        // Check if ghost should appear BEFORE this block
        const ghostBeforeThis = showGhostHere && previewPosition!.index === index

        // Use original items to determine if this is the last block (for stable zones)
        const originalIndex = items.findIndex(b => b.id === block.id)
        const isLastInOriginal = originalIndex === items.length - 1

        if (!Renderer) {
          console.warn(`No renderer found for block type: ${block.type}`)
          return null
        }

        const GhostRenderer = draggedBlock ? renderers[draggedBlock.type as keyof typeof renderers] : null

        return (
          <Fragment key={block.id}>
            {/* Ghost preview before this block */}
            {ghostBeforeThis && GhostRenderer && (
              <GhostPreview>
                {GhostRenderer({
                  block: draggedBlock as T & { type: typeof draggedBlock.type },
                  isDragging: true,
                  depth,
                })}
              </GhostPreview>
            )}

            {/* Render the block */}
            <DraggableBlock
              block={block}
              disabled={isDragDisabled}
              focusedId={focusedId}
              isSelected={selectedIds?.has(block.id)}
              onBlockClick={onBlockClick}
              isContainer={isContainer}
              isExpanded={isExpanded}
              depth={depth}
              posInSet={originalIndex + 1}
              setSize={items.length}
            >
              {({ isDragging }) => {
                if (isContainer) {
                  const animated = animation?.expandDuration && animation.expandDuration > 0
                  const easing = animation?.easing ?? 'ease'
                  const duration = animation?.expandDuration ?? 0

                  let childContent: ReactNode

                  if (animated) {
                    // CSS grid trick: grid-template-rows transitions from 1fr to 0fr
                    childContent = (
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateRows: isExpanded ? '1fr' : '0fr',
                          transition: `grid-template-rows ${duration}ms ${easing}`,
                        }}
                      >
                        <div
                          style={{
                            overflow: 'hidden',
                            minHeight: 0,
                            opacity: isExpanded ? 1 : 0,
                            transition: `opacity ${duration}ms ${easing}`,
                          }}
                        >
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
                            previewPosition={previewPosition}
                            draggedBlock={draggedBlock}
                            focusedId={focusedId}
                            selectedIds={selectedIds}
                            onBlockClick={onBlockClick}
                            animation={animation}
                            virtualVisibleIds={virtualVisibleIds}
                          />
                        </div>
                      </div>
                    )
                  } else {
                    childContent = isExpanded ? (
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
                        previewPosition={previewPosition}
                        draggedBlock={draggedBlock}
                        focusedId={focusedId}
                        selectedIds={selectedIds}
                        onBlockClick={onBlockClick}
                        animation={animation}
                        virtualVisibleIds={virtualVisibleIds}
                      />
                    ) : null
                  }

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

            {/* After-zone for non-last blocks (end-zone handles last position) */}
            {!isLastInOriginal && (
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

      {/* Ghost at end of container */}
      {showGhostHere && previewPosition!.index >= filteredBlocks.length && draggedBlock && (() => {
        const GhostRenderer = renderers[draggedBlock.type as keyof typeof renderers]
        return GhostRenderer ? (
          <GhostPreview>
            {GhostRenderer({
              block: draggedBlock as T & { type: typeof draggedBlock.type },
              isDragging: true,
              depth,
            })}
          </GhostPreview>
        ) : null
      })()}

      {/* End zone: for dropping at the last position in a container */}
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

export const TreeRenderer = memo(TreeRendererInner) as typeof TreeRendererInner
