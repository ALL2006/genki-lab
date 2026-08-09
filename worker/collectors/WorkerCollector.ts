import type { DataSource } from '../../shared/types.js'
import type { CollectedItem, Collector } from '../../server/collectors/Collector.js'

export interface WorkerCollectorLimits {
  maxRequests: number
  maxItemsPerSource: number
  maxResponseBytes: number
  timeoutMs: number
}

const decodeEntities = (text: string) => text
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&lt;/gi, '<')
  .replace(/&gt;/gi, '>')
  .replace(/&quot;/gi, '"')
  .replace(/&#39;|&apos;/gi, "'")
  .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))

const stripHtml = (html: string) => decodeEntities(html
  .replace(/<(script|style|noscript|svg|nav|footer|header|form|aside)\b[^>]*>[\s\S]*?<\/\1>/gi, ' ')
  .replace(/<br\s*\/?>|<\/p>|<\/li>|<\/h\d>/gi, '\n')
  .replace(/<[^>]+>/g, ' '))
  .replace(/[ \t\r]+/g, ' ')
  .replace(/\n\s+/g, '\n')
  .trim()

const match = (text: string, expression: RegExp) => expression.exec(text)?.[1]?.trim() ?? ''
const summarize = (text: string) => text.slice(0, 180).trim()
const date = (value: string) => {
  const parsed = Date.parse(value)
  return Number.isNaN(parsed) ? null : new Date(parsed).toISOString()
}
const resolveUrl = (value: string, base: string) => {
  try { return new URL(value, base).toString() } catch { return base }
}

export class WorkerCollector implements Collector {
  private requestCount = 0

  constructor(private readonly limits: WorkerCollectorLimits) {}

  async collect(source: DataSource): Promise<CollectedItem[]> {
    const started = performance.now()
    try {
      if (source.collectorType === 'mock') throw new Error('Cloudflare 生产环境不运行 DEMO Collector。')
      const items = source.collectorType === 'rss'
        ? await this.collectRss(source)
        : source.collectorType === 'configurable_list'
          ? await this.collectList(source)
          : [await this.collectArticle(source.entryUrl, source)]
      console.log(JSON.stringify({ event: 'source_collection', sourceId: source.id, status: 'success', duration: Math.round(performance.now() - started), newCount: items.length, failedCount: 0 }))
      return items
    } catch (error) {
      console.error(JSON.stringify({ event: 'source_collection', sourceId: source.id, status: 'failed', duration: Math.round(performance.now() - started), newCount: 0, failedCount: 1, error: error instanceof Error ? error.message : 'unknown' }))
      throw error
    }
  }

