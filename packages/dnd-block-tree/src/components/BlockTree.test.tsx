import { render } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import '@testing-library/jest-dom/vitest'

vi.mock('@dnd-kit/core', async () => {
  const actual = await vi.importActual('@dnd-kit/core')
  return {
    ...actual,
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
  }
})

import { BlockTree } from './BlockTree'

interface TestBlock {
  id: string
  type: 'section' | 'item'
  parentId: string | null
  order: number
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

describe('BlockTree', () => {
  it('renders all blocks', () => {
    const blocks: TestBlock[] = [
      { id: 'a', type: 'item', parentId: null, order: 0 },
      { id: 'b', type: 'item', parentId: null, order: 1 },
      { id: 'c', type: 'section', parentId: null, order: 2 },
    ]

    const { container } = render(
      <BlockTree
        blocks={blocks}
        renderers={renderers}
        containerTypes={['section'] as const}
      />
    )

    expect(container.querySelector('[data-block-id="a"]')).toBeInTheDocument()
    expect(container.querySelector('[data-block-id="b"]')).toBeInTheDocument()
    expect(container.querySelector('[data-block-id="c"]')).toBeInTheDocument()
  })

  it('has role="tree" when keyboardNavigation is enabled', () => {
    const blocks: TestBlock[] = [
      { id: 'a', type: 'item', parentId: null, order: 0 },
    ]

    const { container } = render(
      <BlockTree
        blocks={blocks}
        renderers={renderers}
        containerTypes={['section'] as const}
        keyboardNavigation={true}
      />
    )

    // The root div rendered by BlockTree (not the TreeRenderer inner div)
    const treeRoot = container.querySelector('[role="tree"]')
    expect(treeRoot).toBeInTheDocument()
  })

  it('does not have role="tree" by default', () => {
    const blocks: TestBlock[] = [
      { id: 'a', type: 'item', parentId: null, order: 0 },
    ]

    const { container } = render(
      <BlockTree
        blocks={blocks}
        renderers={renderers}
        containerTypes={['section'] as const}
      />
    )

    const treeRoot = container.querySelector('[role="tree"]')
    expect(treeRoot).not.toBeInTheDocument()
  })

  it('initialExpanded="none" collapses all containers', () => {
    const blocks: TestBlock[] = [
      { id: 's1', type: 'section', parentId: null, order: 0 },
      { id: 'child1', type: 'item', parentId: 's1', order: 0 },
    ]

    const { container } = render(
      <BlockTree
        blocks={blocks}
        renderers={renderers}
        containerTypes={['section'] as const}
        initialExpanded="none"
      />
    )

    // The section itself should render
    expect(container.querySelector('[data-block-id="s1"]')).toBeInTheDocument()
    // But the child inside it should not (section is collapsed)
    expect(container.querySelector('[data-block-id="child1"]')).not.toBeInTheDocument()
  })
})
