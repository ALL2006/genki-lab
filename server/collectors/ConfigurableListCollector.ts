import { load } from 'cheerio'
import type { DataSource } from '../../shared/types.js'
import type { CollectedItem, Collector } from './Collector.js'
import { assessQuality, normalizePublishedAt, normalizeText, resolveUrl, summarize } from './content.js'
import type { HttpFetcher } from './http/LiveHttpClient.js'

export class ConfigurableListCollector implements Collector {
  constructor(private readonly http: HttpFetcher) {}

  async collect(source: DataSource): Promise<CollectedItem[]> {
    const config = source.collectorConfig
    if (!config?.itemSelector || !config.linkSelector) throw new Error('列表采集器缺少 itemSelector 或 linkSelector 配置')
    const listResponse = await this.http.get(source.entryUrl)
    const $ = load(listResponse.body)
    const rows = $(config.itemSelector).toArray().slice(0, Math.min(Math.max(config.maxItems ?? 10, 1), 30))
    if (rows.length === 0) throw new Error(`列表页未匹配到元素：${config.itemSelector}`)

    const results: CollectedItem[] = []
    for (const row of rows) {
      const element = $(row)
      const linkElement = element.find(config.linkSelector).first().length > 0 ? element.find(config.linkSelector).first() : element
      const href = linkElement.attr('href')
      if (!href) continue
      const originalUrl = resolveUrl(href, listResponse.url)
      const listTitle = normalizeText(config.titleSelector ? element.find(config.titleSelector).first().text() : linkElement.text())
      const listSummary = normalizeText(config.summarySelector ? element.find(config.summarySelector).first().text() : '')
      const listDate = config.dateSelector ? element.find(config.dateSelector).first().attr('datetime') || element.find(config.dateSelector).first().text() : ''

      let title = listTitle
      let rawText = listSummary
      let publishedAt = normalizePublishedAt(listDate)
      let status = listResponse.status
      let attempts = listResponse.attempts
      if (config.contentSelector) {
        const articleResponse = await this.http.get(originalUrl)
        const article = load(articleResponse.body)
        article(config.removeSelectors?.join(',') || 'script,style,noscript,svg,nav,footer,header,form,aside').remove()
        title ||= normalizeText(article(config.titleSelector || 'h1').first().text() || article('title').text())
        rawText = normalizeText(article(config.contentSelector).first().text()) || rawText
        if (!publishedAt && config.dateSelector) {
          const dateElement = article(config.dateSelector).first()
          publishedAt = normalizePublishedAt(dateElement.attr('datetime') || dateElement.text())
        }
        status = articleResponse.status
        attempts += articleResponse.attempts
      }
      const quality = assessQuality(title, rawText)
      results.push({
        title,
        rawText,
        summary: summarize(rawText),
        publishedAt,
        originalUrl,
        rawPayload: { listUrl: source.entryUrl, attempts },
        collectorType: 'configurable_list',
        httpStatus: status,
        contentLength: rawText.length,
        ...quality,
        isDemo: false,
      })
    }
    if (results.length === 0) throw new Error('列表页条目均缺少可用链接')
    return results
  }
}
