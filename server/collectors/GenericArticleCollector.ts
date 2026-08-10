import { load } from 'cheerio'
import type { DataSource } from '../../shared/types.js'
import type { CollectedItem, Collector } from './Collector.js'
import { assessQuality, normalizePublishedAt, normalizeText, summarize } from './content.js'
import type { HttpFetcher } from './http/LiveHttpClient.js'

function firstContent($: ReturnType<typeof load>, selectors: string[]) {
  for (const selector of selectors) {
    const element = $(selector).first()
    const text = normalizeText(element.text())
    if (text.length >= 40) return text
  }
  return ''
}

export class GenericArticleCollector implements Collector {
  constructor(private readonly http: HttpFetcher) {}

  async collect(source: DataSource): Promise<CollectedItem[]> {
    const response = await this.http.get(source.entryUrl)
    const $ = load(response.body)
    $(source.collectorConfig?.removeSelectors?.join(',') || 'script,style,noscript,svg,nav,footer,header,form,aside').remove()
    const title = normalizeText(
      $(source.collectorConfig?.titleSelector || 'h1').first().text()
      || $('meta[property="og:title"]').attr('content')
      || $('title').text(),
    )
    const contentSelectors = source.collectorConfig?.contentSelector
      ? [source.collectorConfig.contentSelector]
      : ['article', 'main', '[role="main"]', '.article-content', '.article-body', '.content']
    const rawText = firstContent($, contentSelectors)
    const dateValue = source.collectorConfig?.dateSelector
      ? $(source.collectorConfig.dateSelector).first().attr('datetime') || $(source.collectorConfig.dateSelector).first().text()
      : $('meta[property="article:published_time"]').attr('content') || $('time').first().attr('datetime') || $('time').first().text()
    const quality = assessQuality(title, rawText)
    return [{
      title,
      rawText,
      summary: summarize(rawText),
      publishedAt: normalizePublishedAt(dateValue),
      originalUrl: response.url,
      rawPayload: { sourceUrl: source.entryUrl, attempts: response.attempts },
      collectorType: 'generic_article',
      httpStatus: response.status,
      contentLength: rawText.length,
      ...quality,
      isDemo: false,
    }]
  }
}
