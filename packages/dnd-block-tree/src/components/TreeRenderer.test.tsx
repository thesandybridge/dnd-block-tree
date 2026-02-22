import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { TreeRenderer } from '../components/TreeRenderer'

vi.mock('@dnd-kit/core', () => ({
  useDraggable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: () => {},
    isDragging: false,
  }),
  useDroppable: () => ({
    setNodeRef: () => {},
    isOver: false,
    active: null,
  }),
}))

interface TestBlock {
  id: string
  type: 'section' | 'item'
  parentId: string | null
  order: number
}

function buildBlocksByParent(blocks: TestBlock[]): Map<string | null, TestBlock[]> {
  const map = new Map<string | null, TestBlock[]>()
  for (const block of blocks) {
    const key = block.parentId
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(block)
  }
  // Sort each group by order
  for (const [, children] of map) {
    children.sort((a, b) => a.order - b.order)
  }
  return map
}

const renderers = {
  section: ({ block, children }: any) => (
    <div data-testid={`section-${block.id}`}>
      {block.id}
      {children}
    </div>
  ),
  item: ({ block }: any) => (
    <div data-testid={`item-${block.id}`}>{block.id}</div>
  ),
}

const defaultProps = {
  activeId: null,
  containerTypes: ['section'] as const,
  onHover: () => {},
  onToggleExpand: () => {},
}

describe('TreeRenderer', () => {
  it('renders all root-level blocks', () => {
    const blocks: TestBlock[] = [
      { id: 'a', type: 'item', parentId: null, order: 0 },
      { id: 'b', type: 'item', parentId: null, order: 1 },
      { id: 'c', type: 'item', parentId: null, order: 2 },
    ]
    const blocksByParent = buildBlocksByParent(blocks)

    const { container } = render(
      <TreeRenderer
        blocks={blocks}
        blocksByParent={blocksByParent}
        parentId={null}
        expandedMap={{}}
        renderers={renderers}
        {...defaultProps}
      />
    )

    expect(container.querySelector('[data-block-id="a"]')).toBeInTheDocument()
    expect(container.querySelector('[data-block-id="b"]')).toBeInTheDocument()
    expect(container.querySelector('[data-block-id="c"]')).toBeInTheDocument()
  })

  it('respects expandedMap and hides children of collapsed sections', () => {
    const blocks: TestBlock[] = [
      { id: 's1', type: 'section', parentId: null, order: 0 },
      { id: 'child1', type: 'item', parentId: 's1', order: 0 },
    ]
    const blocksByParent = buildBlocksByParent(blocks)

    const { container } = render(
      <TreeRenderer
        blocks={blocks}
        blocksByParent={blocksByParent}
        parentId={null}
        expandedMap={{ s1: false }}
        renderers={renderers}
        {...defaultProps}
      />
    )

    expect(container.querySelector('[data-block-id="s1"]')).toBeInTheDocument()
    expect(container.querySelector('[data-block-id="child1"]')).not.toBeInTheDocument()
  })

  it('sets aria-level based on depth', () => {
    const blocks: TestBlock[] = [
      { id: 'a', type: 'item', parentId: null, order: 0 },
      { id: 'b', type: 'item', parentId: null, order: 1 },
    ]
    const blocksByParent = buildBlocksByParent(blocks)

    const { container } = render(
      <TreeRenderer
        blocks={blocks}
        blocksByParent={blocksByParent}
        parentId={null}
        expandedMap={{}}
        renderers={renderers}
        {...defaultProps}
      />
    )

    const blockA = container.querySelector('[data-block-id="a"]')
    const blockB = container.querySelector('[data-block-id="b"]')

    expect(blockA).toHaveAttribute('aria-level', '1')
    expect(blockB).toHaveAttribute('aria-level', '1')
  })

  it('sets aria-expanded on container blocks but not on plain items', () => {
    const blocks: TestBlock[] = [
      { id: 's1', type: 'section', parentId: null, order: 0 },
      { id: 'i1', type: 'item', parentId: null, order: 1 },
    ]
    const blocksByParent = buildBlocksByParent(blocks)

    const { container } = render(
      <TreeRenderer
        blocks={blocks}
        blocksByParent={blocksByParent}
        parentId={null}
        expandedMap={{ s1: true }}
        renderers={renderers}
        {...defaultProps}
      />
    )

    const section = container.querySelector('[data-block-id="s1"]')
    const item = container.querySelector('[data-block-id="i1"]')

    expect(section).toHaveAttribute('aria-expanded')
    expect(item).not.toHaveAttribute('aria-expanded')
  })

  it('sets aria-posinset and aria-setsize correctly', () => {
    const blocks: TestBlock[] = [
      { id: 'a', type: 'item', parentId: null, order: 0 },
      { id: 'b', type: 'item', parentId: null, order: 1 },
      { id: 'c', type: 'item', parentId: null, order: 2 },
    ]
    const blocksByParent = buildBlocksByParent(blocks)

    const { container } = render(
      <TreeRenderer
        blocks={blocks}
        blocksByParent={blocksByParent}
        parentId={null}
        expandedMap={{}}
        renderers={renderers}
        {...defaultProps}
      />
    )

    const blockA = container.querySelector('[data-block-id="a"]')
    expect(blockA).toHaveAttribute('aria-posinset', '1')
    expect(blockA).toHaveAttribute('aria-setsize', '3')
  })

  it('sets aria-selected when block is in selectedIds', () => {
    const blocks: TestBlock[] = [
      { id: 'a', type: 'item', parentId: null, order: 0 },
      { id: 'b', type: 'item', parentId: null, order: 1 },
    ]
    const blocksByParent = buildBlocksByParent(blocks)

    const { container } = render(
      <TreeRenderer
        blocks={blocks}
        blocksByParent={blocksByParent}
        parentId={null}
        expandedMap={{}}
        renderers={renderers}
        selectedIds={new Set(['a'])}
        {...defaultProps}
      />
    )

    const blockA = container.querySelector('[data-block-id="a"]')
    const blockB = container.querySelector('[data-block-id="b"]')

    expect(blockA).toHaveAttribute('aria-selected', 'true')
    expect(blockB).toHaveAttribute('aria-selected', 'false')
  })
})
