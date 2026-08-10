import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { mkdir, readFile, rm } from 'node:fs/promises'
import { resolve } from 'node:path'
import type { EvidenceAnalysisData, RawItem } from '../shared/types.js'
import { validateEvidenceAnalysis } from '../server/ai/evidenceSchema.js'
import { ArkDoubaoAIProvider, EVIDENCE_ANALYSIS_SYSTEM_PROMPT } from '../server/providers/ArkDoubaoAIProvider.js'
import type { AIProvider } from '../server/providers/AIProvider.js'
import { ManualJsonAIProvider } from '../server/providers/ManualJsonAIProvider.js'
import { MockAIProvider } from '../server/providers/MockAIProvider.js'
import { MockRepository } from '../server/repositories/MockRepository.js'
import { AIAnalysisService } from '../server/services/AIAnalysisService.js'
import { EvaluationService } from '../server/services/EvaluationService.js'
import { InMemoryEvaluationDataLoader, type EvaluationDatasetFile, type EvaluationSplitFile } from '../server/evaluation/EvaluationDataLoader.js'

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
assert.match(EVIDENCE_ANALYSIS_SYSTEM_PROMPT, /不得用 relevanceScore 反推 evidenceRole/)
assert.match(EVIDENCE_ANALYSIS_SYSTEM_PROMPT, /brand_news/)
assert.match(EVIDENCE_ANALYSIS_SYSTEM_PROMPT, /连续字符串/)
assert.doesNotMatch(EVIDENCE_ANALYSIS_SYSTEM_PROMPT, /R001|R006|Keurig|Coca-Cola|曲靖/)

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

