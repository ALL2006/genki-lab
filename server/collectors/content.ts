import { load } from 'cheerio'
import type { RawItemQualityStatus } from '../../shared/types.js'

export function normalizeText(value: string) {
  return value.replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim()
}

export function htmlToText(value: string) {
  const $ = load(value)
  $('script, style, noscript, svg, nav, footer, header, form').remove()
  return normalizeText($.root().text())
}

export function normalizePublishedAt(value: string | undefined | null): string | null {
  const normalized = value?.trim()
  if (!normalized) return null
  const usDateOnly = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(normalized)
  if (usDateOnly) {
    const [, month, day, year] = usDateOnly
    return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day))).toISOString()
  }
  const isoDateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(normalized)
  if (isoDateOnly) {
    const [, year, month, day] = isoDateOnly
    return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day))).toISOString()
  }
  const timestamp = Date.parse(normalized)
  return Number.isNaN(timestamp) ? null : new Date(timestamp).toISOString()
}

export function resolveUrl(value: string, baseUrl: string) {
  return new URL(value, baseUrl).toString()
}

export function summarize(value: string, maximum = 240) {
  const text = normalizeText(value)
  return text.length <= maximum ? text : `${text.slice(0, maximum - 1)}…`
}

export function assessQuality(title: string, rawText: string): {
  qualityStatus: RawItemQualityStatus
  failureReason: string | null
} {
  if (!title.trim()) return { qualityStatus: 'rejected', failureReason: '标题为空' }
  if (rawText.trim().length < 40) return { qualityStatus: 'low_quality', failureReason: '正文少于 40 个字符' }
  return { qualityStatus: 'good', failureReason: null }
}
