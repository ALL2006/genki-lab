import evaluationDataset from '../data/evaluation/consumer-comments-v1.json'
import evaluationSplit from '../data/evaluation/split-v1.json'
import { InMemoryEvaluationDataLoader, type EvaluationDatasetFile, type EvaluationSplitFile } from '../server/evaluation/EvaluationDataLoader.js'
import { FeishuWebhookNotificationProvider } from '../server/notifications/FeishuWebhookNotificationProvider.js'
import { NoopNotificationProvider } from '../server/notifications/NoopNotificationProvider.js'
import { ArkDoubaoAIProvider } from '../server/providers/ArkDoubaoAIProvider.js'
import type { AIProvider } from '../server/providers/AIProvider.js'
import { ManualJsonAIProvider } from '../server/providers/ManualJsonAIProvider.js'
import { MiaodaWebhookAIProvider } from '../server/providers/MiaodaWebhookAIProvider.js'
import { MockAIProvider } from '../server/providers/MockAIProvider.js'
import { D1Repository } from '../server/repositories/D1Repository.js'
import { AIAnalysisService } from '../server/services/AIAnalysisService.js'
import { DailyAutomationOrchestrator } from '../server/services/DailyAutomationOrchestrator.js'
import { JobService } from '../server/services/JobService.js'
import { TrendAggregationService } from '../server/services/TrendAggregationService.js'
import { AnalysisTextBackfillService } from '../server/services/AnalysisTextBackfillService.js'
import { WorkerCollector } from './collectors/WorkerCollector.js'
import type { Env } from './types.js'

const positiveInt = (value: string | undefined, fallback: number) => {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback
}

function createProvider(env: Env): { provider: AIProvider; ready: boolean } {
  if (env.ARK_API_KEY && env.ARK_MODEL_ID) {
    return {
      provider: new ArkDoubaoAIProvider({
        apiKey: env.ARK_API_KEY,
        model: env.ARK_MODEL_ID,
        baseUrl: env.ARK_BASE_URL ?? 'https://ark.cn-beijing.volces.com/api/v3',
        timeoutMs: 90_000,
        maxRetries: 0,
        maxInputCharactersPerRequest: 12_000,
      }),
      ready: true,
    }
  }
  if (env.MIAODA_WEBHOOK_URL) {
    return {
      provider: new MiaodaWebhookAIProvider({
        callbackUrl: env.MIAODA_WEBHOOK_URL,
        importSecret: env.AI_IMPORT_SECRET ?? '',
        timeoutMs: 30_000,
      }),
      ready: true,
    }
  }
  return { provider: new ManualJsonAIProvider(), ready: false }
}

export function createWorkerDependencies(env: Env) {
  const repository = new D1Repository(env.DB)
  const collector = new WorkerCollector({
    maxRequests: positiveInt(env.MAX_TOTAL_EXTERNAL_FETCHES, 8),
    maxItemsPerSource: Math.min(positiveInt(env.MAX_FETCHES_PER_SOURCE, 2), 5),
    maxResponseBytes: Math.min(positiveInt(env.MAX_RESPONSE_BYTES, 1_000_000), 2_000_000),
    timeoutMs: Math.min(positiveInt(env.SOURCE_TIMEOUT_MS, 8_000), 20_000),
  })
  const { provider, ready: automaticProviderReady } = createProvider(env)
  const evaluationLoader = new InMemoryEvaluationDataLoader(
    evaluationDataset as EvaluationDatasetFile,
    evaluationSplit as EvaluationSplitFile,
  )
  const aiAnalysis = new AIAnalysisService(repository, provider, evaluationLoader)
  const jobs = new JobService(repository, collector, new MockAIProvider(), true)
  const notification = env.FEISHU_NOTIFICATION_WEBHOOK
    ? new FeishuWebhookNotificationProvider(env.FEISHU_NOTIFICATION_WEBHOOK)
    : new NoopNotificationProvider()
  const automation = new DailyAutomationOrchestrator(
    repository,
    jobs,
    aiAnalysis,
    notification,
    automaticProviderReady,
    positiveInt(env.AUTOMATION_STALE_MS, 30 * 60 * 1000),
  )
  return {
    repository,
    aiAnalysis,
    jobs,
    notification,
    automation,
    trendAggregation: new TrendAggregationService(repository),
    analysisTextBackfill: new AnalysisTextBackfillService(repository),
    automaticProviderReady,
    maxSources: positiveInt(env.MAX_SOURCES_PER_AUTOMATION, 3),
    evaluationDataset,
    evaluationSplit,
  }
}
