interface SliderProps {
  label: string
  value: number
  min: number
  max: number
  step?: number
  onChange: (value: number) => void
  formatValue?: (value: number) => string
  description?: string
}

export function Slider({ label, value, min, max, step = 1, onChange, formatValue, description }: SliderProps) {
  const displayValue = formatValue ? formatValue(value) : String(value)

  return (
    <div className="p-2">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm">{label}</span>
        <span className="text-xs font-mono bg-primary/10 text-primary px-2 py-0.5 rounded">
          {displayValue}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full"
      />
      {description && (
        <p className="text-xs text-muted-foreground mt-1">{description}</p>
      )}
    </div>
  )
}
