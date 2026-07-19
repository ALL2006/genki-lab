import { Minus } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

interface MetricCardProps {
  label: string
  value?: string | number
  hint?: string
  icon?: LucideIcon
}

export function MetricCard({ label, value = '—', hint = '待真实数据接入', icon: Icon = Minus }: MetricCardProps) {
  return (
    <article className="metric-card">
      <div className="metric-card__top">
        <span>{label}</span>
        <Icon size={17} aria-hidden="true" />
      </div>
      <strong>{value}</strong>
      <small>{hint}</small>
    </article>
  )
}
