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
import { EvaluationService } from './services/EvaluationService.js'

export function createDependencies(config: AppConfig) {
  const repository = new MockRepository(config.mockDbPath)
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
  const aiAnalysis = new AIAnalysisService(repository, aiProvider)
  const evaluations = new EvaluationService(repository, aiProvider, config.evaluationDatasetPath, config.evaluationSplitPath)
  return { repository, collector, aiProvider, aiAnalysis, evaluations, jobs }
}
