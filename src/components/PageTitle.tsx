import type { ReactNode } from 'react'

interface PageTitleProps {
  eyebrow: string
  title: string
  description: string
  actions?: ReactNode
}

export function PageTitle({ eyebrow, title, description, actions }: PageTitleProps) {
  return (
    <header className="page-title">
      <div className="page-title__copy">
        <span className="eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {actions && <div className="page-title__actions">{actions}</div>}
    </header>
  )
}
