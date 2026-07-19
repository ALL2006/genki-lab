import { BarChart3 } from 'lucide-react'

interface PlaceholderChartProps {
  title: string
  height?: 'sm' | 'md' | 'lg'
  variant?: 'bars' | 'radar' | 'line' | 'donut'
  message?: string
}

export function PlaceholderChart({
  title,
  height = 'md',
  variant = 'bars',
  message = '上传评论数据后，将在此展示趋势分析结果。',
}: PlaceholderChartProps) {
  return (
    <div className={`placeholder-chart placeholder-chart--${height}`}>
      <div className={`placeholder-chart__visual placeholder-chart__visual--${variant}`} aria-hidden="true">
        <span /><span /><span /><span /><span />
      </div>
      <div className="placeholder-chart__label">
        <BarChart3 size={17} aria-hidden="true" />
        <div><strong>{title}</strong><small>{message}</small></div>
      </div>
      <span className="placeholder-chart__tag">DEMO PLACEHOLDER / 待补充</span>
    </div>
  )
}
