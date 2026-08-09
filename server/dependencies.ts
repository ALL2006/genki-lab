import type { AppConfig } from './config.js'
import { CollectorRouter } from './collectors/CollectorRouter.js'
import { ConfigurableListCollector } from './collectors/ConfigurableListCollector.js'
import { GenericArticleCollector } from './collectors/GenericArticleCollector.js'
import { LiveHttpClient } from './collectors/http/LiveHttpClient.js'
import { MockCollector } from './collectors/MockCollector.js'
import { RSSCollector } from './collectors/RSSCollector.js'
import { MockAIProvider } from './providers/MockAIProvider.js'
import { createAIProvider } from './providers/createAIProvider.js'
import { MockRepository } from './repositories/MockRepository.js'
import { JobService } from './services/JobService.js'
import { AIAnalysisService } from './services/AIAnalysisService.js'
import { NodeEvaluationDataLoader } from './evaluation/NodeEvaluationDataLoader.js'
import { EvaluationService } from './services/EvaluationService.js'
import { DailyAutomationOrchestrator } from './services/DailyAutomationOrchestrator.js'
import { createNotificationProvider } from './notifications/createNotificationProvider.js'
import { DataPathResolver } from './storage/DataPathResolver.js'
import { TrendAggregationService } from './services/TrendAggregationService.js'

export function createDependencies(config: AppConfig) {
  const repository = new MockRepository(config.mockDbPath)
  const dataPaths = new DataPathResolver(config.dataDir)
  const http = new LiveHttpClient({
    userAgent: config.liveCollectionUserAgent,
    timeoutMs: config.liveCollectionTimeoutMs,
    maxRetries: config.liveCollectionMaxRetries,
    requestIntervalMs: config.liveCollectionRequestIntervalMs,
  })
  const mockCollector = new MockCollector()
  const collector = new CollectorRouter({
    mock: mockCollector,
    rss: new RSSCollector(http),
    generic_article: new GenericArticleCollector(http),
    configurable_list: new ConfigurableListCollector(http),
  })
  const aiProvider = createAIProvider(config)
  const jobs = new JobService(repository, collector, new MockAIProvider(), config.enableLiveCollection)
  const evaluationDataLoader = new NodeEvaluationDataLoader(config.evaluationDatasetPath, config.evaluationSplitPath)
  const aiAnalysis = new AIAnalysisService(repository, aiProvider, evaluationDataLoader)
  const evaluations = new EvaluationService(repository, aiProvider, config.evaluationDatasetPath, config.evaluationSplitPath)
  const notification = createNotificationProvider(config.feishuNotificationWebhook)
  const automaticProviderReady = (config.aiProvider === 'ark-doubao' && Boolean(config.arkApiKey && config.arkModelId))
    || (config.aiProvider === 'miaoda-webhook' && Boolean(config.aiBatchCallbackUrl))
  const automation = new DailyAutomationOrchestrator(
    repository,
    jobs,
    aiAnalysis,
    notification,
    automaticProviderReady,
    config.automationStaleMs,
  )
  const trendAggregation = new TrendAggregationService(repository)
  return { repository, collector, aiProvider, aiAnalysis, evaluations, jobs, automation, notification, dataPaths, automaticProviderReady, trendAggregation }
}
