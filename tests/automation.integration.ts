import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import type { CollectedItem, Collector } from '../server/collectors/Collector.js'
import { NoopNotificationProvider } from '../server/notifications/NoopNotificationProvider.js'
import { ManualJsonAIProvider } from '../server/providers/ManualJsonAIProvider.js'
import { MockAIProvider } from '../server/providers/MockAIProvider.js'
import { MockRepository } from '../server/repositories/MockRepository.js'
import { AIAnalysisService } from '../server/services/AIAnalysisService.js'
import { DailyAutomationOrchestrator } from '../server/services/DailyAutomationOrchestrator.js'
import { DevelopmentBatchPreparationService } from '../server/services/DevelopmentBatchPreparationService.js'
import { JobService } from '../server/services/JobService.js'
import { TrendAggregationService } from '../server/services/TrendAggregationService.js'
import { QuoteRepairService } from '../server/ai/QuoteRepairService.js'
import { DataPathResolver } from '../server/storage/DataPathResolver.js'
import type { DataSource, EvidenceAnalysisData, RawItem } from '../shared/types.js'

const tempDir = resolve('tmp', `automation-test-${randomUUID()}`)
await mkdir(tempDir, { recursive: true })

const makeSource = (id: string): DataSource => ({
  id,
  name: id,
  type: 'industry_article',
  entryUrl: `https://example.com/${id}`,
  crawlMethod: 'test',
  keywords: [],
  schedule: 'daily',
  enabled: true,
  collectionMode: 'live',
  collectorType: 'generic_article',
  collectorConfig: null,
  lastSuccessAt: null,
  failureCount: 0,
  lastError: null,
  lastRunNewCount: 0,
  notes: 'test',
})

const makeCollected = (source: DataSource): CollectedItem => ({
  title: `${source.id} title`,
  rawText: `${source.id} 的公开资料正文，长度足够用于自动化采集、去重和批次准备验证。`,
  summary: `${source.id} summary`,
  publishedAt: '2026-08-09T00:00:00.000Z',
  originalUrl: `${source.entryUrl}/article`,
  rawPayload: {},
  collectorType: 'generic_article',
  httpStatus: 200,
  contentLength: 80,
  qualityStatus: 'good',
  failureReason: null,
  isDemo: false,
})

class RetryCollector implements Collector {
  attempts = new Map<string, number>()
  constructor(private readonly failBeforeSuccess: Record<string, number>, private readonly delayMs = 0) {}
  async collect(source: DataSource) {
    const attempt = (this.attempts.get(source.id) ?? 0) + 1
    this.attempts.set(source.id, attempt)
    if (this.delayMs) await new Promise((resolveDelay) => setTimeout(resolveDelay, this.delayMs))
    if (attempt <= (this.failBeforeSuccess[source.id] ?? 0)) throw new Error(`planned failure ${source.id} #${attempt}`)
    return [makeCollected(source)]
  }
}

const configureOnly = async (repository: MockRepository, sources: DataSource[]) => {
  for (const source of await repository.getDataSources()) await repository.saveDataSource({ ...source, enabled: false })
  for (const source of sources) await repository.saveDataSource(source)
}

const makeRaw = (id: string, sourceId: string, rawText: string): RawItem => ({
  id,
  sourceId,
  title: id,
  rawText,
  summary: id,
  publishedAt: null,
  fetchedAt: new Date().toISOString(),
  originalUrl: `https://example.com/${id}`,
  normalizedUrl: `https://example.com/${id}`,
  contentHash: `hash-${id}`,
  rawPayload: {},
  status: 'pending',
  collectorType: 'generic_article',
  httpStatus: 200,
  contentLength: rawText.length,
  qualityStatus: 'good',
  failureReason: null,
  isDemo: false,
})

