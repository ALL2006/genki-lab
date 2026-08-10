import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { gunzipSync } from 'node:zlib'
import { resolve } from 'node:path'
import type { MockDatabase } from '../shared/types.js'

const outputDir = resolve('data/migrations/generated')
const sqlPath = resolve(outputDir, 'genki-lab-production-seed.sql')
const manifestPath = resolve(outputDir, 'genki-lab-production-seed.manifest.json')

const quote = (value: unknown) => value === null || value === undefined
  ? 'NULL'
  : `'${String(value).replaceAll("'", "''")}'`
const bool = (value: boolean) => value ? 1 : 0

async function loadDatabase(): Promise<{ database: MockDatabase; source: string }> {
  try {
    return { database: JSON.parse(await readFile(resolve('data/mock-db.json'), 'utf8')) as MockDatabase, source: 'data/mock-db.json' }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
    const base64 = (await readFile(resolve('data/bootstrap/mock-db.seed.json.gz.base64'), 'utf8')).replace(/\s+/g, '')
    const jsonText = gunzipSync(Buffer.from(base64, 'base64')).toString('utf8')
    return { database: JSON.parse(jsonText) as MockDatabase, source: 'data/bootstrap/mock-db.seed.json.gz.base64' }
  }
}

const statement = (table: string, columns: string[], values: unknown[]) =>
  `INSERT OR IGNORE INTO ${table} (${columns.join(', ')}) VALUES (${values.map(quote).join(', ')});`

const { database: db, source } = await loadDatabase()
const now = new Date().toISOString()
const sql: string[] = [
  '-- GENKI LAB JSON to D1 seed',
  `-- Generated at ${now} from ${source}`,
  '-- INSERT OR IGNORE makes accidental re-import idempotent and never overwrites production changes.',
  'PRAGMA foreign_keys = ON;',
  '',
]

for (const item of db.dataSources) sql.push(statement('data_sources',
  ['id', 'type', 'enabled', 'collection_mode', 'health_status', 'updated_at', 'payload'],
  [item.id, item.type, bool(item.enabled), item.collectionMode, item.healthStatus ?? null, now, JSON.stringify(item)]))
for (const item of db.rawItems) sql.push(statement('raw_items',
  ['id', 'source_id', 'status', 'fetched_at', 'published_at', 'content_hash', 'normalized_url', 'is_demo', 'payload'],
  [item.id, item.sourceId, item.status, item.fetchedAt, item.publishedAt, item.contentHash, item.normalizedUrl, bool(item.isDemo), JSON.stringify(item)]))
for (const item of db.trendSignals) sql.push(statement('trend_signals',
  ['id', 'review_status', 'reviewed_at', 'is_demo', 'payload'],
  [item.id, item.reviewStatus, item.reviewedAt, bool(item.isDemo), JSON.stringify(item)]))
for (const item of db.productConcepts) sql.push(statement('product_concepts',
  ['id', 'status', 'is_demo', 'payload'], [item.id, item.status, bool(item.isDemo), JSON.stringify(item)]))
for (const item of db.validationResponses) sql.push(statement('validation_responses',
  ['id', 'product_concept_id', 'submitted_at', 'is_demo', 'payload'],
  [item.id, item.productConceptId, item.submittedAt, bool(item.isDemo), JSON.stringify(item)]))
for (const item of db.jobRuns) sql.push(statement('job_runs',
  ['id', 'job_type', 'source_id', 'status', 'started_at', 'finished_at', 'is_demo', 'payload'],
  [item.id, item.jobType, item.sourceId, item.status, item.startedAt, item.finishedAt, bool(item.isDemo), JSON.stringify(item)]))
for (const item of db.aiBatches ?? []) sql.push(statement('ai_batches',
  ['id', 'provider', 'status', 'created_at', 'updated_at', 'is_demo', 'payload'],
  [item.id, item.provider, item.status, item.createdAt, item.updatedAt, bool(item.isDemo), JSON.stringify(item)]))
for (const item of db.aiAnalysisRecords ?? []) sql.push(statement('ai_analysis_records',
  ['id', 'batch_id', 'item_id', 'provider', 'evidence_role', 'review_status', 'created_at', 'is_demo', 'payload'],
  [item.id, item.batchId, item.itemId, item.provider, item.parsedAIOutput.evidenceRole, item.reviewStatus, item.createdAt, bool(item.isDemo), JSON.stringify(item)]))
