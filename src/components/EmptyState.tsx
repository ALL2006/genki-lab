import { Inbox } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

interface EmptyStateProps {
  title: string
  description?: string
  icon?: LucideIcon
  compact?: boolean
}

export function EmptyState({
  title,
  description = 'DEMO PLACEHOLDER / 待补充',
  icon: Icon = Inbox,
  compact = false,
}: EmptyStateProps) {
  return (
    <div className={`empty-state${compact ? ' empty-state--compact' : ''}`}>
      <span className="empty-state__icon" aria-hidden="true"><Icon size={22} /></span>
      <div>
        <strong>{title}</strong>
        <p>{description}</p>
      </div>
    </div>
  )
}
