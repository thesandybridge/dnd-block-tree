import type { BaseSettings } from './types'
import { Toggle } from './Toggle'
import { Slider } from './Slider'

interface DragDropTabProps<T extends BaseSettings> {
  settings: T
  onChange: (patch: Partial<T>) => void
  extra?: React.ReactNode
}

export function DragDropTab<T extends BaseSettings>({ settings, onChange, extra }: DragDropTabProps<T>) {
  return (
    <>
      <Toggle
        label="Live Drop Preview"
        checked={settings.showDropPreview}
        onChange={(v) => onChange({ showDropPreview: v } as Partial<T>)}
      />
      <Toggle
        label="Multi-Select"
        checked={settings.multiSelect}
        onChange={(v) => onChange({ multiSelect: v } as Partial<T>)}
      />
      <Slider
        label="Activation Distance"
        value={settings.activationDistance}
        min={0}
        max={20}
        onChange={(v) => onChange({ activationDistance: v } as Partial<T>)}
        formatValue={(v) => `${v}px`}
      />
      <Slider
        label="Preview Debounce"
        value={settings.previewDebounce}
        min={0}
        max={500}
        step={10}
        onChange={(v) => onChange({ previewDebounce: v } as Partial<T>)}
        formatValue={(v) => `${v}ms`}
        description="Delay before preview updates during drag"
      />
      {extra}
    </>
  )
}
