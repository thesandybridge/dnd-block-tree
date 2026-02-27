import type { BaseSettings } from './types'
import { Toggle } from './Toggle'
import { Slider } from './Slider'

interface SensorsTabProps<T extends BaseSettings> {
  settings: T
  onChange: (patch: Partial<T>) => void
}

export function SensorsTab<T extends BaseSettings>({ settings, onChange }: SensorsTabProps<T>) {
  return (
    <>
      <Slider
        label="Long Press Delay"
        value={settings.longPressDelay}
        min={0}
        max={1000}
        step={50}
        onChange={(v) => onChange({ longPressDelay: v } as Partial<T>)}
        formatValue={(v) => `${v}ms`}
        description="Touch long-press activation delay"
      />
      <Slider
        label="Tolerance"
        value={settings.tolerance}
        min={0}
        max={20}
        onChange={(v) => onChange({ tolerance: v } as Partial<T>)}
        formatValue={(v) => `${v}px`}
        description="Distance tolerance for touch sensors"
      />
      <Toggle
        label="Haptic Feedback"
        checked={settings.hapticFeedback}
        onChange={(v) => onChange({ hapticFeedback: v } as Partial<T>)}
      />
    </>
  )
}
