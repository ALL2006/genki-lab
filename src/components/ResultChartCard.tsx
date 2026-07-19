import type { LucideIcon } from 'lucide-react'
import { PlaceholderChart } from './PlaceholderChart'

interface ResultChartCardProps {
  title: string
  icon: LucideIcon
  variant?: 'bars' | 'radar' | 'line' | 'donut'
}

export function ResultChartCard({ title, icon: Icon, variant = 'bars' }: ResultChartCardProps) {
  return (
    <article className="result-chart-card">
      <div className="result-chart-card__title"><Icon size={18} /><h3>{title}</h3></div>
      <PlaceholderChart title={title} variant={variant} height="sm" message="完成真实用户测试后展示结果。" />
    </article>
  )
}
