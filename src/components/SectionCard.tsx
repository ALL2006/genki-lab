import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'

interface SectionCardProps {
  title?: string
  description?: string
  icon?: LucideIcon
  action?: ReactNode
  children: ReactNode
  className?: string
  tone?: 'default' | 'soft' | 'accent'
}

export function SectionCard({
  title,
  description,
  icon: Icon,
  action,
  children,
  className = '',
  tone = 'default',
}: SectionCardProps) {
  return (
    <section className={`section-card section-card--${tone} ${className}`.trim()}>
      {(title || description || action) && (
        <div className="section-card__header">
          <div className="section-card__heading">
            {Icon && <span className="section-card__icon" aria-hidden="true"><Icon size={19} /></span>}
            <div>
              {title && <h2>{title}</h2>}
              {description && <p>{description}</p>}
            </div>
          </div>
          {action && <div className="section-card__action">{action}</div>}
        </div>
      )}
      <div className="section-card__body">{children}</div>
    </section>
  )
}
