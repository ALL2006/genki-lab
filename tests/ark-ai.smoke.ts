import assert from 'node:assert/strict'
import { validateEvidenceAnalysis } from '../server/ai/evidenceSchema.js'
import { ArkDoubaoAIProvider } from '../server/providers/ArkDoubaoAIProvider.js'

const apiKey = process.env.ARK_API_KEY
const model = process.env.ARK_MODEL_ID
if (!apiKey || !model) {
  console.log('Ark smoke skipped: ARK_API_KEY / ARK_MODEL_ID 未配置。')
  process.exit(0)
}

const rawText = '匿名测试评论：这款青提气泡饮料很清爽，但代糖后味明显。'
const provider = new ArkDoubaoAIProvider({
  apiKey,
  model,
  baseUrl: process.env.ARK_BASE_URL ?? 'https://ark.cn-beijing.volces.com/api/v3',
  timeoutMs: Number(process.env.ARK_TIMEOUT_MS ?? 30_000),
  maxRetries: Number(process.env.ARK_MAX_RETRIES ?? 2),
})
const execution = await provider.analyzeEvidence([{ id: 'ark-smoke-001', title: '匿名冒烟测试', rawText, sourceKind: 'consumer_comment', isDemo: false }])
assert.equal(execution.outputs.length, 1)
const validation = validateEvidenceAnalysis(execution.outputs[0], { itemId: 'ark-smoke-001', rawText, sourceKind: 'consumer_comment' })
assert.ok(validation.data && validation.schemaValid && validation.itemIdValid && validation.quoteValid && validation.errors.length === 0, validation.errors.join('；'))
console.log(JSON.stringify({ provider: provider.name, model: provider.model, retryCount: execution.retryCount, tokenUsage: execution.tokenUsage, schemaValid: validation.schemaValid, quoteValid: validation.quoteValid }, null, 2))
