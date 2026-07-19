import { FlaskConical, ArrowRight } from 'lucide-react'
import type { ProductConcept } from '../types'
import { StatusBadge } from './StatusBadge'

interface ProductConceptCardProps {
  product?: ProductConcept
  selected?: boolean
  onSelect?: () => void
}

export function ProductConceptCard({ product, selected = false, onSelect }: ProductConceptCardProps) {
  if (!product) {
    return (
      <article className={`product-card product-card--empty${selected ? ' is-selected' : ''}`}>
        <div className="product-card__visual"><FlaskConical size={30} /></div>
        <div className="product-card__content">
          <div className="product-card__meta"><StatusBadge tone="accent">页面结构示例</StatusBadge><span>候选 01</span></div>
          <h3>示例产品占位卡</h3>
          <p>候选新品将在趋势分析完成后生成。</p>
          <small>DEMO PLACEHOLDER / 待补充</small>
        </div>
        <button type="button" onClick={onSelect} className="text-button">查看结构 <ArrowRight size={15} /></button>
      </article>
    )
  }

  return (
    <article className={`product-card${selected ? ' is-selected' : ''}`}>
      <div className="product-card__content"><StatusBadge>{product.status}</StatusBadge><h3>{product.name}</h3><p>{product.slogan}</p></div>
      <button type="button" onClick={onSelect} className="text-button">查看详情 <ArrowRight size={15} /></button>
    </article>
  )
}
