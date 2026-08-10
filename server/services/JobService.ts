import { randomUUID } from 'node:crypto'
import { performance } from 'node:perf_hooks'
import type {
  CollectionMode,
  CollectionSourceResult,
  DashboardSummary,
  JobRun,
  JobType,
  ProductConcept,
  RawItem,
  TrendSignal,
  ValidationSummary,
} from '../../shared/types.js'
import type { Collector } from '../collectors/Collector.js'
import type { AIProvider } from '../providers/AIProvider.js'
import type { DataRepository } from '../repositories/DataRepository.js'
import { createContentHash, normalizeUrl } from '../utils/content.js'
import { AnalysisTextNormalizer } from '../analysis-text/AnalysisTextNormalizer.js'

interface JobMetrics {
  fetchedCount?: number
  newCount?: number
  duplicateCount?: number
  processedCount?: number
  failedCount?: number
}

export interface CollectOptions {
  mode?: CollectionMode
  sourceIds?: string[]
}

interface TaskOutput<T> {
  result: T
  metrics?: JobMetrics
  status?: 'success' | 'failed'
  errorMessage?: string | null
  sourceResults?: CollectionSourceResult[]
}

export interface JobResult<T> {
  run: JobRun
  result: T
}

export class JobService {
  private readonly analysisTextNormalizer = new AnalysisTextNormalizer()
  constructor(
    private readonly repository: DataRepository,
    private readonly collector: Collector,
    private readonly aiProvider: AIProvider,
    private readonly enableLiveCollection = false,
  ) {}

  private async run<T>(
    jobType: JobType,
    sourceId: string | null,
    task: () => Promise<TaskOutput<T>>,
    options: { isDemo?: boolean; collectionMode?: CollectionMode | null } = {},
  ): Promise<JobResult<T>> {
    const started = performance.now()
    const run: JobRun = {
      id: `job-${randomUUID()}`,
      jobType,
      sourceId,
      startedAt: new Date().toISOString(),
      finishedAt: null,
      status: 'running',
      fetchedCount: 0,
      newCount: 0,
      duplicateCount: 0,
      processedCount: 0,
      failedCount: 0,
      errorMessage: null,
      durationMs: 0,
      collectionMode: options.collectionMode ?? null,
      sourceResults: [],
      isDemo: options.isDemo ?? true,
    }
    await this.repository.saveJobRun(run)
    try {
      const { result, metrics = {}, status = 'success', errorMessage = null, sourceResults = [] } = await task()
      Object.assign(run, metrics)
      run.status = status
      run.errorMessage = errorMessage
      run.sourceResults = sourceResults
      run.finishedAt = new Date().toISOString()
      run.durationMs = Math.max(1, Math.round(performance.now() - started))
      await this.repository.saveJobRun(run)
      return { run, result }
    } catch (error) {
      run.status = 'failed'
      run.failedCount = Math.max(1, run.failedCount)
      run.errorMessage = error instanceof Error ? error.message : '未知任务错误'
      run.finishedAt = new Date().toISOString()
      run.durationMs = Math.max(1, Math.round(performance.now() - started))
      await this.repository.saveJobRun(run)
      throw error
    }
  }