for (const item of db.aiAnalysisRuns ?? []) sql.push(statement('ai_analysis_runs',
  ['id', 'batch_id', 'provider', 'started_at', 'finished_at', 'is_demo', 'payload'],
  [item.id, item.batchId, item.provider, item.startedAt, item.finishedAt, bool(item.isDemo), JSON.stringify(item)]))
for (const item of db.aiResultImports ?? []) sql.push(statement('ai_result_imports',
  ['id', 'batch_id', 'result_hash', 'imported_at', 'payload'],
  [item.id, item.batchId, item.resultHash, item.importedAt, JSON.stringify(item)]))
for (const item of db.trendCandidates ?? []) sql.push(statement('trend_candidates',
  ['id', 'review_status', 'evidence_role', 'is_demo', 'payload'],
  [item.id, item.reviewStatus, null, bool(item.isDemo), JSON.stringify(item)]))
for (const item of db.evaluationRuns ?? []) sql.push(statement('evaluation_runs',
  ['id', 'split', 'started_at', 'is_demo', 'payload'],
  [item.id, item.split, item.startedAt, bool(item.isDemo), JSON.stringify(item)]))
for (const item of db.automationRuns ?? []) sql.push(statement('automation_runs',
  ['id', 'idempotency_key', 'trigger_type', 'status', 'started_at', 'finished_at', 'is_demo', 'payload'],
  [item.id, item.idempotencyKey, item.triggerType, item.status, item.startedAt, item.finishedAt, bool(item.isDemo), JSON.stringify(item)]))
for (const item of db.validationFlags ?? []) sql.push(statement('validation_flags',
  ['id', 'analysis_record_id', 'type', 'severity', 'status', 'created_at', 'payload'],
  [item.id, item.analysisRecordId, item.type, item.severity, item.status, item.createdAt, JSON.stringify(item)]))
for (const item of db.experimentRuns ?? []) sql.push(statement('experiment_runs',
  ['id', 'experiment_type', 'mode', 'started_at', 'payload'],
  [item.id, item.experimentType, item.mode, item.startedAt, JSON.stringify(item)]))

const counts = {
  DataSource: db.dataSources.length,
  RawItem: db.rawItems.length,
  TrendSignal: db.trendSignals.length,
  ProductConcept: db.productConcepts.length,
  ValidationResponse: db.validationResponses.length,
  JobRun: db.jobRuns.length,
  AIBatch: db.aiBatches?.length ?? 0,
  AIAnalysisRecord: db.aiAnalysisRecords?.length ?? 0,
  AIAnalysisRun: db.aiAnalysisRuns?.length ?? 0,
  AIResultImport: db.aiResultImports?.length ?? 0,
  TrendCandidate: db.trendCandidates?.length ?? 0,
  EvaluationRun: db.evaluationRuns?.length ?? 0,
  AutomationRun: db.automationRuns?.length ?? 0,
  ValidationFlag: db.validationFlags?.length ?? 0,
  ExperimentRun: db.experimentRuns?.length ?? 0,
}
const realB2 = (db.aiAnalysisRecords ?? []).filter((item) => !item.isDemo && /doubao|manual/i.test(item.provider))
const b2Ids = new Set(realB2.map((item) => item.id))
const b2Flags = (db.validationFlags ?? []).filter((item) => b2Ids.has(item.analysisRecordId))
const manifest = {
  generatedAt: now,
  source,
  counts,
  samples: {
    rawItemIds: db.rawItems.slice(0, 5).map((item) => item.id),
    b2AnalysisRecordIds: realB2.map((item) => item.id),
    b2ValidationFlagIds: b2Flags.map((item) => item.id),
    latestAutomationRunId: [...(db.automationRuns ?? [])].sort((a, b) => b.startedAt.localeCompare(a.startedAt))[0]?.id ?? null,
  },
}

await mkdir(outputDir, { recursive: true })
await writeFile(sqlPath, `${sql.join('\n')}\n`, 'utf8')
await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8')
console.log(JSON.stringify({ sqlPath, manifestPath, ...manifest }, null, 2))
