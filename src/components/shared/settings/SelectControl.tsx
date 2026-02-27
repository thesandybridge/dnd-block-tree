interface SelectControlProps<T extends string> {
  label: string
  value: T
  options: readonly T[]
  onChange: (value: T) => void
}

export function SelectControl<T extends string>({ label, value, options, onChange }: SelectControlProps<T>) {
  return (
    <div className="p-2">
      <div className="flex items-center justify-between">
        <span className="text-sm">{label}</span>
        <select
          value={value}
          onChange={(e) => onChange(e.target.value as T)}
          className="text-xs font-mono bg-muted/50 border border-border/50 rounded px-2 py-1 text-foreground"
        >
          {options.map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      </div>
    </div>
  )
}