  async collect(options: CollectOptions = {}): Promise<JobResult<{ inserted: RawItem[] }>> {
    const mode = options.mode ?? 'demo'
    if (mode === 'live' && !this.enableLiveCollection) throw new Error('真实采集未启用，请设置 ENABLE_LIVE_COLLECTION=true。')
    const sources = await this.repository.getDataSources()
    const requested = options.sourceIds?.length ? new Set(options.sourceIds) : null
    const selected = sources.filter((source) =>
      source.collectionMode === mode && (requested ? requested.has(source.id) : source.enabled),
    )
    if (requested && selected.length !== requested.size) throw new Error('一个或多个数据源不存在，或与请求的采集模式不匹配。')
    if (selected.length === 0) throw new Error(`没有找到可运行的 ${mode.toUpperCase()} 数据源。`)
    return this.run('collect', selected.length === 1 ? selected[0].id : null, async () => {
      const existing = await this.repository.getRawItems()
      const knownUrls = new Set(existing.map((item) => item.normalizedUrl))
      const knownHashes = new Set(existing.map((item) => item.contentHash))
      const inserted: RawItem[] = []
      const sourceResults: CollectionSourceResult[] = []

      for (const source of selected) {
        const sourceStarted = performance.now()
        try {
          const fetched = await this.collector.collect(source)
          let duplicateCount = 0
          let sourceFailedCount = 0
          const sourceItems: RawItem[] = []
          for (const item of fetched) {
            const normalizedUrl = normalizeUrl(item.originalUrl)
            const contentHash = createContentHash(item.rawText)
            if (knownUrls.has(normalizedUrl) || knownHashes.has(contentHash)) {
              duplicateCount += 1
              continue
            }
            knownUrls.add(normalizedUrl)
            knownHashes.add(contentHash)
            if (item.qualityStatus === 'rejected') sourceFailedCount += 1
            const analysisText = this.analysisTextNormalizer.normalize(item.rawText, item.rawPayload)
            sourceItems.push({
              id: `raw-${contentHash.slice(0, 16)}`,
              sourceId: source.id,
              title: item.title,
              rawText: item.rawText,
              ...analysisText,
              summary: item.summary,
              publishedAt: item.publishedAt,
              fetchedAt: new Date().toISOString(),
              originalUrl: item.originalUrl,
              normalizedUrl,
              contentHash,
              rawPayload: item.rawPayload,
              status: item.qualityStatus === 'rejected' ? 'failed' : 'pending',
              collectorType: item.collectorType,
              httpStatus: item.httpStatus,
              contentLength: item.contentLength,
              qualityStatus: item.qualityStatus,
              failureReason: item.failureReason,
              isDemo: item.isDemo,
            })
          }
          await this.repository.insertRawItems(sourceItems)
          inserted.push(...sourceItems)
          await this.repository.saveDataSource({
            ...source,
            lastSuccessAt: new Date().toISOString(),
            failureCount: 0,
            healthStatus: source.enabled ? 'healthy' : 'disabled',
            consecutiveFailures: 0,
            lastHttpStatus: fetched.find((item) => item.httpStatus !== null)?.httpStatus ?? source.lastHttpStatus ?? null,
            lastError: null,
            lastRunNewCount: sourceItems.length,
          })
          sourceResults.push({
            sourceId: source.id,
            status: 'success',
            fetchedCount: fetched.length,
            newCount: sourceItems.length,
            duplicateCount,
            failedCount: sourceFailedCount,
            errorMessage: null,
            durationMs: Math.max(1, Math.round(performance.now() - sourceStarted)),
          })
        } catch (error) {
          const message = error instanceof Error ? error.message : '未知采集错误'
          await this.repository.saveDataSource({
            ...source,
            failureCount: source.failureCount + 1,
            healthStatus: source.enabled ? (source.failureCount + 1 >= 2 ? 'failing' : 'warning') : 'disabled',
            lastFailureAt: new Date().toISOString(),
            consecutiveFailures: (source.consecutiveFailures ?? source.failureCount) + 1,
            lastError: message,
            lastRunNewCount: 0,
          })
          sourceResults.push({
            sourceId: source.id,
            status: 'failed',
            fetchedCount: 0,
            newCount: 0,
            duplicateCount: 0,
            failedCount: 1,
            errorMessage: message,
            durationMs: Math.max(1, Math.round(performance.now() - sourceStarted)),
          })
        }
      }

      const metric = (key: 'fetchedCount' | 'newCount' | 'duplicateCount' | 'failedCount') =>
        sourceResults.reduce((sum, source) => sum + source[key], 0)
      const failedSources = sourceResults.filter((source) => source.status === 'failed')
      return {
        result: { inserted },
        metrics: {
          fetchedCount: metric('fetchedCount'),
          newCount: metric('newCount'),
          duplicateCount: metric('duplicateCount'),
          failedCount: metric('failedCount'),
        },
        status: failedSources.length === selected.length ? 'failed' : 'success',
        errorMessage: failedSources.length === 0
          ? null
          : failedSources.map((source) => `${source.sourceId}: ${source.errorMessage}`).join('；'),
        sourceResults,
      }
    }, { isDemo: mode === 'demo', collectionMode: mode })
  }