  private async get(url: string) {
    if (this.requestCount >= this.limits.maxRequests) throw new Error('本次 Worker 外部请求预算已用完。')
    this.requestCount += 1
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), this.limits.timeoutMs)
    try {
      const response = await fetch(url, {
        headers: { 'User-Agent': 'GENKI-LAB-Cloudflare/1.0 (+public research collector)' },
        redirect: 'follow',
        signal: controller.signal,
      })
      if (!response.ok) throw new Error(`公开页面请求失败（HTTP ${response.status}）。`)
      const declared = Number(response.headers.get('content-length') ?? 0)
      if (declared > this.limits.maxResponseBytes) throw new Error(`响应超过 ${this.limits.maxResponseBytes} 字节上限。`)
      if (!response.body) return { body: '', url: response.url, status: response.status }
      const reader = response.body.getReader()
      const chunks: Uint8Array[] = []
      let total = 0
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        total += value.byteLength
        if (total > this.limits.maxResponseBytes) {
          await reader.cancel()
          throw new Error(`响应超过 ${this.limits.maxResponseBytes} 字节上限。`)
        }
        chunks.push(value)
      }
      const joined = new Uint8Array(total)
      let offset = 0
      for (const chunk of chunks) { joined.set(chunk, offset); offset += chunk.byteLength }
      return { body: new TextDecoder().decode(joined), url: response.url, status: response.status }
    } finally {
      clearTimeout(timer)
    }
  }

  private async collectArticle(url: string, source: DataSource): Promise<CollectedItem> {
    const response = await this.get(url)
    const html = response.body
    const title = stripHtml(
      match(html, /<h1\b[^>]*>([\s\S]*?)<\/h1>/i)
      || match(html, /<meta\b[^>]*(?:property|name)=["']og:title["'][^>]*content=["']([^"']+)["']/i)
      || match(html, /<title\b[^>]*>([\s\S]*?)<\/title>/i),
    )
    const articleHtml = match(html, /<article\b[^>]*>([\s\S]*?)<\/article>/i)
      || match(html, /<main\b[^>]*>([\s\S]*?)<\/main>/i)
      || match(html, /<body\b[^>]*>([\s\S]*?)<\/body>/i)
    const rawText = stripHtml(articleHtml)
    const publishedValue = match(html, /<meta\b[^>]*property=["']article:published_time["'][^>]*content=["']([^"']+)["']/i)
      || match(html, /<time\b[^>]*datetime=["']([^"']+)["']/i)
    const quality = rawText.length >= 120 && title.length >= 3
    return {
      title,
      rawText,
      summary: summarize(rawText),
      publishedAt: date(publishedValue),
      originalUrl: response.url,
      rawPayload: { sourceUrl: url, runtime: 'cloudflare-workers', requestCount: this.requestCount },
      collectorType: source.collectorType === 'configurable_list' ? 'configurable_list' : 'generic_article',
      httpStatus: response.status,
      contentLength: rawText.length,
      qualityStatus: quality ? 'good' : 'low_quality',
      failureReason: quality ? null : '正文或标题未达到生产质量阈值。',
      isDemo: false,
    }
  }

  private async collectRss(source: DataSource): Promise<CollectedItem[]> {
    const response = await this.get(source.entryUrl)
    const records = [...response.body.matchAll(/<(item|entry)\b[^>]*>([\s\S]*?)<\/\1>/gi)]
      .slice(0, this.limits.maxItemsPerSource)
    if (!records.length) throw new Error('RSS/Atom 未找到条目。')
    return records.map((record) => {
      const body = record[2]
      const title = stripHtml(match(body, /<title\b[^>]*>([\s\S]*?)<\/title>/i))
      const link = match(body, /<link\b[^>]*href=["']([^"']+)["']/i)
        || stripHtml(match(body, /<link\b[^>]*>([\s\S]*?)<\/link>/i))
        || stripHtml(match(body, /<guid\b[^>]*>([\s\S]*?)<\/guid>/i))
      const rawText = stripHtml(
        match(body, /<(?:content:encoded|content|summary|description)\b[^>]*>([\s\S]*?)<\/(?:content:encoded|content|summary|description)>/i),
      )
      const published = stripHtml(match(body, /<(?:pubDate|published|updated|date)\b[^>]*>([\s\S]*?)<\/(?:pubDate|published|updated|date)>/i))
      const quality = rawText.length >= 40 && title.length >= 3
      return {
        title,
        rawText,
        summary: summarize(rawText),
        publishedAt: date(published),
        originalUrl: resolveUrl(link, response.url),
        rawPayload: { feedUrl: source.entryUrl, runtime: 'cloudflare-workers' },
        collectorType: 'rss' as const,
        httpStatus: response.status,
        contentLength: rawText.length,
        qualityStatus: quality ? 'good' as const : 'low_quality' as const,
        failureReason: quality ? null : 'RSS 条目未达到生产质量阈值。',
        isDemo: false,
      }
    })
  }

  private async collectList(source: DataSource): Promise<CollectedItem[]> {
    const response = await this.get(source.entryUrl)
    const entry = new URL(source.entryUrl)
    const pathPrefix = entry.pathname.replace(/\/+$/, '')
    const links = [...response.body.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>/gi)]
      .map((item) => resolveUrl(item[1], response.url))
      .filter((url, index, values) => {
        const candidate = new URL(url)
        return url !== response.url
          && candidate.hostname === entry.hostname
          && (!pathPrefix || candidate.pathname.startsWith(`${pathPrefix}/`))
          && values.indexOf(url) === index
      })
      .slice(0, Math.min(this.limits.maxItemsPerSource, source.collectorConfig?.maxItems ?? this.limits.maxItemsPerSource))
    if (!links.length) throw new Error('列表页未找到可采集的公开资料链接。')
    const output: CollectedItem[] = []
    for (const link of links) output.push(await this.collectArticle(link, source))
    return output
  }
}
