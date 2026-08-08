interface TooltipEntry {
  name: string
  value: number | string
  color: string
}

interface ChartTooltipProps {
  active?: boolean
  label?: string
  payload?: TooltipEntry[]
}

export function ChartTooltip({ active, label, payload }: ChartTooltipProps) {
  if (!active || !payload?.length) return null

  return (
    <div className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs shadow-xl">
      {label && <p className="mb-1.5 font-medium text-slate-300">{label}</p>}
      <div className="flex flex-col gap-1">
        {payload.map((entry) => (
          <div key={entry.name} className="flex items-center gap-2">
            <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: entry.color }} />
            <span className="text-slate-400">{entry.name}</span>
            <span className="ml-auto font-medium tabular-nums text-slate-100">{entry.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