  async analyze(): Promise<JobResult<{ signals: TrendSignal[] }>> {
    return this.run('analyze', null, async () => {
      const pending = await this.repository.getRawItems('pending')
      if (pending.length === 0) return { result: { signals: [] }, metrics: { processedCount: 0, newCount: 0 } }
      if (!this.aiProvider.analyzeLegacy) throw new Error('当前 AI Provider 不支持第一阶段 DEMO 趋势任务。')
      const generated = await this.aiProvider.analyzeLegacy(pending)
      const signals: TrendSignal[] = generated.map((signal) => ({
        ...signal,
        id: `trend-${randomUUID()}`,
        reviewStatus: 'pending',
        reviewer: null,
        reviewedAt: null,
        isDemo: true,
      }))
      await this.repository.insertTrendSignals(signals)
      await this.repository.setRawItemStatus(pending.map((item) => item.id), 'processed')
      return { result: { signals }, metrics: { processedCount: pending.length, newCount: signals.length } }
    })
  }

  async generateProducts(): Promise<JobResult<{ products: ProductConcept[] }>> {
    return this.run('generate-products', null, async () => {
      const confirmed = await this.repository.getTrendSignals('confirmed')
      if (confirmed.length === 0) throw new Error('请先人工确认至少一条趋势信号。')
      if (!this.aiProvider.generateProducts) throw new Error('当前 AI Provider 不支持第一阶段 DEMO 产品任务。')
      const generated = await this.aiProvider.generateProducts(confirmed)
      const existing = await this.repository.getProductConcepts()
      const names = new Set(existing.map((item) => item.productName))
      const products: ProductConcept[] = generated
        .filter((item) => !names.has(item.productName))
        .slice(0, 3)
        .map((item) => ({
          ...item,
          id: `product-${randomUUID()}`,
          humanScore: null,
          status: 'candidate',
          isDemo: true,
        }))
      await this.repository.insertProductConcepts(products)
      return {
        result: { products },
        metrics: {
          processedCount: confirmed.length,
          newCount: products.length,
          duplicateCount: generated.length - products.length,
        },
      }
    })
  }

  async weeklyReport(): Promise<JobResult<{ summary: DashboardSummary }>> {
    return this.run('weekly-report', null, async () => {
      const summary = await this.getDashboardSummary()
      return { result: { summary }, metrics: { processedCount: summary.latestRuns.length } }
    })
  }

