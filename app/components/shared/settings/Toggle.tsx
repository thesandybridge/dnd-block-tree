interface ToggleProps {
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
}

export function Toggle({ label, checked, onChange }: ToggleProps) {
  return (
    <label className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 cursor-pointer">
      <span className="text-sm">{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="w-5 h-5"
      />
    </label>
  )
}
