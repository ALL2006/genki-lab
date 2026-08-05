import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { mkdir, rm } from 'node:fs/promises'
import { resolve } from 'node:path'
import type { EvidenceAnalysisData, RawItem } from '../shared/types.js'
import { validateEvidenceAnalysis } from '../server/ai/evidenceSchema.js'
import { ArkDoubaoAIProvider } from '../server/providers/ArkDoubaoAIProvider.js'
import type { AIProvider } from '../server/providers/AIProvider.js'
import { ManualJsonAIProvider } from '../server/providers/ManualJsonAIProvider.js'
import { MockAIProvider } from '../server/providers/MockAIProvider.js'
import { MockRepository } from '../server/repositories/MockRepository.js'
import { AIAnalysisService } from '../server/services/AIAnalysisService.js'
import { EvaluationService } from '../server/services/EvaluationService.js'

const rawText = '这款青提气泡水很清爽，冰镇后更好喝，但价格偏高。'
const validOutput: EvidenceAnalysisData = {
  itemId: 'raw-test-1',
  evidenceRole: 'background_evidence',
  relevanceScore: 0.8,
  relevanceReason: '公开资料只能作为背景证据。',
  brands: [],
  productCategories: ['气泡水'],
  flavors: ['青提'],
  consumerNeeds: ['清爽'],
  scenes: ['冰镇饮用'],
  positiveSignals: ['清爽'],
  negativeSignals: ['价格偏高'],
  riskSignals: ['单条资料不足以代表市场'],
  signalType: 'category_trend',
  evidenceQuotes: [{ quote: '冰镇后更好喝', supports: '冰镇场景' }],
  confidence: 0.7,
  eligibleForConceptGeneration: false,
}

const context = { itemId: 'raw-test-1', rawText, sourceKind: 'raw_item' as const, dataSourceType: 'industry_article' as const }
assert.equal(validateEvidenceAnalysis(validOutput, context).errors.length, 0)
assert.equal(validateEvidenceAnalysis('{bad json}', context).schemaValid, false)
assert.equal(validateEvidenceAnalysis({ ...validOutput, confidence: undefined }, context).schemaValid, false)
assert.equal(validateEvidenceAnalysis({ ...validOutput, evidenceRole: 'unknown' }, context).schemaValid, false)
assert.equal(validateEvidenceAnalysis({ ...validOutput, itemId: 'wrong' }, context).itemIdValid, false)
assert.equal(validateEvidenceAnalysis({ ...validOutput, evidenceQuotes: [{ quote: '不存在的原文', supports: 'x' }] }, context).quoteValid, false)
assert.equal(validateEvidenceAnalysis({ ...validOutput, evidenceQuotes: [] }, context).quoteValid, false)
assert.ok(validateEvidenceAnalysis({ ...validOutput, evidenceRole: 'irrelevant', signalType: 'category_trend' }, context).errors.length > 0)
assert.ok(validateEvidenceAnalysis({ ...validOutput, evidenceRole: 'background_evidence', eligibleForConceptGeneration: true }, context).errors.length > 0)

const arkPayload = {
  output_text: JSON.stringify({ results: [validOutput] }),
  usage: { input_tokens: 10, output_tokens: 20, total_tokens: 30 },
}
let arkCalls = 0
const ark = new ArkDoubaoAIProvider({
  apiKey: 'test-key', model: 'test-model', baseUrl: 'https://example.invalid/api/v3', timeoutMs: 50, maxRetries: 2,
  fetchImplementation: async () => {
    arkCalls += 1
    if (arkCalls < 3) return new Response('busy', { status: arkCalls === 1 ? 429 : 500 })
    return new Response(JSON.stringify(arkPayload), { status: 200 })
  },
})
const arkExecution = await ark.analyzeEvidence([{ id: validOutput.itemId, title: 'test', rawText, sourceKind: 'raw_item', dataSourceType: 'industry_article', isDemo: false }])
assert.equal(arkExecution.retryCount, 2)
assert.equal(arkExecution.tokenUsage?.totalTokens, 30)
assert.equal(arkExecution.outputs.length, 1)

