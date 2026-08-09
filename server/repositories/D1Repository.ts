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
  ProductConcept,
  ProductConceptStatus,
  RawItem,
  RawItemStatus,
  ReviewStatus,
  TrendCandidate,
  TrendSignal,
  ValidationFlag,
  ValidationResponse,
} from '../../shared/types.js'
import type { AutomationClaimResult, DataRepository } from './DataRepository.js'
import type { D1Database, D1PreparedStatement } from './D1Types.js'

interface PayloadRow { payload: string }

const json = (value: unknown) => JSON.stringify(value)
const bool = (value: boolean) => value ? 1 : 0
const parse = <T>(row: PayloadRow): T => JSON.parse(row.payload) as T

export class D1Repository implements DataRepository {
  constructor(private readonly db: D1Database) {}

  private async list<T>(sql: string, values: unknown[] = []): Promise<T[]> {
    const result = await this.db.prepare(sql).bind(...values).all<PayloadRow>()
    return (result.results ?? []).map(parse<T>)
  }

  private async one<T>(sql: string, values: unknown[] = []): Promise<T | undefined> {
    const row = await this.db.prepare(sql).bind(...values).first<PayloadRow>()
    return row ? parse<T>(row) : undefined
  }

  private async run(statement: D1PreparedStatement): Promise<void> {
    const result = await statement.run()
    if (!result.success) throw new Error(result.error ?? 'D1 写入失败。')
  }

  async ping(): Promise<boolean> {
    const result = await this.db.prepare('SELECT 1 AS ok').first<{ ok: number }>()
    return result?.ok === 1
  }

  async getDataSources() { return this.list<DataSource>('SELECT payload FROM data_sources ORDER BY id') }
  async getDataSource(id: string) { return this.one<DataSource>('SELECT payload FROM data_sources WHERE id = ?', [id]) }
  async saveDataSource(source: DataSource) {
    await this.run(this.db.prepare(`INSERT INTO data_sources
      (id, type, enabled, collection_mode, health_status, updated_at, payload)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET type=excluded.type, enabled=excluded.enabled,
      collection_mode=excluded.collection_mode, health_status=excluded.health_status,
      updated_at=excluded.updated_at, payload=excluded.payload`)
      .bind(source.id, source.type, bool(source.enabled), source.collectionMode, source.healthStatus ?? null, new Date().toISOString(), json(source)))
  }

