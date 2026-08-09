import { resolve } from 'node:path'
import type {
  AIAnalysisRecord,
  AIAnalysisRun,
  AIBatch,
  AIResultImport,
  AutomationRun,
  DataSource,
  EvaluationRun,
  ExperimentRun,
  JobRun,
  MockDatabase,
  ProductConcept,
  ProductConceptStatus,
  RawItem,
  RawItemStatus,
  ReviewStatus,
  TrendSignal,
  TrendCandidate,
  ValidationFlag,
  ValidationResponse,
} from '../../shared/types.js'
import type { AutomationClaimResult, DataRepository } from './DataRepository.js'
import { createSeedDatabase, defaultDataSources } from './seed.js'
import { readJsonStrict, writeJsonAtomic } from '../storage/AtomicJsonFile.js'

export class MockRepository implements DataRepository {
  private database: MockDatabase | null = null
  private writeQueue: Promise<void> = Promise.resolve()
  private claimQueue: Promise<void> = Promise.resolve()

  constructor(private readonly filePath = resolve(process.cwd(), 'data/mock-db.json')) {}

  private async load(): Promise<MockDatabase> {
    if (this.database) return this.database
    try {
      this.database = this.migrate(await readJsonStrict<MockDatabase>(this.filePath))
      await this.persist()
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
      this.database = createSeedDatabase()
      await this.persist()
    }
    return this.database
  }

  private migrate(database: MockDatabase): MockDatabase {
    const defaults = new Map(defaultDataSources.map((source) => [source.id, source]))
    const obsoleteIds = new Set([
      'source-rss-planned', 'source-brand-news-planned',
      'source-rss-nestle-press', 'source-brand-pepsico-newsroom',
    ])
    database.dataSources = database.dataSources
      .filter((source) => !obsoleteIds.has(source.id))
      .map((source) => ({
        ...(defaults.get(source.id) ?? {
          collectionMode: source.type === 'demo' ? 'demo' : 'live',
          collectorType: source.type === 'demo' ? 'mock' : 'generic_article',
          collectorConfig: null,
          lastError: null,
          lastRunNewCount: 0,
        }),
        ...source,
        healthStatus: source.enabled === false ? 'disabled' : (source.consecutiveFailures ?? source.failureCount ?? 0) >= 2 ? 'failing' : (source.consecutiveFailures ?? source.failureCount ?? 0) === 1 ? 'warning' : 'healthy',
        consecutiveFailures: source.consecutiveFailures ?? source.failureCount ?? 0,
        lastFailureAt: source.lastFailureAt ?? null,
        lastHttpStatus: source.lastHttpStatus ?? null,
      }))
    for (const source of defaultDataSources) {
      if (!database.dataSources.some((item) => item.id === source.id)) database.dataSources.push({ ...source })
    }
    database.rawItems = database.rawItems.map((item) => {
      const legacy = item as Partial<RawItem> & Pick<RawItem, 'isDemo' | 'rawText'>
      return {
        ...item,
        collectorType: legacy.collectorType ?? (item.isDemo ? 'mock' : 'generic_article'),
        httpStatus: legacy.httpStatus ?? null,
        contentLength: legacy.contentLength ?? item.rawText.length,
        qualityStatus: legacy.qualityStatus ?? (item.rawText.length >= 40 ? 'good' : 'low_quality'),
        failureReason: legacy.failureReason ?? (item.rawText.length >= 40 ? null : '迁移记录：正文少于 40 个字符'),
      }
    })
    database.jobRuns = database.jobRuns.map((run) => {
      const legacy = run as Partial<JobRun>
      return {
        ...run,
        collectionMode: legacy.collectionMode ?? (run.jobType === 'collect' ? (run.isDemo ? 'demo' : 'live') : null),
        sourceResults: legacy.sourceResults ?? [],
      }
    })
    database.aiBatches ??= []
    database.aiAnalysisRecords ??= []
    database.aiAnalysisRuns ??= []
    database.aiResultImports ??= []
    database.trendCandidates ??= []
    database.evaluationRuns ??= []
    database.automationRuns ??= []
    database.validationFlags ??= []
    database.experimentRuns ??= []
    return database
  }

