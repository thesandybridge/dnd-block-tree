import type { BaseSettings } from './types'
import { Slider } from './Slider'
import { SelectControl } from './SelectControl'

interface AnimationTabProps<T extends BaseSettings> {
  settings: T
  onChange: (patch: Partial<T>) => void
}

const EASING_OPTIONS = ['ease', 'ease-in', 'ease-out', 'ease-in-out', 'linear'] as const

export function AnimationTab<T extends BaseSettings>({ settings, onChange }: AnimationTabProps<T>) {
  return (
    <>
      <Slider
        label="Expand Duration"
        value={settings.expandDuration}
        min={0}
        max={500}
        step={10}
        onChange={(v) => onChange({ expandDuration: v } as Partial<T>)}
        formatValue={(v) => v === 0 ? 'off' : `${v}ms`}
        description="Duration for expand/collapse animations"
      />
      <SelectControl
        label="Easing"
        value={settings.easing as typeof EASING_OPTIONS[number]}
        options={EASING_OPTIONS}
        onChange={(v) => onChange({ easing: v } as Partial<T>)}
      />
    </>
  )
}
