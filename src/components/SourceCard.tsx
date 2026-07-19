import { FileSearch, ExternalLink } from 'lucide-react'
import type { ResearchSource } from '../types'
import { StatusBadge } from './StatusBadge'

interface SourceCardProps {
  source?: ResearchSource
  placeholderText?: string
}

export function SourceCard({ source, placeholderText = '等待研究资料接入' }: SourceCardProps) {
  if (!source) {
    return (
      <article className="source-card source-card--empty">
        <span className="source-card__icon"><FileSearch size={22} /></span>
        <div><StatusBadge tone="neutral">资料占位</StatusBadge><h3>{placeholderText}</h3><p>DEMO PLACEHOLDER / 待补充</p></div>
      </article>
    )
  }

  return (
    <article className="source-card">
      <span className="source-card__icon"><FileSearch size={22} /></span>
      <div><StatusBadge>{source.type}</StatusBadge><h3>{source.title}</h3><p>{source.summary}</p></div>
      <a href={source.sourceUrl} aria-label={`打开来源：${source.title}`}><ExternalLink size={17} /></a>
    </article>
  )
}
