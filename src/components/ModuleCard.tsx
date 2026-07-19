import { ArrowUpRight } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Link } from 'react-router-dom'

interface ModuleCardProps {
  index: string
  title: string
  description: string
  to: string
  icon: LucideIcon
  accent?: 'green' | 'mint' | 'red'
}

export function ModuleCard({ index, title, description, to, icon: Icon, accent = 'green' }: ModuleCardProps) {
  return (
    <Link to={to} className={`module-card module-card--${accent}`}>
      <div className="module-card__top">
        <span className="module-card__index">{index}</span>
        <span className="module-card__icon" aria-hidden="true"><Icon size={22} /></span>
      </div>
      <div>
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
      <span className="module-card__link">进入模块 <ArrowUpRight size={16} /></span>
    </Link>
  )
}
