import { timingSafeEqual } from 'node:crypto'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import express from 'express'
import type { EvaluationSplit, ProductConceptStatus, ReviewStatus } from '../shared/types.js'
import type { AppConfig } from './config.js'
import { createDependencies } from './dependencies.js'
import { ApiError, asyncHandler, errorHandler, sendSuccess } from './http.js'

const reviewStatuses: ReviewStatus[] = ['pending', 'confirmed', 'needs_revision', 'rejected']
const productStatuses: ProductConceptStatus[] = ['candidate', 'selected', 'rejected']

function secretsMatch(actual: string | undefined, expected: string) {
  if (!actual) return false
  const actualBuffer = Buffer.from(actual)
  const expectedBuffer = Buffer.from(expected)
  return actualBuffer.length === expectedBuffer.length && timingSafeEqual(actualBuffer, expectedBuffer)
}

async function useCase<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation()
  } catch (error) {
    throw new ApiError(400, 'USE_CASE_REJECTED', error instanceof Error ? error.message : '请求无法执行。')
  }
}

export function createApp(config: AppConfig) {
  const app = express()
  const { repository, aiAnalysis, evaluations, jobs } = createDependencies(config)
  app.disable('x-powered-by')
  app.use(express.json({ limit: '1mb' }))

  const requireJobSecret = (request: express.Request, _response: express.Response, next: express.NextFunction) => {
    const value = request.header('X-JOB-SECRET')
    if (!secretsMatch(value, config.jobSecret)) return next(new ApiError(401, 'INVALID_JOB_SECRET', 'X-JOB-SECRET 缺失或无效。'))
    next()
  }
  const requireAIImportSecret = (request: express.Request, _response: express.Response, next: express.NextFunction) => {
    const value = request.header('X-AI-IMPORT-SECRET')
    if (!secretsMatch(value, config.aiImportSecret)) return next(new ApiError(401, 'INVALID_AI_IMPORT_SECRET', 'X-AI-IMPORT-SECRET 缺失或无效。'))
    next()
  }

  app.get('/api/health', (_request, response) => {
    sendSuccess(response, {
      status: 'ok',
      service: 'GENKI LAB API',
      adapters: { repository: 'MockRepository', collector: 'CollectorRouter', aiProvider: aiAnalysis.getProviderInfo() },
      demoActionsEnabled: config.enableDemoActions,
      liveCollectionEnabled: config.enableLiveCollection,
    }, true)
  })

  const runCollect = async (request: express.Request, response: express.Response) => {
    const mode = request.body?.mode === undefined ? 'demo' : request.body.mode
    if (mode !== 'demo' && mode !== 'live') throw new ApiError(400, 'INVALID_COLLECTION_MODE', 'mode 必须是 demo 或 live。')
    const sourceIds = Array.isArray(request.body?.sourceIds)
      ? request.body.sourceIds.filter((value: unknown): value is string => typeof value === 'string')
      : typeof request.body?.sourceId === 'string' ? [request.body.sourceId] : undefined
    sendSuccess(response, await jobs.collect({ mode, sourceIds }), mode === 'demo', 201)
  }
  const runAnalyze = async (_request: express.Request, response: express.Response) => {
    sendSuccess(response, await jobs.analyze(), true, 201)
  }
  const runGenerateProducts = async (_request: express.Request, response: express.Response) => {
    sendSuccess(response, await jobs.generateProducts(), true, 201)
  }
  const runWeeklyReport = async (_request: express.Request, response: express.Response) => {
    sendSuccess(response, await jobs.weeklyReport(), true, 201)
  }

  app.post('/api/jobs/collect', requireJobSecret, asyncHandler(runCollect))
  app.post('/api/jobs/analyze', requireJobSecret, asyncHandler(runAnalyze))
  app.post('/api/jobs/generate-products', requireJobSecret, asyncHandler(runGenerateProducts))
  app.post('/api/jobs/weekly-report', requireJobSecret, asyncHandler(runWeeklyReport))

  app.post('/api/ai-batches', requireJobSecret, asyncHandler(async (request, response) => {
    const itemIds = Array.isArray(request.body?.itemIds)
      ? request.body.itemIds.filter((value: unknown): value is string => typeof value === 'string')
      : undefined
    sendSuccess(response, await useCase(() => aiAnalysis.createBatch(itemIds)), undefined, 201)
  }))
  app.get('/api/ai-batches/pending', requireJobSecret, asyncHandler(async (_request, response) => {
    sendSuccess(response, await aiAnalysis.getPendingBatches())
  }))
  app.get('/api/ai-batches/:id/export', requireJobSecret, asyncHandler(async (request, response) => {
    const payload = await useCase(() => aiAnalysis.exportBatch(String(request.params.id)))
    response.setHeader('Content-Disposition', `attachment; filename="${String(request.params.id)}.json"`)
    sendSuccess(response, payload)
  }))
  app.post('/api/ai-batches/:id/execute', requireJobSecret, asyncHandler(async (request, response) => {
    sendSuccess(response, await useCase(() => aiAnalysis.executeBatch(String(request.params.id))), undefined, 201)
  }))
  app.post('/api/ai-results/import', requireAIImportSecret, asyncHandler(async (request, response) => {
    sendSuccess(response, await useCase(() => aiAnalysis.importResults(request.body)), undefined, 201)
  }))
  app.get('/api/ai-analysis-records', asyncHandler(async (_request, response) => {
    sendSuccess(response, await repository.getAIAnalysisRecords())
  }))
  app.patch('/api/ai-analysis-records/:id/review', asyncHandler(async (request, response) => {
    const { reviewStatus, reviewer, reviewComment, finalHumanVersion } = request.body ?? {}
    if (!reviewStatuses.includes(reviewStatus)) throw new ApiError(400, 'INVALID_REVIEW_STATUS', '审核状态无效。')
    if (typeof reviewer !== 'string' || reviewer.trim().length < 2) throw new ApiError(400, 'INVALID_REVIEWER', '请填写审核人。')
    const record = await useCase(() => aiAnalysis.reviewRecord(String(request.params.id), { reviewStatus, reviewer, reviewComment, finalHumanVersion }))
    if (!record) throw new ApiError(404, 'AI_ANALYSIS_NOT_FOUND', 'AI 分析记录不存在。')
    sendSuccess(response, record, record.isDemo)
  }))
  app.get('/api/ai-analysis-runs', asyncHandler(async (_request, response) => {
    sendSuccess(response, await repository.getAIAnalysisRuns())
  }))
  app.get('/api/evaluations', asyncHandler(async (_request, response) => {
    sendSuccess(response, { dataset: await evaluations.getDatasetSummary(), runs: await repository.getEvaluationRuns() })
  }))
  app.post('/api/evaluations/run', requireJobSecret, asyncHandler(async (request, response) => {
    const split = request.body?.split as EvaluationSplit
    if (!['development', 'holdout'].includes(split)) throw new ApiError(400, 'INVALID_EVALUATION_SPLIT', 'split 必须是 development 或 holdout。')
    sendSuccess(response, await useCase(() => evaluations.run(split)), config.aiProvider === 'mock', 201)
  }))
  app.get('/api/trend-candidates', asyncHandler(async (_request, response) => {
    sendSuccess(response, await repository.getTrendCandidates())
  }))

  if (config.enableDemoActions) {
    app.post('/api/demo/jobs/collect', asyncHandler(runCollect))
    app.post('/api/demo/jobs/analyze', asyncHandler(runAnalyze))
    app.post('/api/demo/jobs/generate-products', asyncHandler(runGenerateProducts))
    app.post('/api/demo/jobs/weekly-report', asyncHandler(runWeeklyReport))
    app.post('/api/demo/evaluations/run', asyncHandler(async (request, response) => {
      if (config.aiProvider !== 'mock') throw new ApiError(403, 'DEMO_PROVIDER_REQUIRED', '公开演示评测入口只允许 MockAIProvider。')
      const split = request.body?.split as EvaluationSplit
      if (!['development', 'holdout'].includes(split)) throw new ApiError(400, 'INVALID_EVALUATION_SPLIT', 'split 必须是 development 或 holdout。')
      sendSuccess(response, await useCase(() => evaluations.run(split)), true, 201)
    }))
  }

  app.get('/api/dashboard', asyncHandler(async (_request, response) => {
    sendSuccess(response, await jobs.getDashboardSummary(), true)
  }))
  app.get('/api/job-runs', asyncHandler(async (_request, response) => {
    sendSuccess(response, await repository.getJobRuns(), true)
  }))
  app.get('/api/data-sources', asyncHandler(async (_request, response) => {
    sendSuccess(response, await repository.getDataSources(), true)
  }))
  app.get('/api/raw-items', asyncHandler(async (request, response) => {
    const status = request.query.status
    if (status !== undefined && !['pending', 'processed', 'failed'].includes(String(status))) {
      throw new ApiError(400, 'INVALID_STATUS', 'RawItem status 参数无效。')
    }
    sendSuccess(response, await repository.getRawItems(status as 'pending' | 'processed' | 'failed' | undefined), true)
  }))
  app.get('/api/trend-signals', asyncHandler(async (_request, response) => {
    sendSuccess(response, await repository.getTrendSignals(), true)
  }))
  app.patch('/api/trend-signals/:id/review', asyncHandler(async (request, response) => {
    const { reviewStatus, reviewer } = request.body ?? {}
    if (!reviewStatuses.includes(reviewStatus)) throw new ApiError(400, 'INVALID_REVIEW_STATUS', '审核状态无效。')
    if (typeof reviewer !== 'string' || reviewer.trim().length < 2) throw new ApiError(400, 'INVALID_REVIEWER', '请填写审核人。')
    const signal = await repository.reviewTrendSignal(String(request.params.id), reviewStatus, reviewer.trim())
    if (!signal) throw new ApiError(404, 'TREND_NOT_FOUND', '趋势信号不存在。')
    sendSuccess(response, signal, true)
  }))
  app.get('/api/product-concepts', asyncHandler(async (_request, response) => {
    sendSuccess(response, await repository.getProductConcepts(), true)
  }))
  app.patch('/api/product-concepts/:id', asyncHandler(async (request, response) => {
    const patch: { humanScore?: number | null; status?: ProductConceptStatus } = {}
    if (request.body?.status !== undefined) {
      if (!productStatuses.includes(request.body.status)) throw new ApiError(400, 'INVALID_PRODUCT_STATUS', '产品状态无效。')
      patch.status = request.body.status
    }
    if (request.body?.humanScore !== undefined) {
      const score = Number(request.body.humanScore)
      if (!Number.isFinite(score) || score < 0 || score > 100) throw new ApiError(400, 'INVALID_HUMAN_SCORE', '人工评分必须在 0—100 之间。')
      patch.humanScore = score
    }
    const product = await repository.updateProductConcept(String(request.params.id), patch)
    if (!product) throw new ApiError(404, 'PRODUCT_NOT_FOUND', '产品概念不存在。')
    sendSuccess(response, product, true)
  }))
  app.get('/api/validation-summary', asyncHandler(async (_request, response) => {
    sendSuccess(response, await jobs.getValidationSummary(), true)
  }))

  const distPath = resolve(process.cwd(), 'dist')
  if (existsSync(distPath)) app.use(express.static(distPath))

  app.use('/api', (_request, _response, next) => next(new ApiError(404, 'NOT_FOUND', 'API 路由不存在。')))
  app.use(errorHandler)
  return app
}
