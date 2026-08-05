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
  if (!value?.trim()) return null
  const timestamp = Date.parse(value)
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