const timeoutArk = new ArkDoubaoAIProvider({
  apiKey: 'test-key', model: 'test-model', baseUrl: 'https://example.invalid/api/v3', timeoutMs: 5, maxRetries: 0,
  fetchImplementation: async (_url, init) => new Promise<Response>((_resolve, reject) => {
    init?.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')))
  }),
})
await assert.rejects(() => timeoutArk.analyzeEvidence([{ id: validOutput.itemId, title: 'test', rawText, sourceKind: 'raw_item', isDemo: false }]), /超时/)

const tempDir = resolve('tmp', `ai-test-${randomUUID()}`)
await mkdir(tempDir, { recursive: true })
try {
  const repository = new MockRepository(resolve(tempDir, 'db.json'))
  const rawItem: RawItem = {
    id: validOutput.itemId,
    sourceId: 'source-industry-qj-statistics',
    title: '测试资料', rawText, summary: rawText, publishedAt: null, fetchedAt: new Date().toISOString(),
    originalUrl: 'https://example.com/test', normalizedUrl: 'https://example.com/test', contentHash: 'test-hash', rawPayload: {}, status: 'pending',
    collectorType: 'generic_article', httpStatus: 200, contentLength: rawText.length, qualityStatus: 'good', failureReason: null, isDemo: false,
  }
  await repository.insertRawItems([rawItem])
  const manualService = new AIAnalysisService(repository, new ManualJsonAIProvider())
  const batch = await manualService.createBatch()
  const exported = await manualService.exportBatch(batch.id)
  assert.equal(exported.items[0].id, rawItem.id)
  const payload = { batchId: batch.id, provider: 'manual-doubao', model: 'doubao-test', mode: 'manual_import' as const, results: [validOutput] }
  const firstImport = await manualService.importResults(payload)
  assert.equal(firstImport.idempotent, false)
  assert.equal(firstImport.records[0].isAutomated, false)
  const replay = await manualService.importResults(payload)
  assert.equal(replay.idempotent, true)
  await assert.rejects(() => manualService.importResults({ ...payload, results: [{ ...validOutput, confidence: 0.6 }] }), /批次已经完成/)
  const reviewed = await manualService.reviewRecord(firstImport.records[0].id, {
    reviewStatus: 'confirmed', reviewer: '测试审核员',
    finalHumanVersion: { ...validOutput, confidence: 0.65 },
  })
  assert.deepEqual(reviewed?.editedFields, ['confidence'])
  assert.deepEqual(reviewed?.originalAIOutput, validOutput)

  const evaluation = new EvaluationService(
    repository,
    new MockAIProvider(),
    resolve('data/evaluation/consumer-comments-v1.json'),
    resolve('data/evaluation/split-v1.json'),
  )
  const development = await evaluation.run('development')
  const holdout = await evaluation.run('holdout')
  assert.equal(development.metrics.sampleCount, 39)
  assert.equal(holdout.metrics.sampleCount, 10)
  assert.equal((await repository.getEvaluationRuns()).length, 2)
  assert.match(development.disclaimer, /不代表总体市场/)

  const lowConfidenceBaseline = new MockAIProvider()
  const lowConfidenceProvider: AIProvider = {
    name: 'mock', model: 'mock-low-confidence-test', mode: 'mock', isAutomated: true, isDemo: true, delivery: 'synchronous',
    async analyzeEvidence(items) {
      const execution = await lowConfidenceBaseline.analyzeEvidence(items)
      return { ...execution, outputs: execution.outputs.map((output) => ({ ...output, confidence: 0.2 })) }
    },
  }
  const lowConfidenceEvaluation = new EvaluationService(repository, lowConfidenceProvider, resolve('data/evaluation/consumer-comments-v1.json'), resolve('data/evaluation/split-v1.json'))
  assert.equal((await lowConfidenceEvaluation.run('holdout')).metrics.lowConfidenceRate, 1)
} finally {
  await rm(tempDir, { recursive: true, force: true })
}

console.log('AI integration passed: schema, quote, itemId, role guards, Ark retry/timeout, manual import idempotency, review diff, low confidence, 39/10 evaluation isolation.')
