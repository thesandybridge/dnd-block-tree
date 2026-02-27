import { cn } from '@/lib/utils'

interface SegmentedControlProps<T extends string> {
  label: string
  value: T
  options: readonly T[]
  onChange: (value: T) => void
  description?: string | ((value: T) => string)
}

export function SegmentedControl<T extends string>({ label, value, options, onChange, description }: SegmentedControlProps<T>) {
  const descriptionText = typeof description === 'function' ? description(value) : description

  return (
    <div className="p-2">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm">{label}</span>
        <span className="text-xs font-mono bg-primary/10 text-primary px-2 py-0.5 rounded">
          {value}
        </span>
      </div>
      <div className="flex rounded-lg overflow-hidden border border-border/50">
        {options.map((opt) => (
          <button
            key={opt}
            onClick={() => onChange(opt)}
            className={cn(
              'flex-1 py-1.5 text-xs font-medium transition-colors',
              value === opt
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted/30 text-muted-foreground hover:bg-muted/60'
            )}
          >
            {opt}
          </button>
        ))}
      </div>
      {descriptionText && (
        <p className="text-xs text-muted-foreground mt-2 leading-relaxed">{descriptionText}</p>
      )}
    </div>
  )
}