  async getRawItems(status?: RawItemStatus) {
    return status
      ? this.list<RawItem>('SELECT payload FROM raw_items WHERE status = ? ORDER BY fetched_at DESC', [status])
      : this.list<RawItem>('SELECT payload FROM raw_items ORDER BY fetched_at DESC')
  }
  async insertRawItems(items: RawItem[]) {
    if (!items.length) return
    await this.db.batch(items.map((item) => this.db.prepare(`INSERT OR IGNORE INTO raw_items
      (id, source_id, status, fetched_at, published_at, content_hash, normalized_url, is_demo, payload)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .bind(item.id, item.sourceId, item.status, item.fetchedAt, item.publishedAt, item.contentHash, item.normalizedUrl, bool(item.isDemo), json(item))))
  }
  async setRawItemStatus(ids: string[], status: RawItemStatus) {
    if (!ids.length) return
    const items = await this.getRawItems()
    const byId = new Map(items.map((item) => [item.id, item]))
    await this.db.batch(ids.flatMap((id) => {
      const item = byId.get(id)
      if (!item) return []
      item.status = status
      return [this.db.prepare('UPDATE raw_items SET status = ?, payload = ? WHERE id = ?').bind(status, json(item), id)]
    }))
  }

  async getTrendSignals(reviewStatus?: ReviewStatus) {
    return reviewStatus
      ? this.list<TrendSignal>('SELECT payload FROM trend_signals WHERE review_status = ? ORDER BY id DESC', [reviewStatus])
      : this.list<TrendSignal>('SELECT payload FROM trend_signals ORDER BY id DESC')
  }
  async insertTrendSignals(signals: TrendSignal[]) {
    if (!signals.length) return
    await this.db.batch(signals.map((item) => this.db.prepare(`INSERT OR IGNORE INTO trend_signals
      (id, review_status, reviewed_at, is_demo, payload) VALUES (?, ?, ?, ?, ?)`)
      .bind(item.id, item.reviewStatus, item.reviewedAt, bool(item.isDemo), json(item))))
  }
  async reviewTrendSignal(id: string, status: ReviewStatus, reviewer: string) {
    const item = await this.one<TrendSignal>('SELECT payload FROM trend_signals WHERE id = ?', [id])
    if (!item) return undefined
    item.reviewStatus = status
    item.reviewer = reviewer
    item.reviewedAt = new Date().toISOString()
    await this.run(this.db.prepare('UPDATE trend_signals SET review_status = ?, reviewed_at = ?, payload = ? WHERE id = ?')
      .bind(item.reviewStatus, item.reviewedAt, json(item), id))
    return item
  }

  async getProductConcepts() { return this.list<ProductConcept>('SELECT payload FROM product_concepts ORDER BY id DESC') }
  async insertProductConcepts(items: ProductConcept[]) {
    if (!items.length) return
    await this.db.batch(items.map((item) => this.db.prepare(`INSERT OR IGNORE INTO product_concepts
      (id, status, is_demo, payload) VALUES (?, ?, ?, ?)`)
      .bind(item.id, item.status, bool(item.isDemo), json(item))))
  }
  async updateProductConcept(id: string, patch: { humanScore?: number | null; status?: ProductConceptStatus }) {
    const item = await this.one<ProductConcept>('SELECT payload FROM product_concepts WHERE id = ?', [id])
    if (!item) return undefined
    if (patch.humanScore !== undefined) item.humanScore = patch.humanScore
    if (patch.status !== undefined) {
      if (patch.status === 'selected') {
        const selected = (await this.getProductConcepts()).filter((product) => product.id !== id && product.status === 'selected')
        for (const product of selected) {
          product.status = 'candidate'
          await this.run(this.db.prepare('UPDATE product_concepts SET status = ?, payload = ? WHERE id = ?')
            .bind(product.status, json(product), product.id))
        }
      }
      item.status = patch.status
    }
    await this.run(this.db.prepare('UPDATE product_concepts SET status = ?, payload = ? WHERE id = ?')
      .bind(item.status, json(item), id))
    return item
  }

  async getValidationResponses() { return this.list<ValidationResponse>('SELECT payload FROM validation_responses ORDER BY submitted_at DESC') }
  async getJobRuns() { return this.list<JobRun>('SELECT payload FROM job_runs ORDER BY started_at DESC') }
  async saveJobRun(item: JobRun) {
    await this.run(this.db.prepare(`INSERT INTO job_runs
      (id, job_type, source_id, status, started_at, finished_at, is_demo, payload)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET status=excluded.status, finished_at=excluded.finished_at, payload=excluded.payload`)
      .bind(item.id, item.jobType, item.sourceId, item.status, item.startedAt, item.finishedAt, bool(item.isDemo), json(item)))
  }

  async getAIBatches() { return this.list<AIBatch>('SELECT payload FROM ai_batches ORDER BY created_at DESC') }
  async getAIBatch(id: string) { return this.one<AIBatch>('SELECT payload FROM ai_batches WHERE id = ?', [id]) }
  async saveAIBatch(item: AIBatch) {
    await this.run(this.db.prepare(`INSERT INTO ai_batches
      (id, provider, status, created_at, updated_at, is_demo, payload) VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET provider=excluded.provider, status=excluded.status,
      updated_at=excluded.updated_at, is_demo=excluded.is_demo, payload=excluded.payload`)
      .bind(item.id, item.provider, item.status, item.createdAt, item.updatedAt, bool(item.isDemo), json(item)))
  }
  async getAIAnalysisRecords() { return this.list<AIAnalysisRecord>('SELECT payload FROM ai_analysis_records ORDER BY created_at DESC') }
  async saveAIAnalysisRecords(items: AIAnalysisRecord[]) {
    if (!items.length) return
    await this.db.batch(items.map((item) => this.analysisRecordStatement(item)))
  }
  async saveAIAnalysisRecord(item: AIAnalysisRecord) { await this.run(this.analysisRecordStatement(item)) }
  private analysisRecordStatement(item: AIAnalysisRecord) {
    return this.db.prepare(`INSERT INTO ai_analysis_records
      (id, batch_id, item_id, provider, evidence_role, review_status, created_at, is_demo, payload)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET review_status=excluded.review_status, payload=excluded.payload`)
      .bind(item.id, item.batchId, item.itemId, item.provider, item.parsedAIOutput.evidenceRole, item.reviewStatus, item.createdAt, bool(item.isDemo), json(item))
  }
  async getAIAnalysisRuns() { return this.list<AIAnalysisRun>('SELECT payload FROM ai_analysis_runs ORDER BY started_at DESC') }
  async saveAIAnalysisRun(item: AIAnalysisRun) {
    await this.run(this.db.prepare(`INSERT INTO ai_analysis_runs
      (id, batch_id, provider, started_at, finished_at, is_demo, payload) VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET finished_at=excluded.finished_at, payload=excluded.payload`)
      .bind(item.id, item.batchId, item.provider, item.startedAt, item.finishedAt, bool(item.isDemo), json(item)))
  }
  async getAIResultImports() { return this.list<AIResultImport>('SELECT payload FROM ai_result_imports ORDER BY imported_at DESC') }
  async saveAIResultImport(item: AIResultImport) {
    await this.run(this.db.prepare(`INSERT OR IGNORE INTO ai_result_imports
      (id, batch_id, result_hash, imported_at, payload) VALUES (?, ?, ?, ?, ?)`)
      .bind(item.id, item.batchId, item.resultHash, item.importedAt, json(item)))
  }
  async getTrendCandidates() { return this.list<TrendCandidate>('SELECT payload FROM trend_candidates ORDER BY id DESC') }
  async saveTrendCandidates(items: TrendCandidate[]) {
    if (!items.length) return
    await this.db.batch(items.map((item) => this.db.prepare(`INSERT OR IGNORE INTO trend_candidates
      (id, review_status, evidence_role, is_demo, payload) VALUES (?, ?, ?, ?, ?)`)
      .bind(item.id, item.reviewStatus, null, bool(item.isDemo), json(item))))
  }
  async getEvaluationRuns() { return this.list<EvaluationRun>('SELECT payload FROM evaluation_runs ORDER BY started_at DESC') }
  async saveEvaluationRun(item: EvaluationRun) {
    await this.run(this.db.prepare(`INSERT OR IGNORE INTO evaluation_runs
      (id, split, started_at, is_demo, payload) VALUES (?, ?, ?, ?, ?)`)
      .bind(item.id, item.split, item.startedAt, bool(item.isDemo), json(item)))
  }

  async getAutomationRuns() { return this.list<AutomationRun>('SELECT payload FROM automation_runs ORDER BY started_at DESC') }
  async claimAutomationRun(run: AutomationRun, staleBefore: string): Promise<AutomationClaimResult> {
    const staleRuns = await this.list<AutomationRun>(
      "SELECT payload FROM automation_runs WHERE status = 'running' AND started_at < ?",
      [staleBefore],
    )
    for (const stale of staleRuns) {
      const finishedAt = new Date().toISOString()
      stale.status = 'stale_failed'
      stale.finishedAt = finishedAt
      stale.durationMs = Math.max(1, Date.now() - new Date(stale.startedAt).getTime())
      stale.errorSummary = '自动任务超过运行时限，已标记为 stale_failed。'
      await this.saveAutomationRun(stale)
    }
    if (run.idempotencyKey) {
      const replay = await this.one<AutomationRun>('SELECT payload FROM automation_runs WHERE idempotency_key = ?', [run.idempotencyKey])
      if (replay) return { outcome: 'idempotency_replayed', run: replay }
    }
    try {
      await this.run(this.automationStatement(run))
      return { outcome: 'claimed', run }
    } catch (error) {
      if (run.idempotencyKey) {
        const replay = await this.one<AutomationRun>('SELECT payload FROM automation_runs WHERE idempotency_key = ?', [run.idempotencyKey])
        if (replay) return { outcome: 'idempotency_replayed', run: replay }
      }
      const active = await this.one<AutomationRun>("SELECT payload FROM automation_runs WHERE status = 'running' ORDER BY started_at DESC LIMIT 1")
      if (active) return { outcome: 'already_running', run: active }
      throw error
    }
  }
  async saveAutomationRun(item: AutomationRun) { await this.run(this.automationStatement(item)) }
  private automationStatement(item: AutomationRun) {
    return this.db.prepare(`INSERT INTO automation_runs
      (id, idempotency_key, trigger_type, status, started_at, finished_at, is_demo, payload)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET status=excluded.status, finished_at=excluded.finished_at, payload=excluded.payload`)
      .bind(item.id, item.idempotencyKey, item.triggerType, item.status, item.startedAt, item.finishedAt, bool(item.isDemo), json(item))
  }

  async getValidationFlags() { return this.list<ValidationFlag>('SELECT payload FROM validation_flags ORDER BY created_at DESC') }
  async saveValidationFlags(items: ValidationFlag[]) {
    if (!items.length) return
    await this.db.batch(items.map((item) => this.db.prepare(`INSERT INTO validation_flags
      (id, analysis_record_id, type, severity, status, created_at, payload) VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET status=excluded.status, payload=excluded.payload`)
      .bind(item.id, item.analysisRecordId, item.type, item.severity, item.status, item.createdAt, json(item))))
  }
  async getExperimentRuns() { return this.list<ExperimentRun>('SELECT payload FROM experiment_runs ORDER BY started_at DESC') }
  async saveExperimentRun(item: ExperimentRun) {
    await this.run(this.db.prepare(`INSERT INTO experiment_runs
      (id, experiment_type, mode, started_at, payload) VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET payload=excluded.payload`)
      .bind(item.id, item.experimentType, item.mode, item.startedAt, json(item)))
  }
}
