import { evidenceAnalysisJsonSchema } from '../ai/evidenceSchema.js'
import { modelAnalysisText, type AIProvider, type AIProviderExecution, type EvidenceInputItem } from './AIProvider.js'

export const EVIDENCE_ANALYSIS_SYSTEM_PROMPT = [
  '你是饮料创新证据分析器。必须独立判断 evidenceRole 与 relevanceScore。',
  '第一步只根据资料来源性质判断 evidenceRole；第二步再判断资料对当前饮品创新问题的直接价值 relevanceScore。不得用 relevanceScore 反推 evidenceRole；相关性低不等于 irrelevant。',
  'consumer_evidence：来源本身是消费者的真实评价、体验、购买反馈、问卷回答或用户表达。sourceKind=consumer_comment 且 rawText 是真实用户体验时归为 consumer_evidence；单条评论不得外推整体市场。',
  'market_evidence：来源本身描述品牌、新品、竞品、市场、品类、商业活动或行业动态。brand_news 或品牌官方材料归为 market_evidence；即使文中声称消费者喜欢或需要什么，也绝不能归为 consumer_evidence。',
  'background_evidence：来源本身提供与食品、饮料或消费品经营环境明确相关的政策、法规、监管、食品安全、公共卫生、技术规范、宏观统计或行业经营环境。即使 relevanceScore 只有 0.1 至 0.4，仍应归为 background_evidence。',
  'irrelevant：只有资料既不能作为 consumer_evidence、market_evidence，也不能作为合理的 background context 时使用。完全无关的政府新闻、社会新闻可归为 irrelevant。',
  '只有 consumer_evidence 可以设置 eligibleForConceptGeneration=true；其他角色必须为 false。',
  '每条资料选择 1 至 3 条最重要引文。quote 必须逐字复制 analysisText 中的连续字符串；禁止翻译、改写、修正标点、拼接片段或添加省略号。找不到长引文时，选择较短但完整的原文连续片段。',
  '只能使用输入原文，不得编造。严格按照 Structured Output 返回 JSON。',
].join('\n')

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
      const currentCharacters = current?.reduce((sum, entry) => sum + modelAnalysisText(entry).length, 0) ?? 0
      if (!current || (current.length > 0 && currentCharacters + modelAnalysisText(item).length > characterLimit)) chunks.push([item])
      else current.push(item)
    }
    if (chunks.length === 1) return { ...await this.analyzeChunk(chunks[0]), subrequestCount: 1 }
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
      subrequestCount: chunks.length,
    }
  }

  private async analyzeChunk(items: EvidenceInputItem[]): Promise<AIProviderExecution> {
    const endpoint = `${this.options.baseUrl.replace(/\/+$/, '')}/responses`
    const inputPayload = items.map((item) => ({
      itemId: item.id,
      title: item.title,
      analysisText: modelAnalysisText(item),
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
            text: EVIDENCE_ANALYSIS_SYSTEM_PROMPT,
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
