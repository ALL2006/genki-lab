import { evidenceAnalysisJsonSchema } from '../ai/evidenceSchema.js'
import type { AIProvider, AIProviderExecution, EvidenceInputItem } from './AIProvider.js'

export interface ArkDoubaoAIProviderOptions {
  apiKey: string
  model: string
  baseUrl: string
  timeoutMs: number
  maxRetries: number
  maxInputCharactersPerRequest?: number
  fetchImplementation?: typeof fetch
}

const retryableStatuses = new Set([408, 425, 429, 500, 502, 503, 504])

function delay(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds))
}

function extractOutputText(payload: Record<string, unknown>) {
  if (typeof payload.output_text === 'string') return payload.output_text
  const output = Array.isArray(payload.output) ? payload.output : []
  for (const item of output) {
    if (!item || typeof item !== 'object') continue
    const content = Array.isArray((item as { content?: unknown }).content) ? (item as { content: unknown[] }).content : []
    for (const part of content) {
      if (part && typeof part === 'object' && typeof (part as { text?: unknown }).text === 'string') {
        return (part as { text: string }).text
      }
    }
  }
  throw new Error('方舟响应中没有找到 output_text')
}

function parseJsonText(value: string): unknown {
  const trimmed = value.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')
  return JSON.parse(trimmed) as unknown
}

export class ArkDoubaoAIProvider implements AIProvider {
  readonly name = 'ark-doubao' as const
  readonly mode = 'api' as const
  readonly isAutomated = true
  readonly isDemo = false
  readonly delivery = 'synchronous' as const
  readonly model: string
  private readonly fetchImplementation: typeof fetch

  constructor(private readonly options: ArkDoubaoAIProviderOptions) {
    if (!options.apiKey || !options.model) throw new Error('ArkDoubaoAIProvider 需要 ARK_API_KEY 和 ARK_MODEL_ID。')
    this.model = options.model
    // Cloudflare's global fetch requires its original receiver. Wrapping it avoids
    // calling the platform function as a class method (`this.fetchImplementation`).
    this.fetchImplementation = options.fetchImplementation ?? ((input, init) => fetch(input, init))
  }

  async analyzeEvidence(items: EvidenceInputItem[]): Promise<AIProviderExecution> {
    const characterLimit = this.options.maxInputCharactersPerRequest ?? Number.POSITIVE_INFINITY
    const chunks: EvidenceInputItem[][] = []
    for (const item of items) {
      const current = chunks.at(-1)
      const currentCharacters = current?.reduce((sum, entry) => sum + entry.rawText.length, 0) ?? 0
      if (!current || (current.length > 0 && currentCharacters + item.rawText.length > characterLimit)) chunks.push([item])
      else current.push(item)
    }
    if (chunks.length === 1) return this.analyzeChunk(chunks[0])
    const executions = await Promise.all(chunks.map((chunk) => this.analyzeChunk(chunk)))
    const sumUsage = (key: keyof NonNullable<AIProviderExecution['tokenUsage']>) => {
      const values = executions.map((execution) => execution.tokenUsage?.[key]).filter((value): value is number => typeof value === 'number')
      return values.length ? values.reduce((sum, value) => sum + value, 0) : null
    }
    return {
      outputs: executions.flatMap((execution) => execution.outputs),
      rawResponse: { chunks: executions.map((execution) => execution.rawResponse) },
      retryCount: executions.reduce((sum, execution) => sum + execution.retryCount, 0),
      tokenUsage: {
        inputTokens: sumUsage('inputTokens'),
        outputTokens: sumUsage('outputTokens'),
        totalTokens: sumUsage('totalTokens'),
      },
      outputCharacters: executions.reduce((sum, execution) => sum + execution.outputCharacters, 0),
    }
  }

  private async analyzeChunk(items: EvidenceInputItem[]): Promise<AIProviderExecution> {
    const endpoint = `${this.options.baseUrl.replace(/\/+$/, '')}/responses`
    const inputPayload = items.map((item) => ({
      itemId: item.id,
      title: item.title,
      rawText: item.rawText,
      sourceKind: item.sourceKind,
      dataSourceType: item.dataSourceType ?? null,
    }))
    const requestBody = {
      model: this.model,
      store: false,
      thinking: { type: 'disabled' },
      input: [
        {
          role: 'system',
          content: [{
            type: 'input_text',
            text: '你是饮料创新证据分析器。只能使用输入原文，不得编造字段或引文。品牌官方新闻不能作为消费者偏好证据；background_evidence 与 irrelevant 不得进入概念生成。返回严格 JSON。',
          }],
        },
        {
          role: 'user',
          content: [{ type: 'input_text', text: JSON.stringify({ items: inputPayload }) }],
        },
      ],
      text: {
        format: {
          type: 'json_schema',
          name: 'genki_evidence_analysis_batch',
          strict: true,
          schema: {
            type: 'object',
            additionalProperties: false,
            required: ['results'],
            properties: { results: { type: 'array', items: evidenceAnalysisJsonSchema } },
          },
        },
      },
    }

    let retryCount = 0
    let lastError: Error | null = null
    for (let attempt = 0; attempt <= this.options.maxRetries; attempt += 1) {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), this.options.timeoutMs)
      try {
        const response = await this.fetchImplementation(endpoint, {
          method: 'POST',
          headers: { Authorization: `Bearer ${this.options.apiKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
          signal: controller.signal,
        })
        const responseText = await response.text()
        if (!response.ok) {
          const error = new Error(`方舟 API 返回 HTTP ${response.status}`)
          if (!retryableStatuses.has(response.status) || attempt === this.options.maxRetries) throw error
          lastError = error
        } else {
          const rawResponse = JSON.parse(responseText) as Record<string, unknown>
          const parsed = parseJsonText(extractOutputText(rawResponse)) as { results?: unknown }
          if (!parsed || !Array.isArray(parsed.results)) throw new Error('方舟结构化输出缺少 results 数组')
          const usage = rawResponse.usage && typeof rawResponse.usage === 'object'
            ? rawResponse.usage as Record<string, unknown>
            : null
          return {
            outputs: parsed.results,
            rawResponse,
            retryCount,
            tokenUsage: usage ? {
              inputTokens: typeof usage.input_tokens === 'number' ? usage.input_tokens : null,
              outputTokens: typeof usage.output_tokens === 'number' ? usage.output_tokens : null,
              totalTokens: typeof usage.total_tokens === 'number' ? usage.total_tokens : null,
            } : null,
            outputCharacters: responseText.length,
          }
        }
      } catch (error) {
        const normalized = error instanceof Error ? error : new Error('未知方舟调用错误')
        lastError = normalized.name === 'AbortError' ? new Error(`方舟请求在 ${this.options.timeoutMs}ms 后超时`) : normalized
        const retryableNetworkError = normalized.name === 'AbortError' || normalized.message === 'fetch failed'
        if (!retryableNetworkError || attempt === this.options.maxRetries) throw lastError
      } finally {
        clearTimeout(timeout)
      }
      retryCount += 1
      await delay(Math.min(2_000, 250 * 2 ** attempt))
    }
    throw lastError ?? new Error('方舟调用失败')
  }
}
