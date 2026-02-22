import { render } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import '@testing-library/jest-dom/vitest'

vi.mock('@dnd-kit/core', () => ({
  useDroppable: () => ({
    setNodeRef: () => {},
    isOver: false,
    active: null,
  }),
}))

import { DropZone } from './DropZone'

describe('DropZone', () => {
  it('renders with the correct data-zone-id attribute', () => {
    const { container } = render(
      <DropZone
        id="after-123"
        parentId={null}
        onHover={() => {}}
        activeId={null}
      />
    )

    const zone = container.querySelector('[data-zone-id="after-123"]')
    expect(zone).toBeInTheDocument()
  })

  it('hides into-zone when activeId matches the zone block id', () => {
    // The DropZone component checks `activeId` prop against the zone's block ID
    // for "into-" zones and returns null when they match (can't drop into itself)
    const { container } = render(
      <DropZone
        id="into-abc"
        parentId={null}
        onHover={() => {}}
        activeId="abc"
      />
    )

    const zone = container.querySelector('[data-zone-id="into-abc"]')
    expect(zone).not.toBeInTheDocument()
  })

  it('renders without errors for a standard zone', () => {
    const onHover = vi.fn()

    const { container } = render(
      <DropZone
        id="before-xyz"
        parentId="parent-1"
        onHover={onHover}
        activeId={null}
      />
    )

    const zone = container.querySelector('[data-zone-id="before-xyz"]')
    expect(zone).toBeInTheDocument()
    expect(zone).toHaveAttribute('data-parent-id', 'parent-1')
  })
})
