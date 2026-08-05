import type { AppConfig } from '../config.js'
import type { AIProvider } from './AIProvider.js'
import { ArkDoubaoAIProvider } from './ArkDoubaoAIProvider.js'
import { ManualJsonAIProvider } from './ManualJsonAIProvider.js'
import { MiaodaWebhookAIProvider } from './MiaodaWebhookAIProvider.js'
import { MockAIProvider } from './MockAIProvider.js'

export function createAIProvider(config: AppConfig): AIProvider {
  switch (config.aiProvider) {
    case 'ark-doubao':
      return new ArkDoubaoAIProvider({
        apiKey: config.arkApiKey,
        model: config.arkModelId,
        baseUrl: config.arkBaseUrl,
        timeoutMs: config.arkTimeoutMs,
        maxRetries: config.arkMaxRetries,
      })
    case 'miaoda-webhook':
      return new MiaodaWebhookAIProvider({
        callbackUrl: config.aiBatchCallbackUrl,
        importSecret: config.aiImportSecret,
        timeoutMs: config.arkTimeoutMs,
      })
    case 'manual-json':
      return new ManualJsonAIProvider()
    case 'mock':
      return new MockAIProvider()
    default:
      throw new Error(`不支持的 AI_PROVIDER：${String(config.aiProvider)}`)
  }
}
