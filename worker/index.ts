import type { ProductConceptStatus, RawItemStatus, ReviewStatus, SystemReadiness } from '../shared/types.js'
import { createWorkerDependencies } from './dependencies.js'
import type { Env, ExecutionContextLike, ScheduledControllerLike } from './types.js'

const VERSION = 'cloudflare-production-v1'
const reviews: ReviewStatus[] = ['pending', 'confirmed', 'needs_revision', 'rejected']
const products: ProductConceptStatus[] = ['candidate', 'selected', 'rejected']

class HttpError extends Error {
  constructor(readonly status: number, readonly code: string, message: string) { super(message) }
}

const equalSecret = (actual: string | null, expected: string | undefined) => {
  if (!actual || !expected || actual.length !== expected.length) return false
  let mismatch = 0
  for (let index = 0; index < actual.length; index += 1) mismatch |= actual.charCodeAt(index) ^ expected.charCodeAt(index)
  return mismatch === 0
}

const json = (data: unknown, status = 200, isDemo?: boolean, requestId = crypto.randomUUID()) => new Response(JSON.stringify({
  success: true,
  data,
  meta: { timestamp: new Date().toISOString(), ...(isDemo === undefined ? {} : { isDemo }) },
}), {
  status,
  headers: { 'Content-Type': 'application/json; charset=utf-8', 'X-Request-Id': requestId },
})

const failure = (error: unknown, requestId: string) => {
  const known = error instanceof HttpError
  const status = known ? error.status : 500
  const code = known ? error.code : 'INTERNAL_ERROR'
  const message = known ? error.message : '请求暂时无法完成。'
  console.error(JSON.stringify({ event: 'api_error', requestId, code, status, message: error instanceof Error ? error.message : String(error) }))
  return new Response(JSON.stringify({ success: false, error: { code, message }, meta: { timestamp: new Date().toISOString() } }), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'X-Request-Id': requestId },
  })
}

async function body(request: Request): Promise<Record<string, unknown>> {
  const text = await request.text()
  if (text.length > 1_000_000) throw new HttpError(413, 'PAYLOAD_TOO_LARGE', '请求内容超过 1MB。')
  if (!text.trim()) return {}
  try { return JSON.parse(text) as Record<string, unknown> } catch { throw new HttpError(400, 'INVALID_JSON', '请求 JSON 格式无效。') }
}

const requireSecret = (request: Request, header: string, secret: string | undefined, code: string) => {
  if (!equalSecret(request.headers.get(header), secret)) throw new HttpError(401, code, `${header} 缺失或无效。`)
}

