import { FileText, Plus } from 'lucide-react'
import type { ContentAsset } from '../types'
import type { LucideIcon } from 'lucide-react'
import { StatusBadge } from './StatusBadge'

interface ContentAssetCardProps {
  title: string
  description: string
  icon?: LucideIcon
  asset?: ContentAsset
}

export function ContentAssetCard({ title, description, icon: Icon = FileText, asset }: ContentAssetCardProps) {
  return (
    <article className="asset-card">
      <div className="asset-card__icon" aria-hidden="true"><Icon size={21} /></div>
      <div className="asset-card__content">
        <div className="asset-card__top"><h3>{asset?.title ?? title}</h3><StatusBadge>{asset?.status ?? '待生成'}</StatusBadge></div>
        <p>{asset?.content ?? description}</p>
        {!asset && <small>DEMO PLACEHOLDER / 待补充</small>}
      </div>
      {!asset && <span className="asset-card__add" aria-hidden="true"><Plus size={16} /></span>}
    </article>
  )
}