const outputFor = (itemId: string, quote: string, evidenceRole: EvidenceAnalysisData['evidenceRole'] = 'background_evidence'): EvidenceAnalysisData => ({
  itemId,
  evidenceRole,
  relevanceScore: 0.8,
  relevanceReason: '测试',
  brands: [],
  productCategories: ['饮料'],
  flavors: [],
  consumerNeeds: [],
  scenes: [],
  positiveSignals: [],
  negativeSignals: [],
  riskSignals: [],
  signalType: evidenceRole === 'consumer_evidence' ? 'consumer_preference' : 'safety_context',
  evidenceQuotes: [{ quote, supports: '测试' }],
  confidence: 0.8,
  eligibleForConceptGeneration: false,
})

try {
  const repository = new MockRepository(resolve(tempDir, 'automation-db.json'))
  const good = makeSource('source-good')
  const retry = makeSource('source-retry')
  await configureOnly(repository, [good, retry])
  const collector = new RetryCollector({ 'source-retry': 1 })
  const jobs = new JobService(repository, collector, new MockAIProvider(), true)
  const ai = new AIAnalysisService(repository, new ManualJsonAIProvider(), resolve('data/evaluation/consumer-comments-v1.json'), resolve('data/evaluation/split-v1.json'))
  const automation = new DailyAutomationOrchestrator(repository, jobs, ai, new NoopNotificationProvider(), false, 60_000)
  const first = await automation.run({ triggerType: 'test', idempotencyKey: 'night-run-1' })
  assert.equal(first.collection.sources, 2)
  assert.equal(first.collection.new, 2)
  assert.equal(first.collection.failed, 0)
  assert.equal(collector.attempts.get('source-good'), 1)
  assert.equal(collector.attempts.get('source-retry'), 2, 'failed source must retry exactly once')
  assert.equal(first.analysis.status, 'pending_provider_configuration')
  assert.equal(first.analysis.createdBatches, 1)
  const persisted = (await repository.getAutomationRuns()).find((run) => run.id === first.automationRunId)
  assert.equal(persisted?.collectionRunIds.length, 3)
  assert.equal(persisted?.notificationStatus, 'skipped')

  const replay = await automation.run({ triggerType: 'test', idempotencyKey: 'night-run-1' })
  assert.equal(replay.skipped, true)
  assert.equal(replay.reason, 'idempotency_key_replayed')
  assert.equal((await repository.getAutomationRuns()).length, 1)

  const second = await automation.run({ triggerType: 'test', idempotencyKey: 'night-run-2' })
  assert.equal(second.collection.new, 0)
  assert.equal(second.analysis.createdBatches, 0, 'deduplicated run must not create an AI batch')

  const concurrentRepo = new MockRepository(resolve(tempDir, 'concurrent-db.json'))
  await configureOnly(concurrentRepo, [makeSource('source-slow')])
  const slowCollector = new RetryCollector({}, 80)
  const slowJobs = new JobService(concurrentRepo, slowCollector, new MockAIProvider(), true)
  const slowAi = new AIAnalysisService(concurrentRepo, new ManualJsonAIProvider(), resolve('data/evaluation/consumer-comments-v1.json'), resolve('data/evaluation/split-v1.json'))
  const concurrentAutomation = new DailyAutomationOrchestrator(concurrentRepo, slowJobs, slowAi, new NoopNotificationProvider(), false, 60_000)
  const running = concurrentAutomation.run({ triggerType: 'test' })
  await new Promise((resolveDelay) => setTimeout(resolveDelay, 10))
  const skipped = await concurrentAutomation.run({ triggerType: 'test' })
  assert.equal(skipped.reason, 'automation_already_running')
  await running

  const failingRepo = new MockRepository(resolve(tempDir, 'failing-db.json'))
  await configureOnly(failingRepo, [makeSource('source-ok'), makeSource('source-always-fails')])
  const failingCollector = new RetryCollector({ 'source-always-fails': 99 })
  const failingJobs = new JobService(failingRepo, failingCollector, new MockAIProvider(), true)
  const failingAi = new AIAnalysisService(failingRepo, new ManualJsonAIProvider(), resolve('data/evaluation/consumer-comments-v1.json'), resolve('data/evaluation/split-v1.json'))
  const partial = await new DailyAutomationOrchestrator(failingRepo, failingJobs, failingAi, new NoopNotificationProvider(), false, 60_000).run({ triggerType: 'test' })
  assert.equal(partial.status, 'partial_success')
  assert.equal(partial.collection.failed, 1)
  assert.equal(failingCollector.attempts.get('source-always-fails'), 2)
  assert.equal(failingCollector.attempts.get('source-ok'), 1, 'one source failure must not block others')

  const quoteRepair = new QuoteRepairService()
  const unique = quoteRepair.repair('"清爽 自然"', '用户评价：“清爽\u00a0自然”，适合冰饮。')
  assert.equal(unique.quoteAutoRepaired, true)
  assert.equal(unique.repairedQuote, '“清爽\u00a0自然”')
  const multiple = quoteRepair.repair('"清爽"', '用户说“清爽”，另一位也说“清爽”。')
  assert.equal(multiple.repairMethod, 'normalized_multiple')
  assert.equal(multiple.repairedQuote, null)

  const validationRepo = new MockRepository(resolve(tempDir, 'validation-db.json'))
  await configureOnly(validationRepo, [makeSource('source-validation')])
  const rawOne = makeRaw('raw-quote-one', 'source-validation', '用户评价：“清爽\u00a0自然”，适合冰饮。')
  const rawTwo = makeRaw('raw-quote-two', 'source-validation', '用户说“清爽”，另一位也说“清爽”。')
  await validationRepo.insertRawItems([rawOne, rawTwo])
  const validationAi = new AIAnalysisService(validationRepo, new ManualJsonAIProvider(), resolve('data/evaluation/consumer-comments-v1.json'), resolve('data/evaluation/split-v1.json'))
  const validationBatch = await validationAi.createBatch([rawOne.id, rawTwo.id], { manualDoubao: true })
  const automated = await validationAi.importResults({
    batchId: validationBatch.id,
    provider: 'ark-doubao',
    mode: 'api',
    validationMode: 'automated',
    results: [outputFor(rawOne.id, '"清爽 自然"'), outputFor(rawTwo.id, '"清爽"', 'consumer_evidence')],
  })
  assert.equal(automated.validationStatus, 'partial_success')
  assert.equal(automated.records.find((record) => record.itemId === rawOne.id)?.validationStatus, 'auto_repaired')
  assert.equal(automated.records.find((record) => record.itemId === rawTwo.id)?.validationStatus, 'needs_review')
  assert.ok(automated.validationFlags.some((flag) => flag.type === 'role_conflict' && flag.severity === 'high'))

  const paths = new DataPathResolver(resolve(tempDir, 'prepared-data'))
  assert.equal(await paths.isWritable(), true)
  const manifest = await new DevelopmentBatchPreparationService(
    resolve('data/evaluation/consumer-comments-v1.json'),
    resolve('data/evaluation/split-v1.json'),
    paths,
  ).prepare()
  assert.equal(manifest.itemCount, 39)
  assert.deepEqual(manifest.batches.map((batch) => batch.itemCount), [10, 10, 10, 9])
  const split = JSON.parse(await (await import('node:fs/promises')).readFile(resolve('data/evaluation/split-v1.json'), 'utf8')) as { holdoutIds: string[] }
  const holdout = new Set(split.holdoutIds)
  assert.equal(manifest.batches.flatMap((batch) => batch.itemIds).some((id) => holdout.has(id)), false)

  const blockedPath = resolve(tempDir, 'not-a-directory')
  await writeFile(blockedPath, 'file', 'utf8')
  assert.equal(await new DataPathResolver(blockedPath).isWritable(), false)

  const trendStatus = await new TrendAggregationService(new MockRepository(resolve(tempDir, 'empty-trend-db.json'))).aggregate()
  assert.equal(trendStatus.status, 'insufficient_evidence')

  console.log('Automation integration passed: live source orchestration, one retry, idempotency, concurrency, pending AI batches, quote repair, partial validation, 39 development items, holdout isolation, DATA_DIR, and trend evidence guard.')
} finally {
  await rm(tempDir, { recursive: true, force: true })
}