async function api(request: Request, env: Env): Promise<Response> {
  const requestId = crypto.randomUUID()
  try {
    const url = new URL(request.url)
    const path = url.pathname
    const method = request.method.toUpperCase()
    const deps = createWorkerDependencies(env)

    if (method === 'GET' && path === '/api/health') {
      const d1 = await deps.repository.ping()
      return json({ status: d1 ? 'ok' : 'degraded', runtime: 'cloudflare-workers', version: env.BUILD_VERSION ?? VERSION, timestamp: new Date().toISOString() }, d1 ? 200 : 503, false, requestId)
    }
    if (method === 'GET' && path === '/api/system/readiness') {
      let d1Writable = false
      try {
        await env.DB.prepare(`INSERT INTO app_meta (key, value, updated_at) VALUES ('readiness_probe', 'ok', ?)
          ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at`).bind(new Date().toISOString()).run()
        d1Writable = true
      } catch { d1Writable = false }
      const readiness: SystemReadiness = {
        server: true,
        repository: d1Writable,
        liveCollection: true,
        automationSecretConfigured: Boolean(env.AUTOMATION_SECRET),
        miaodaWebhookConfigured: Boolean(env.MIAODA_WEBHOOK_URL),
        arkConfigured: Boolean(env.ARK_API_KEY && env.ARK_MODEL_ID),
        aiImportSecretConfigured: Boolean(env.AI_IMPORT_SECRET),
        dataDirectoryWritable: false,
        notificationWebhookConfigured: deps.notification.configured,
        runtime: 'cloudflare-workers',
        repositoryType: 'd1',
        d1Configured: Boolean(env.DB),
        d1Writable,
        staticAssetsReady: Boolean(env.ASSETS),
        cronConfigured: true,
        miaodaConfigured: Boolean(env.MIAODA_WEBHOOK_URL),
        notificationConfigured: deps.notification.configured,
        filesystemPersistence: false,
        databasePersistence: true,
        overall: !d1Writable ? 'blocked' : env.AUTOMATION_SECRET && env.AI_IMPORT_SECRET ? 'ready' : 'partially_ready',
      }
      return json(readiness, 200, false, requestId)
    }

    if (method === 'POST' && path === '/api/automation/daily') {
      requireSecret(request, 'X-AUTOMATION-SECRET', env.AUTOMATION_SECRET, 'INVALID_AUTOMATION_SECRET')
      const payload = await body(request)
      const triggerType = typeof payload.triggerType === 'string' ? payload.triggerType : 'miaoda'
      if (!['manual', 'miaoda', 'local-cron', 'test'].includes(triggerType)) throw new HttpError(400, 'INVALID_TRIGGER_TYPE', 'triggerType 无效。')
      const idempotencyKey = request.headers.get('Idempotency-Key') ?? (typeof payload.idempotencyKey === 'string' ? payload.idempotencyKey : null)
      const result = await deps.automation.run({
        triggerType: triggerType as 'manual' | 'miaoda' | 'local-cron' | 'test',
        idempotencyKey,
        maxSources: deps.maxSources,
      })
      console.log(JSON.stringify({ event: 'automation_http_complete', automationRunId: result.automationRunId, status: result.status, duration: result.durationMs, newCount: result.collection.new, failedCount: result.collection.failed }))
      return json(result, 201, false, requestId)
    }

    if (method === 'GET' && path === '/api/dashboard') return json(await deps.jobs.getDashboardSummary(), 200, true, requestId)
    if (method === 'GET' && path === '/api/automation-runs') return json(await deps.repository.getAutomationRuns(), 200, false, requestId)
    if (method === 'GET' && path === '/api/job-runs') return json(await deps.repository.getJobRuns(), 200, false, requestId)
    if (method === 'GET' && path === '/api/data-sources') return json(await deps.repository.getDataSources(), 200, false, requestId)
    if (method === 'GET' && path === '/api/raw-items') {
      const status = url.searchParams.get('status')
      if (status && !['pending', 'processed', 'failed'].includes(status)) throw new HttpError(400, 'INVALID_STATUS', 'RawItem status 参数无效。')
      return json(await deps.repository.getRawItems((status ?? undefined) as RawItemStatus | undefined), 200, false, requestId)
    }
    if (method === 'GET' && path === '/api/trend-signals') return json(await deps.repository.getTrendSignals(), 200, false, requestId)
    if (method === 'GET' && path === '/api/product-concepts') return json(await deps.repository.getProductConcepts(), 200, false, requestId)
    if (method === 'GET' && path === '/api/validation-summary') return json(await deps.jobs.getValidationSummary(), 200, false, requestId)
    if (method === 'GET' && path === '/api/ai-analysis-records') return json(await deps.repository.getAIAnalysisRecords(), 200, false, requestId)
    if (method === 'GET' && path === '/api/ai-analysis-runs') return json(await deps.repository.getAIAnalysisRuns(), 200, false, requestId)
    if (method === 'GET' && path === '/api/validation-flags') return json(await deps.repository.getValidationFlags(), 200, false, requestId)
    if (method === 'GET' && path === '/api/trend-candidates') return json(await deps.repository.getTrendCandidates(), 200, false, requestId)
    if (method === 'GET' && path === '/api/trend-aggregation/status') return json(await deps.trendAggregation.aggregate(), 200, false, requestId)
    if (method === 'GET' && path === '/api/experiment-runs') return json(await deps.repository.getExperimentRuns(), 200, false, requestId)
    if (method === 'GET' && path === '/api/evaluations') return json({
      dataset: {
        version: deps.evaluationDataset.version,
        itemCount: deps.evaluationDataset.items.length,
        developmentCount: deps.evaluationSplit.developmentIds.length,
        holdoutCount: deps.evaluationSplit.holdoutIds.length,
        disclaimer: deps.evaluationDataset.disclaimer,
      },
      runs: await deps.repository.getEvaluationRuns(),
    }, 200, false, requestId)
    if (method === 'GET' && path === '/api/ai-batches/pending') return json(await deps.aiAnalysis.getPendingBatches(), 200, false, requestId)
    if (method === 'GET' && path === '/api/ai-batches/candidates') return json(await deps.aiAnalysis.getBatchCandidates(), 200, false, requestId)

    if (method === 'POST' && path === '/api/ai-batches') {
      requireSecret(request, 'X-JOB-SECRET', env.JOB_SECRET, 'INVALID_JOB_SECRET')
      const payload = await body(request)
      const itemIds = Array.isArray(payload.itemIds) ? payload.itemIds.filter((value): value is string => typeof value === 'string') : undefined
      return json(await deps.aiAnalysis.createBatch(itemIds, { manualDoubao: payload.provider === 'manual-doubao' }), 201, false, requestId)
    }
    if (method === 'POST' && path === '/api/jobs/collect') {
      requireSecret(request, 'X-JOB-SECRET', env.JOB_SECRET, 'INVALID_JOB_SECRET')
      const payload = await body(request)
      if (payload.mode !== 'live') throw new HttpError(400, 'LIVE_ONLY_IN_PRODUCTION', 'Cloudflare 生产任务只接受 LIVE 采集。')
      const sourceIds = Array.isArray(payload.sourceIds) ? payload.sourceIds.filter((value): value is string => typeof value === 'string') : undefined
      return json(await deps.jobs.collect({ mode: 'live', sourceIds }), 201, false, requestId)
    }
    const batchExport = path.match(/^\/api\/ai-batches\/([^/]+)\/export$/)
    if (method === 'GET' && batchExport) {
      requireSecret(request, 'X-JOB-SECRET', env.JOB_SECRET, 'INVALID_JOB_SECRET')
      return json(await deps.aiAnalysis.exportBatch(decodeURIComponent(batchExport[1])), 200, false, requestId)
    }
    const batchExecute = path.match(/^\/api\/ai-batches\/([^/]+)\/execute$/)
    if (method === 'POST' && batchExecute) {
      requireSecret(request, 'X-JOB-SECRET', env.JOB_SECRET, 'INVALID_JOB_SECRET')
      return json(await deps.aiAnalysis.executeBatch(decodeURIComponent(batchExecute[1])), 201, false, requestId)
    }
    if (method === 'POST' && path === '/api/ai-results/import') {
      requireSecret(request, 'X-AI-IMPORT-SECRET', env.AI_IMPORT_SECRET, 'INVALID_AI_IMPORT_SECRET')
      return json(await deps.aiAnalysis.importResults(await body(request) as never), 201, false, requestId)
    }

    const recordReview = path.match(/^\/api\/ai-analysis-records\/([^/]+)\/review$/)
    if (method === 'PATCH' && recordReview) {
      const payload = await body(request)
      if (!reviews.includes(payload.reviewStatus as ReviewStatus)) throw new HttpError(400, 'INVALID_REVIEW_STATUS', '审核状态无效。')
      if (typeof payload.reviewer !== 'string' || payload.reviewer.trim().length < 2) throw new HttpError(400, 'INVALID_REVIEWER', '请填写审核人。')
      const record = await deps.aiAnalysis.reviewRecord(decodeURIComponent(recordReview[1]), payload as never)
      if (!record) throw new HttpError(404, 'AI_ANALYSIS_NOT_FOUND', '分析记录不存在。')
      return json(record, 200, record.isDemo, requestId)
    }
    const trendReview = path.match(/^\/api\/trend-signals\/([^/]+)\/review$/)
    if (method === 'PATCH' && trendReview) {
      const payload = await body(request)
      if (!reviews.includes(payload.reviewStatus as ReviewStatus)) throw new HttpError(400, 'INVALID_REVIEW_STATUS', '审核状态无效。')
      if (typeof payload.reviewer !== 'string' || payload.reviewer.trim().length < 2) throw new HttpError(400, 'INVALID_REVIEWER', '请填写审核人。')
      const signal = await deps.repository.reviewTrendSignal(decodeURIComponent(trendReview[1]), payload.reviewStatus as ReviewStatus, payload.reviewer.trim())
      if (!signal) throw new HttpError(404, 'TREND_NOT_FOUND', '趋势记录不存在。')
      return json(signal, 200, signal.isDemo, requestId)
    }
    const productUpdate = path.match(/^\/api\/product-concepts\/([^/]+)$/)
    if (method === 'PATCH' && productUpdate) {
      const payload = await body(request)
      if (payload.status !== undefined && !products.includes(payload.status as ProductConceptStatus)) throw new HttpError(400, 'INVALID_PRODUCT_STATUS', '产品状态无效。')
      const humanScore = payload.humanScore === undefined ? undefined : Number(payload.humanScore)
      if (humanScore !== undefined && (!Number.isFinite(humanScore) || humanScore < 0 || humanScore > 100)) throw new HttpError(400, 'INVALID_HUMAN_SCORE', '人工评分必须在 0—100 之间。')
      const product = await deps.repository.updateProductConcept(decodeURIComponent(productUpdate[1]), { status: payload.status as ProductConceptStatus | undefined, humanScore })
      if (!product) throw new HttpError(404, 'PRODUCT_NOT_FOUND', '产品概念不存在。')
      return json(product, 200, product.isDemo, requestId)
    }

    throw new HttpError(404, 'NOT_FOUND', 'API 路由不存在。')
  } catch (error) {
    return failure(error, requestId)
  }
}

export const worker = {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)
    if (url.pathname.startsWith('/api/')) return api(request, env)
    return env.ASSETS.fetch(request)
  },

  async scheduled(controller: ScheduledControllerLike, env: Env, context: ExecutionContextLike): Promise<void> {
    const task = (async () => {
      const deps = createWorkerDependencies(env)
      const dateKey = new Date(controller.scheduledTime).toISOString().slice(0, 10)
      const result = await deps.automation.run({
        triggerType: 'cloudflare-cron',
        idempotencyKey: `cloudflare-cron:${dateKey}`,
        maxSources: deps.maxSources,
      })
      console.log(JSON.stringify({ event: 'automation_cron_complete', automationRunId: result.automationRunId, status: result.status, duration: result.durationMs, newCount: result.collection.new, failedCount: result.collection.failed }))
    })()
    context.waitUntil(task)
  },
}

export default worker
