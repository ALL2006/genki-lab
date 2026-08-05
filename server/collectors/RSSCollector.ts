import { XMLParser } from 'fast-xml-parser'
import type { DataSource } from '../../shared/types.js'
import type { CollectedItem, Collector } from './Collector.js'
import { assessQuality, htmlToText, normalizePublishedAt, normalizeText, resolveUrl, summarize } from './content.js'
import type { HttpFetcher, HttpResponseData } from './http/LiveHttpClient.js'

type XmlValue = Record<string, unknown>

function asArray(value: unknown): XmlValue[] {
  if (Array.isArray(value)) return value.filter((item): item is XmlValue => Boolean(item) && typeof item === 'object')
  return value && typeof value === 'object' ? [value as XmlValue] : []
}

function textValue(value: unknown): string {
  if (typeof value === 'string' || typeof value === 'number') return String(value)
  if (!value || typeof value !== 'object') return ''
  const record = value as XmlValue
  return textValue(record['#text'] ?? record.__cdata ?? record.href ?? '')
}

function atomLink(value: unknown): string {
  if (Array.isArray(value)) {
    const alternate = value.find((item) => typeof item === 'object' && item && (item as XmlValue).rel === 'alternate')
    return textValue(alternate ?? value[0])
  }
  return textValue(value)
}

export class RSSCollector implements Collector {
  private readonly parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '', trimValues: true })

  constructor(private readonly http: HttpFetcher) {}

  async collect(source: DataSource): Promise<CollectedItem[]> {
    const response = await this.http.get(source.entryUrl)
    let document: XmlValue
    try {
      document = this.parser.parse(response.body) as XmlValue
    } catch (error) {
      throw new Error(`RSS/Atom 解析失败：${error instanceof Error ? error.message : '未知 XML 错误'}`)
    }
    const rssItems = asArray((document.rss as XmlValue | undefined)?.channel && ((document.rss as XmlValue).channel as XmlValue).item)
    const atomEntries = asArray((document.feed as XmlValue | undefined)?.entry)
    const records = rssItems.length > 0 ? rssItems : atomEntries
    if (records.length === 0) throw new Error('RSS/Atom 未找到任何条目')
    const maximum = Math.min(Math.max(source.collectorConfig?.maxItems ?? 20, 1), 50)
    return records.slice(0, maximum).map((record) => this.toCollectedItem(record, response, source, rssItems.length === 0))
  }

  private toCollectedItem(record: XmlValue, response: HttpResponseData, source: DataSource, isAtom: boolean): CollectedItem {
    const title = normalizeText(textValue(record.title))
    const link = isAtom ? atomLink(record.link) : textValue(record.link ?? record.guid)
    const rawHtml = textValue(record['content:encoded'] ?? record.content ?? record.summary ?? record.description)
    const rawText = htmlToText(rawHtml)
    const originalUrl = resolveUrl(link || response.url, response.url)
    const quality = assessQuality(title, rawText)
    return {
      title,
      rawText,
      summary: summarize(rawText),
      publishedAt: normalizePublishedAt(textValue(record.pubDate ?? record.published ?? record.updated ?? record.date)),
      originalUrl,
      rawPayload: { format: isAtom ? 'atom' : 'rss', feedUrl: source.entryUrl, attempts: response.attempts },
      collectorType: 'rss',
      httpStatus: response.status,
      contentLength: rawText.length,
      ...quality,
      isDemo: false,
    }
  }
}
