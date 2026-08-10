import { modelAnalysisText, type AIProvider, type EvidenceInputItem } from './AIProvider.js'

export interface MiaodaWebhookAIProviderOptions {
  callbackUrl: string
  importSecret: string
  timeoutMs: number
  fetchImplementation?: typeof fetch
}

export class MiaodaWebhookAIProvider implements AIProvider {
  readonly name = 'miaoda-webhook' as const
  readonly model = null
  readonly mode = 'webhook' as const
  readonly isAutomated = true
  readonly isDemo = false
  readonly delivery = 'callback' as const
  private readonly fetchImplementation: typeof fetch

  constructor(private readonly options: MiaodaWebhookAIProviderOptions) {
    this.fetchImplementation = options.fetchImplementation ?? fetch
  }

  async analyzeEvidence(items: EvidenceInputItem[]) {
    if (!this.options.callbackUrl) throw new Error('MiaodaWebhookAIProvider 需要 AI_BATCH_CALLBACK_URL。')
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), this.options.timeoutMs)
    try {
      const response = await this.fetchImplementation(this.options.callbackUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-AI-IMPORT-SECRET': this.options.importSecret },
        body: JSON.stringify({
          provider: this.name,
          items: items.map((item) => ({
            itemId: item.id,
            title: item.title,
            analysisText: modelAnalysisText(item),
            analysisTextVersion: item.analysisTextVersion ?? null,
            sourceKind: item.sourceKind,
            dataSourceType: item.dataSourceType ?? null,
          })),
        }),
        signal: controller.signal,
      })
      if (!response.ok) throw new Error(`妙搭 Webhook 返回 HTTP ${response.status}`)
      const responseText = await response.text()
      return {
        outputs: [],
        rawResponse: { dispatched: true, response: responseText.slice(0, 1_000) },
        retryCount: 0,
        tokenUsage: null,
        outputCharacters: responseText.length,
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') throw new Error(`妙搭 Webhook 在 ${this.options.timeoutMs}ms 后超时`)
      throw error
    } finally {
      clearTimeout(timeout)
    }
  }
}
