import { Sparkles } from 'lucide-react'
import type { TrendOpportunity } from '../types'
import { StatusBadge } from './StatusBadge'

interface TrendCardProps {
  trend?: TrendOpportunity
  slot?: number
}

export function TrendCard({ trend, slot = 1 }: TrendCardProps) {
  if (!trend) {
    return (
      <article className="trend-card trend-card--empty">
        <div className="trend-card__top">
          <span className="trend-card__slot">机会槽位 {String(slot).padStart(2, '0')}</span>
          <StatusBadge tone="neutral">待分析</StatusBadge>
        </div>
        <span className="trend-card__spark"><Sparkles size={23} /></span>
        <h3>趋势机会卡</h3>
        <p>趋势名称、目标人群、消费场景与证据来源将在分析完成后展示。</p>
        <div className="trend-card__scores"><span>趋势分数 —</span><span>品牌适配度 —</span></div>
        <small>DEMO PLACEHOLDER / 待补充</small>
      </article>
    )
  }

  return (
    <article className="trend-card">
      <div className="trend-card__top"><span>{trend.keywords.join(' · ')}</span><StatusBadge>{trend.status}</StatusBadge></div>
      <h3>{trend.title}</h3>
      <p>{trend.painPoint}</p>
      <div className="trend-card__scores"><span>趋势分数 {trend.trendScore ?? '—'}</span><span>品牌适配度 {trend.brandFitScore ?? '—'}</span></div>
    </article>
  )
}
