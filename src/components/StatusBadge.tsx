import type { ReactNode } from 'react'

type StatusTone = 'success' | 'warning' | 'neutral' | 'accent'

interface StatusBadgeProps {
  children: ReactNode
  tone?: StatusTone
}

export function StatusBadge({ children, tone = 'neutral' }: StatusBadgeProps) {
  return <span className={`status-badge status-badge--${tone}`}>{children}</span>
}
