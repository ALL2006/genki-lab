import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { mkdir, readFile, rm } from 'node:fs/promises'
import { resolve } from 'node:path'
import type { RawItem } from '../shared/types.js'
import { AnalysisTextNormalizer } from '../server/analysis-text/AnalysisTextNormalizer.js'
import { QuoteRepairService } from '../server/ai/QuoteRepairService.js'
import { MockRepository } from '../server/repositories/MockRepository.js'
import { AnalysisTextBackfillService } from '../server/services/AnalysisTextBackfillService.js'

const rawText = (await readFile(resolve('tests/fixtures/kdp-footnote-raw.txt'), 'utf8')).trim()
const normalizer = new AnalysisTextNormalizer()
const normalized = normalizer.normalize(rawText)
assert.match(rawText, /regular varieties5, as consumers/)
assert.match(normalized.analysisText, /regular varieties, as consumers/)
assert.match(normalized.analysisText, /\b7UP\b/)
assert.match(normalized.analysisText, /\bC4\b/)
assert.match(normalized.analysisText, /\b2026\b/)
assert.match(normalized.analysisText, /35 varieties/)
assert.ok(normalized.analysisTextSpanMap.some((span) => span.transformationType === 'footnote_marker_removed'))

const quote = 'Zero sugar continues to outpace the CSD category, driving 6x more dollar growth than regular varieties, as consumers look for balance without sacrificing flavor.'
const repair = new QuoteRepairService().repair(quote, normalized.analysisText)
assert.equal(repair.repairMethod, 'exact')
const trace = normalizer.traceQuote(repair.matchedStart!, repair.matchedEnd!, normalized.analysisTextSpanMap)
assert.equal(trace.traceable, true)
assert.ok(trace.sourceTransformation.includes('footnote_marker_removed'))
assert.match(rawText.slice(trace.rawMatchedStart!, trace.rawMatchedEnd!), /regular varieties5, as consumers/)

const typography = normalizer.normalize('用户说：“清爽\u00a0自然”\r\n适合冰饮。')
assert.equal(typography.analysisText, '用户说:“清爽 自然” 适合冰饮。')
assert.ok(typography.analysisTextSpanMap.some((span) => span.transformationType === 'unicode_normalized'))
assert.ok(typography.analysisTextSpanMap.some((span) => span.transformationType === 'whitespace_normalized'))

const tempDir = resolve('tmp', `analysis-text-${randomUUID()}`)
await mkdir(tempDir, { recursive: true })
try {
  const repository = new MockRepository(resolve(tempDir, 'db.json'))
  const item: RawItem = {
    id: 'raw-analysis-text-fixture', sourceId: 'source-test', title: 'KDP footnote fixture', rawText,
    summary: 'fixture', publishedAt: null, fetchedAt: new Date().toISOString(), originalUrl: 'https://example.com/kdp',
    normalizedUrl: 'https://example.com/kdp', contentHash: 'analysis-text-fixture', rawPayload: {}, status: 'processed',
    collectorType: 'generic_article', httpStatus: 200, contentLength: rawText.length, qualityStatus: 'good', failureReason: null, isDemo: false,
  }
  await repository.insertRawItems([item])
  const service = new AnalysisTextBackfillService(repository)
  const first = await service.backfill()
  const afterFirst = (await repository.getRawItems())[0]
  const second = await service.backfill()
  const afterSecond = (await repository.getRawItems())[0]
  assert.equal(first.initialized, 1)
  assert.equal(first.updated, 0)
  assert.equal(second.initialized, 0)
  assert.equal(second.updated, 0)
  assert.equal(second.idempotent, true)
  assert.deepEqual(afterSecond, afterFirst)
  assert.equal(afterFirst.rawText, rawText)
  assert.equal(afterFirst.analysisTextVersion, 'v1')

  const lockBatch = {
    id: 'batch-lock-fixture', provider: 'ark-doubao' as const, model: 'test-model', status: 'pending' as const,
    itemIds: [item.id], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    promptVersion: 'evidence-analysis-v2.2', schemaVersion: 'evidence-analysis-v2', analysisTextVersion: 'v1' as const,
    importedResultHashes: [], isDemo: false,
  }
  await repository.saveAIBatch(lockBatch)
  assert.equal(await repository.claimAIBatchExecution(lockBatch), true)
  assert.equal(await repository.claimAIBatchExecution(lockBatch), false)
  assert.equal((await repository.getAIBatch(lockBatch.id))?.status, 'running')
} finally {
  await rm(tempDir, { recursive: true, force: true })
}

console.log('AnalysisText integration passed: deterministic footnote removal, protected real numbers, raw span traceability, Unicode/whitespace normalization, idempotent backfill, and batch execution lock.')