let chunkCalls = 0
const chunkedArk = new ArkDoubaoAIProvider({
  apiKey: 'test-key', model: 'test-model', baseUrl: 'https://example.invalid/api/v3', timeoutMs: 50, maxRetries: 0,
  maxInputCharactersPerRequest: 10,
  fetchImplementation: async (_url, init) => {
    chunkCalls += 1
    const request = JSON.parse(String(init?.body)) as { thinking: { type: string }; input: Array<{ content: Array<{ text: string }> }> }
    assert.equal(request.thinking.type, 'disabled')
    const input = JSON.parse(request.input[1].content[0].text) as { items: Array<{ itemId: string; rawText: string }> }
    const outputs = input.items.map((item) => ({ ...validOutput, itemId: item.itemId, evidenceQuotes: [{ quote: item.rawText, supports: '原文' }] }))
    return new Response(JSON.stringify({ output_text: JSON.stringify({ results: outputs }), usage: { input_tokens: 2, output_tokens: 1, total_tokens: 3 } }), { status: 200 })
  },
})
const chunkedExecution = await chunkedArk.analyzeEvidence([
  { id: 'chunk-1', title: '1', rawText: '12345678901', sourceKind: 'raw_item', isDemo: false },
  { id: 'chunk-2', title: '2', rawText: 'abcdefghijk', sourceKind: 'raw_item', isDemo: false },
  { id: 'chunk-3', title: '3', rawText: 'ABCDEFGHIJK', sourceKind: 'raw_item', isDemo: false },
])
assert.equal(chunkCalls, 3)
assert.equal(chunkedExecution.outputs.length, 3)
assert.equal(chunkedExecution.tokenUsage?.totalTokens, 9)

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

  const evaluationDataset = JSON.parse(await readFile(resolve('data/evaluation/consumer-comments-v1.json'), 'utf8')) as EvaluationDatasetFile
  const evaluationSplit = JSON.parse(await readFile(resolve('data/evaluation/split-v1.json'), 'utf8')) as EvaluationSplitFile
  const pilotRawItems: RawItem[] = Array.from({ length: 4 }, (_, index) => ({
    ...rawItem,
    id: `pilot-raw-${index + 1}`,
    title: `Pilot 公开资料 ${index + 1}`,
    rawText: index === 0 ? '品牌发布ＡI饮料新品 作为市场背景资料。' : `公开资料${index + 1}用于说明饮料市场背景。`,
    summary: `Pilot 公开资料 ${index + 1}`,
    originalUrl: `https://example.com/pilot-${index + 1}`,
    normalizedUrl: `https://example.com/pilot-${index + 1}`,
    contentHash: `pilot-hash-${index + 1}`,
  }))
  await repository.insertRawItems(pilotRawItems)
  await repository.saveAIBatch({
    id: 'pilot-manual-source', provider: 'manual-json', model: 'manual-model', status: 'completed',
    itemIds: [...pilotRawItems.map((item) => item.id), 'R001', 'R006'],
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    promptVersion: 'evidence-analysis-v1', schemaVersion: 'evidence-analysis-v1', importedResultHashes: [], isDemo: false,
  })
  const pilotProvider: AIProvider = {
    name: 'ark-doubao', model: 'ep-test-pilot', mode: 'api', isAutomated: true, isDemo: false, delivery: 'synchronous',
    async analyzeEvidence(items) {
      const outputs = items.map((item) => {
        const consumer = item.sourceKind === 'consumer_comment'
        const text = item.analysisText ?? item.rawText
        // a real model quotes the normalized analysisText; pilot-raw-1 uses a
        // double-space typography variant to exercise the deterministic repair path
        const quote = item.id === 'pilot-raw-1' ? '品牌发布AI饮料新品  作为市场背景资料。' : text.slice(0, Math.min(24, text.length))
        return {
          itemId: item.id,
          evidenceRole: consumer ? 'consumer_evidence' : 'background_evidence',
          relevanceScore: 0.8,
          relevanceReason: 'Pilot 自动校验测试。',
          brands: [], productCategories: ['饮料'], flavors: [], consumerNeeds: [], scenes: [],
          positiveSignals: [], negativeSignals: [], riskSignals: [],
          signalType: consumer ? 'consumer_preference' : 'safety_context',
          evidenceQuotes: item.id === 'pilot-raw-4' ? [] : [{ quote, supports: '测试引文' }], confidence: 0.8,
          eligibleForConceptGeneration: consumer,
        }
      })
      return { outputs, rawResponse: { usage: { total_tokens: 60 } }, retryCount: 0, tokenUsage: { inputTokens: 40, outputTokens: 20, totalTokens: 60 }, outputCharacters: JSON.stringify(outputs).length }
    },
  }
  const pilotService = new AIAnalysisService(repository, pilotProvider, new InMemoryEvaluationDataLoader(evaluationDataset, evaluationSplit))
  const pilotResult = await pilotService.runComparisonPilot('pilot-manual-source')
  assert.equal(pilotResult.batch.promptVersion, 'evidence-analysis-v2.2')
  assert.equal(pilotResult.batch.schemaVersion, 'evidence-analysis-v2')
  assert.equal(pilotResult.records.length, 6)
  assert.equal(pilotResult.records.filter((record) => record.validationStatus === 'auto_repaired').length, 1)
  assert.equal(pilotResult.records.every((record) => record.schemaValid), true)
  assert.equal(pilotResult.records.filter((record) => record.quoteValid).length, 5)
  assert.equal(pilotResult.records.filter((record) => record.validationStatus === 'rejected').length, 1)
  assert.equal(pilotResult.records.find((record) => record.validationStatus === 'rejected')?.reviewStatus, 'pending')
  assert.equal((await repository.getAIAnalysisRuns()).find((run) => run.batchId === 'B2-AUTO-PILOT-01')?.itemIdValidCount, 6)
  assert.equal((await repository.getValidationFlags()).filter((flag) => pilotResult.records.some((record) => record.id === flag.analysisRecordId)).length, 2)
  const pilot02 = await pilotService.createComparisonPilot('pilot-manual-source', 'B2-AUTO-PILOT-02')
  assert.equal(pilot02.id, 'B2-AUTO-PILOT-02')
  assert.deepEqual(pilot02.itemIds, pilotResult.batch.itemIds)
  assert.equal(pilot02.promptVersion, 'evidence-analysis-v2.2')
  const pilot03 = await pilotService.createComparisonPilot('pilot-manual-source', 'B2-AUTO-PILOT-03')
  assert.equal(pilot03.id, 'B2-AUTO-PILOT-03')
  assert.deepEqual(pilot03.itemIds, pilotResult.batch.itemIds)
  assert.equal(pilot03.promptVersion, 'evidence-analysis-v2.2')
  await assert.rejects(() => pilotService.createComparisonPilot('pilot-manual-source', 'DEV-01'), /只允许执行/)

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

console.log('AI integration passed: schema, quote, itemId, role guards, Ark retry/timeout, B2 auto v2 repair/flags, manual import idempotency, review diff, low confidence, 39/10 evaluation isolation.')
