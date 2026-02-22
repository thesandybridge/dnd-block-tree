import type { BaseSettings } from './types'
import type { OrderingStrategy } from 'dnd-block-tree'
import { Toggle } from './Toggle'
import { Slider } from './Slider'
import { SegmentedControl } from './SegmentedControl'

interface TreeTabProps<T extends BaseSettings> {
  settings: T
  onChange: (patch: Partial<T>) => void
}

const ORDERING_DESCRIPTIONS: Record<OrderingStrategy, string> = {
  integer: 'All siblings reindexed 0, 1, 2\u2026 on every move.',
  fractional: 'Only moved block gets a new fractional key. Watch order values in the diff view.',
}

export function TreeTab<T extends BaseSettings>({ settings, onChange }: TreeTabProps<T>) {
  return (
    <>
      <SegmentedControl
        label="Ordering Strategy"
        value={settings.orderingStrategy}
        options={['integer', 'fractional'] as const}
        onChange={(v) => onChange({ orderingStrategy: v } as Partial<T>)}
        description={(v: OrderingStrategy) => ORDERING_DESCRIPTIONS[v]}
      />
      <Slider
        label="Max Depth"
        value={settings.maxDepth}
        min={0}
        max={5}
        onChange={(v) => onChange({ maxDepth: v } as Partial<T>)}
        formatValue={(v) => v === 0 ? 'unlimited' : String(v)}
        description="0 = unlimited. 1 = flat list. 2 = one level of nesting."
      />
      <SegmentedControl
        label="Initial Expanded"
        value={settings.initialExpanded}
        options={['all', 'none'] as const}
        onChange={(v) => onChange({ initialExpanded: v } as Partial<T>)}
        description="Applies on reset/mount"
      />
      <Toggle
        label="Keyboard Navigation"
        checked={settings.keyboardNavigation}
        onChange={(v) => onChange({ keyboardNavigation: v } as Partial<T>)}
      />
    </>
  )
}