  async getDashboardSummary(): Promise<DashboardSummary> {
    const [runs, trends, products, rawItems, aiRuns, analysisRecords] = await Promise.all([
      this.repository.getJobRuns(),
      this.repository.getTrendSignals(),
      this.repository.getProductConcepts(),
      this.repository.getRawItems(),
      this.repository.getAIAnalysisRuns(),
      this.repository.getAIAnalysisRecords(),
    ])
    const since = Date.now() - 7 * 24 * 60 * 60 * 1000
    const weekly = runs.filter((run) => new Date(run.startedAt).getTime() >= since && run.jobType === 'collect')
    const completed = runs.filter((run) => run.status !== 'running')
    const successes = completed.filter((run) => run.status === 'success').length
    const finishedAIRuns = aiRuns.filter((run) => run.finishedAt !== null)
    const analyzedItemIds = new Set(analysisRecords.map((record) => record.itemId))
    const liveItems = rawItems.filter((item) => !item.isDemo)
    const totalAIItems = finishedAIRuns.reduce((sum, run) => sum + run.inputItemCount, 0)
    const totalAISuccesses = finishedAIRuns.reduce((sum, run) => sum + run.successCount, 0)
    const totalSchemaValid = finishedAIRuns.reduce((sum, run) => sum + run.schemaValidCount, 0)
    const totalQuoteValid = finishedAIRuns.reduce((sum, run) => sum + run.quoteValidCount, 0)
    const reviewed = analysisRecords.filter((record) => record.reviewStatus !== 'pending')
    return {
      weeklyFetched: weekly.reduce((sum, run) => sum + run.fetchedCount, 0),
      weeklyNew: weekly.reduce((sum, run) => sum + run.newCount, 0),
      weeklyDuplicate: weekly.reduce((sum, run) => sum + run.duplicateCount, 0),
      weeklyFailed: weekly.reduce((sum, run) => sum + run.failedCount, 0),
      liveItemCount: rawItems.filter((item) => !item.isDemo).length,
      demoItemCount: rawItems.filter((item) => item.isDemo).length,
      successRate: completed.length === 0 ? 0 : Math.round((successes / completed.length) * 1000) / 10,
      pendingTrendCount: trends.filter((trend) => trend.reviewStatus === 'pending').length,
      productCount: products.length,
      pendingLiveAnalysisCount: liveItems.filter((item) => !analyzedItemIds.has(item.id)).length,
      analyzedLiveCount: liveItems.filter((item) => analyzedItemIds.has(item.id)).length,
      aiCallSuccessRate: totalAIItems === 0 ? 0 : Math.round(totalAISuccesses / totalAIItems * 1000) / 10,
      schemaSuccessRate: totalAIItems === 0 ? 0 : Math.round(totalSchemaValid / totalAIItems * 1000) / 10,
      quoteValidationRate: totalAIItems === 0 ? 0 : Math.round(totalQuoteValid / totalAIItems * 1000) / 10,
      humanModificationRate: reviewed.length === 0 ? 0 : Math.round(reviewed.filter((item) => item.editedFields.length > 0).length / reviewed.length * 1000) / 10,
      aiDirectApprovalCount: reviewed.filter((item) => item.reviewStatus === 'confirmed' && item.editedFields.length === 0).length,
      aiModifiedApprovalCount: reviewed.filter((item) => item.reviewStatus === 'confirmed' && item.editedFields.length > 0).length,
      aiRejectedCount: reviewed.filter((item) => item.reviewStatus === 'rejected').length,
      aiEditedFieldCount: reviewed.reduce((sum, item) => sum + item.editedFields.length, 0),
      averageAnalysisDurationMs: finishedAIRuns.length === 0 ? 0 : Math.round(finishedAIRuns.reduce((sum, run) => sum + run.durationMs, 0) / finishedAIRuns.length),
      recentAIError: finishedAIRuns.find((run) => run.errorMessage)?.errorMessage ?? null,
      latestRuns: runs.slice(0, 8),
      failedRuns: runs.filter((run) => run.status === 'failed' || run.failedCount > 0 || Boolean(run.errorMessage)).slice(0, 5),
      isDemo: rawItems.every((item) => item.isDemo),
    }
  }

  async getValidationSummary(): Promise<ValidationSummary> {
    const responses = await this.repository.getValidationResponses()
    const average = (values: number[]) => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0
    const reasonCounts = new Map<string, number>()
    for (const response of responses) {
      for (const reason of response.rejectionReasons) reasonCounts.set(reason, (reasonCounts.get(reason) ?? 0) + 1)
    }
    const versions = ['demo-qingti-jasmine-v1', 'demo-qingti-jasmine-v2'].map((id, index) => {
      const current = responses.filter((response) => response.productConceptId === id)
      return {
        version: `V${index + 1}`,
        purchaseIntent: Math.round(average(current.map((item) => item.purchaseIntent)) * 20),
        sceneMatch: Math.round(average(current.map((item) => item.sceneMatch)) * 20),
      }
    })
    return {
      responseCount: responses.length,
      averagePurchaseIntent: Math.round(average(responses.map((item) => item.purchaseIntent)) * 20),
      rejectionReasons: [...reasonCounts.entries()].map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count),
      versionComparison: versions,
      keep: ['青提清爽入口', '细密气泡体验', '下午学习与通勤场景'],
      modify: ['降低茉莉强度', '强化真实果味', '控制代糖后味'],
      eliminate: ['未经验证的功效表达', '过重花香', '高价预设'],
      isDemo: true,
    }
  }
}
