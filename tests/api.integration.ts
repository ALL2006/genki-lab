import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { mkdir, rm } from 'node:fs/promises'
import type { AddressInfo } from 'node:net'
import { resolve } from 'node:path'
import type { AIBatch, ApiResponse, JobRun, ProductConcept, RawItem, TrendSignal } from '../shared/types.js'
import { createApp } from '../server/app.js'
import { getConfig } from '../server/config.js'

const tempDir = resolve('tmp', `api-test-${randomUUID()}`)
const dbPath = resolve(tempDir, 'mock-db.json')
await mkdir(tempDir, { recursive: true })
const secret = 'integration-test-secret'
const app = createApp(getConfig({ port: 0, jobSecret: secret, aiImportSecret: 'integration-import-secret', mockDbPath: dbPath, enableDemoActions: true }))
const server = app.listen(0)
await new Promise<void>((resolveReady) => server.once('listening', resolveReady))
const { port } = server.address() as AddressInfo
const baseUrl = `http://127.0.0.1:${port}`

async function call<T>(path: string, options?: RequestInit) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options?.headers },
  })
  const body = await response.json() as ApiResponse<T>
  return { response, body }
}

try {
  const health = await call<{ status: string }>('/api/health')
  assert.equal(health.response.status, 200)
  assert.equal(health.body.success && health.body.data.status, 'ok')

  const unauthorized = await call('/api/jobs/collect', { method: 'POST', body: '{}' })
  assert.equal(unauthorized.response.status, 401)

  const headers = { 'X-JOB-SECRET': secret }
  const firstCollect = await call<{ run: JobRun }>('/api/jobs/collect', { method: 'POST', headers, body: '{}' })
  assert.equal(firstCollect.response.status, 201)
  assert.equal(firstCollect.body.success && firstCollect.body.data.run.newCount, 5)

  const secondCollect = await call<{ run: JobRun }>('/api/jobs/collect', { method: 'POST', headers, body: '{}' })
  assert.equal(secondCollect.body.success && secondCollect.body.data.run.duplicateCount, 5)

  const rawItems = await call<RawItem[]>('/api/raw-items')
  assert.ok(rawItems.body.success && rawItems.body.data.length === 5)
  const firstRaw = rawItems.body.success ? rawItems.body.data[0] : null
  assert.ok(firstRaw)
  assert.equal(firstRaw.status, 'pending', JSON.stringify(firstRaw))
  const aiBatch = await call<AIBatch>('/api/ai-batches', {
    method: 'POST', headers, body: JSON.stringify({ itemIds: [firstRaw.id] }),
  })
  assert.equal(aiBatch.response.status, 201, JSON.stringify(aiBatch.body))
  const batchId = aiBatch.body.success ? aiBatch.body.data.id : ''
  const analysisOutput = {
    itemId: firstRaw.id, evidenceRole: 'background_evidence', relevanceScore: 0.7, relevanceReason: '公开资料仅作为背景证据。',
    brands: [], productCategories: ['饮料'], flavors: [], consumerNeeds: [], scenes: [], positiveSignals: [], negativeSignals: [],
    riskSignals: ['单条资料不足以代表市场'], signalType: 'category_trend', evidenceQuotes: [{ quote: firstRaw.rawText.slice(0, 20), supports: '原文片段' }],
    confidence: 0.65, eligibleForConceptGeneration: false,
  }
  const unauthorizedImport = await call('/api/ai-results/import', { method: 'POST', body: JSON.stringify({ batchId, results: [analysisOutput] }) })
  assert.equal(unauthorizedImport.response.status, 401)
  const importOptions = { method: 'POST', headers: { 'X-AI-IMPORT-SECRET': 'integration-import-secret' }, body: JSON.stringify({ batchId, provider: 'manual-doubao', mode: 'manual_import', results: [analysisOutput] }) }
  const imported = await call<{ idempotent: boolean }>('/api/ai-results/import', importOptions)
  assert.equal(imported.response.status, 201)
  assert.equal(imported.body.success && imported.body.data.idempotent, false)
  const replayed = await call<{ idempotent: boolean }>('/api/ai-results/import', importOptions)
  assert.equal(replayed.body.success && replayed.body.data.idempotent, true)

  const analysis = await call<{ run: JobRun }>('/api/jobs/analyze', { method: 'POST', headers, body: '{}' })
  assert.equal(analysis.body.success && analysis.body.data.run.processedCount, 5)

  const trends = await call<TrendSignal[]>('/api/trend-signals')
  assert.ok(trends.body.success && trends.body.data.length === 5)
  const trendId = trends.body.success ? trends.body.data[0].id : ''
  const review = await call<TrendSignal>(`/api/trend-signals/${trendId}/review`, {
    method: 'PATCH', body: JSON.stringify({ reviewStatus: 'confirmed', reviewer: '集成测试' }),
  })
  assert.equal(review.body.success && review.body.data.reviewStatus, 'confirmed')

  const generation = await call<{ run: JobRun; result: { products: ProductConcept[] } }>('/api/jobs/generate-products', {
    method: 'POST', headers, body: '{}',
  })
  assert.equal(generation.body.success && generation.body.data.result.products.length, 3)

  const products = await call<ProductConcept[]>('/api/product-concepts')
  assert.ok(products.body.success && products.body.data.length === 3)
  const productId = products.body.success ? products.body.data[0].id : ''
  const selected = await call<ProductConcept>(`/api/product-concepts/${productId}`, {
    method: 'PATCH', body: JSON.stringify({ status: 'selected', humanScore: 90 }),
  })
  assert.equal(selected.body.success && selected.body.data.status, 'selected')

  const runs = await call<JobRun[]>('/api/job-runs')
  assert.ok(runs.body.success && runs.body.data.length >= 4)
  assert.ok(runs.body.success && runs.body.data.every((run) => run.durationMs > 0))

  console.log('API integration passed: health, auth, collect, dedupe, protected AI batch/import, idempotency, analyze, review, products, persistence logs.')
} finally {
  await new Promise<void>((resolveClosed, reject) => server.close((error) => error ? reject(error) : resolveClosed()))
  await rm(tempDir, { recursive: true, force: true })
}
