export interface HttpResponseData {
  url: string
  status: number
  contentType: string
  body: string
  contentLength: number
  attempts: number
}

export interface HttpFetcher {
  get(url: string): Promise<HttpResponseData>
}

export interface LiveHttpClientOptions {
  userAgent: string
  timeoutMs: number
  maxRetries: number
  requestIntervalMs: number
  maxResponseBytes?: number
  fetchImplementation?: typeof fetch
}

const retryableStatuses = new Set([408, 425, 429, 500, 502, 503, 504])

function delay(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds))
}

async function readBoundedBody(response: Response, maxBytes: number) {
  if (!response.body) return { body: '', contentLength: 0 }
  const reader = response.body.getReader()
  const chunks: Uint8Array[] = []
  let contentLength = 0
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    contentLength += value.byteLength
    if (contentLength > maxBytes) {
      await reader.cancel()
      throw new Error(`响应正文超过 ${maxBytes} 字节上限`)
    }
    chunks.push(value)
  }
  const bytes = new Uint8Array(contentLength)
  let offset = 0
  for (const chunk of chunks) {
    bytes.set(chunk, offset)
    offset += chunk.byteLength
  }
  return { body: new TextDecoder().decode(bytes), contentLength }
}

export class LiveHttpClient implements HttpFetcher {
  private readonly lastRequestAt = new Map<string, number>()
  private readonly maxResponseBytes: number
  private readonly fetchImplementation: typeof fetch

  constructor(private readonly options: LiveHttpClientOptions) {
    this.maxResponseBytes = options.maxResponseBytes ?? 2_000_000
    this.fetchImplementation = options.fetchImplementation ?? fetch
  }

  private async respectDomainInterval(url: string) {
    const domain = new URL(url).hostname
    const previous = this.lastRequestAt.get(domain) ?? 0
    const waitMs = this.options.requestIntervalMs - (Date.now() - previous)
    if (waitMs > 0) await delay(waitMs)
    this.lastRequestAt.set(domain, Date.now())
  }

  async get(url: string): Promise<HttpResponseData> {
    let lastError: Error | null = null
    const attempts = this.options.maxRetries + 1
    for (let attempt = 1; attempt <= attempts; attempt += 1) {
      await this.respectDomainInterval(url)
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), this.options.timeoutMs)
      try {
        const response = await this.fetchImplementation(url, {
          headers: {
            'User-Agent': this.options.userAgent,
            Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml, text/html;q=0.9',
          },
          redirect: 'follow',
          signal: controller.signal,
        })
        if (!response.ok) {
          const error = new Error(`HTTP ${response.status} ${response.statusText}`)
          if (!retryableStatuses.has(response.status) || attempt === attempts) throw error
          lastError = error
        } else {
          const result = await readBoundedBody(response, this.maxResponseBytes)
          if (!result.body.trim()) throw new Error('响应正文为空')
          return {
            url: response.url || url,
            status: response.status,
            contentType: response.headers.get('content-type') ?? '',
            body: result.body,
            contentLength: result.contentLength,
            attempts: attempt,
          }
        }
      } catch (error) {
        const normalized = error instanceof Error ? error : new Error('未知网络错误')
        lastError = normalized.name === 'AbortError'
          ? new Error(`请求在 ${this.options.timeoutMs}ms 后超时`)
          : normalized
        if (attempt === attempts || (!normalized.message.startsWith('fetch failed') && normalized.name !== 'AbortError')) {
          throw lastError
        }
      } finally {
        clearTimeout(timeout)
      }
      await delay(Math.min(2_000, 250 * 2 ** (attempt - 1)))
    }
    throw lastError ?? new Error('请求失败')
  }
}