  private async persist(): Promise<void> {
    if (!this.database) return
    this.writeQueue = this.writeQueue.then(() => writeJsonAtomic(this.filePath, this.database))
    await this.writeQueue
  }

  async getDataSources() { return [...(await this.load()).dataSources] }
  async getDataSource(id: string) { return (await this.load()).dataSources.find((item) => item.id === id) }
  async saveDataSource(source: DataSource) {
    const db = await this.load()
    const index = db.dataSources.findIndex((item) => item.id === source.id)
    if (index >= 0) db.dataSources[index] = source
    else db.dataSources.push(source)
    await this.persist()
  }
  async getRawItems(status?: RawItemStatus) {
    const items = (await this.load()).rawItems
    return status ? items.filter((item) => item.status === status) : [...items]
  }
  async insertRawItems(items: RawItem[]) {
    ;(await this.load()).rawItems.unshift(...items)
    await this.persist()
  }
  async setRawItemStatus(ids: string[], status: RawItemStatus) {
    const idSet = new Set(ids)
    for (const item of (await this.load()).rawItems) if (idSet.has(item.id)) item.status = status
    await this.persist()
  }
  async getTrendSignals(reviewStatus?: ReviewStatus) {
    const items = (await this.load()).trendSignals
    return reviewStatus ? items.filter((item) => item.reviewStatus === reviewStatus) : [...items]
  }
  async insertTrendSignals(signals: TrendSignal[]) {
    ;(await this.load()).trendSignals.unshift(...signals)
    await this.persist()
  }
  async reviewTrendSignal(id: string, status: ReviewStatus, reviewer: string) {
    const item = (await this.load()).trendSignals.find((signal) => signal.id === id)
    if (!item) return undefined
    item.reviewStatus = status
    item.reviewer = reviewer
    item.reviewedAt = new Date().toISOString()
    await this.persist()
    return item
  }
  async getProductConcepts() { return [...(await this.load()).productConcepts] }
  async insertProductConcepts(products: ProductConcept[]) {
    ;(await this.load()).productConcepts.unshift(...products)
    await this.persist()
  }
  async updateProductConcept(id: string, patch: { humanScore?: number | null; status?: ProductConceptStatus }) {
    const db = await this.load()
    const item = db.productConcepts.find((product) => product.id === id)
    if (!item) return undefined
    if (patch.humanScore !== undefined) item.humanScore = patch.humanScore
    if (patch.status !== undefined) {
      if (patch.status === 'selected') {
        for (const product of db.productConcepts) if (product.id !== id && product.status === 'selected') product.status = 'candidate'
      }
      item.status = patch.status
    }
    await this.persist()
    return item
  }
  async getValidationResponses(): Promise<ValidationResponse[]> { return [...(await this.load()).validationResponses] }
  async getJobRuns() { return [...(await this.load()).jobRuns].sort((a, b) => b.startedAt.localeCompare(a.startedAt)) }
  async saveJobRun(run: JobRun) {
    const db = await this.load()
    const index = db.jobRuns.findIndex((item) => item.id === run.id)
    if (index >= 0) db.jobRuns[index] = run
    else db.jobRuns.unshift(run)
    await this.persist()
  }
  async getAIBatches() { return [...(await this.load()).aiBatches].sort((a, b) => b.createdAt.localeCompare(a.createdAt)) }
  async getAIBatch(id: string) { return (await this.load()).aiBatches.find((item) => item.id === id) }
  async saveAIBatch(batch: AIBatch) {
    const db = await this.load()
    const index = db.aiBatches.findIndex((item) => item.id === batch.id)
    if (index >= 0) db.aiBatches[index] = batch
    else db.aiBatches.unshift(batch)
    await this.persist()
  }
  async getAIAnalysisRecords() { return [...(await this.load()).aiAnalysisRecords].sort((a, b) => b.createdAt.localeCompare(a.createdAt)) }
  async saveAIAnalysisRecords(records: AIAnalysisRecord[]) {
    for (const record of records) await this.saveAIAnalysisRecord(record)
  }
  async saveAIAnalysisRecord(record: AIAnalysisRecord) {
    const db = await this.load()
    const index = db.aiAnalysisRecords.findIndex((item) => item.id === record.id)
    if (index >= 0) db.aiAnalysisRecords[index] = record
    else db.aiAnalysisRecords.unshift(record)
    await this.persist()
  }
  async getAIAnalysisRuns() { return [...(await this.load()).aiAnalysisRuns].sort((a, b) => b.startedAt.localeCompare(a.startedAt)) }
  async saveAIAnalysisRun(run: AIAnalysisRun) {
    const db = await this.load()
    const index = db.aiAnalysisRuns.findIndex((item) => item.id === run.id)
    if (index >= 0) db.aiAnalysisRuns[index] = run
    else db.aiAnalysisRuns.unshift(run)
    await this.persist()
  }
  async getAIResultImports() { return [...(await this.load()).aiResultImports] }
  async saveAIResultImport(resultImport: AIResultImport) {
    ;(await this.load()).aiResultImports.unshift(resultImport)
    await this.persist()
  }
  async getTrendCandidates() { return [...(await this.load()).trendCandidates] }
  async saveTrendCandidates(candidates: TrendCandidate[]) {
    ;(await this.load()).trendCandidates.unshift(...candidates)
    await this.persist()
  }
  async getEvaluationRuns() { return [...(await this.load()).evaluationRuns].sort((a, b) => b.startedAt.localeCompare(a.startedAt)) }
  async saveEvaluationRun(run: EvaluationRun) {
    ;(await this.load()).evaluationRuns.unshift(run)
    await this.persist()
  }
  async getAutomationRuns() { return [...(await this.load()).automationRuns].sort((a, b) => b.startedAt.localeCompare(a.startedAt)) }
  async claimAutomationRun(run: AutomationRun, staleBefore: string): Promise<AutomationClaimResult> {
    let result: AutomationClaimResult | undefined
    const claim = async () => {
      const db = await this.load()
      const now = new Date()
      for (const existing of db.automationRuns) {
        if (existing.status === 'running' && existing.startedAt < staleBefore) {
          existing.status = 'stale_failed'
          existing.finishedAt = now.toISOString()
          existing.durationMs = Math.max(1, now.getTime() - new Date(existing.startedAt).getTime())
          existing.errorSummary = '自动任务超过运行时限，已标记为 stale_failed。'
        }
      }
      const replay = run.idempotencyKey
        ? db.automationRuns.find((item) => item.idempotencyKey === run.idempotencyKey)
        : undefined
      if (replay) result = { outcome: 'idempotency_replayed', run: replay }
      else {
        const active = db.automationRuns.find((item) => item.status === 'running')
        if (active) result = { outcome: 'already_running', run: active }
        else {
          db.automationRuns.unshift(run)
          result = { outcome: 'claimed', run }
        }
      }
      await this.persist()
    }
    const queued = this.claimQueue.then(claim, claim)
    this.claimQueue = queued.then(() => undefined, () => undefined)
    await queued
    if (!result) throw new Error('自动化运行锁定结果缺失。')
    return result
  }
  async saveAutomationRun(run: AutomationRun) {
    const db = await this.load()
    const index = db.automationRuns.findIndex((item) => item.id === run.id)
    if (index >= 0) db.automationRuns[index] = run
    else db.automationRuns.unshift(run)
    await this.persist()
  }
  async getValidationFlags() { return [...(await this.load()).validationFlags] }
  async saveValidationFlags(flags: ValidationFlag[]) {
    const db = await this.load()
    for (const flag of flags) {
      const index = db.validationFlags.findIndex((item) => item.id === flag.id)
      if (index >= 0) db.validationFlags[index] = flag
      else db.validationFlags.unshift(flag)
    }
    await this.persist()
  }
  async getExperimentRuns() { return [...(await this.load()).experimentRuns].sort((a, b) => b.startedAt.localeCompare(a.startedAt)) }
  async saveExperimentRun(run: ExperimentRun) {
    const db = await this.load()
    const index = db.experimentRuns.findIndex((item) => item.id === run.id)
    if (index >= 0) db.experimentRuns[index] = run
    else db.experimentRuns.unshift(run)
    await this.persist()
  }
}
