import { randomUUID, timingSafeEqual } from 'node:crypto'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import express from 'express'
import type { EvaluationSplit, ExperimentMode, ExperimentType, ProductConceptStatus, ReviewStatus, SystemReadiness } from '../shared/types.js'
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
  const { repository, aiAnalysis, evaluations, jobs, automation, notification, dataPaths, trendAggregation, analysisTextBackfill } = createDependencies(config)
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
  const requireAutomationSecret = (request: express.Request, _response: express.Response, next: express.NextFunction) => {
    const value = request.header('X-AUTOMATION-SECRET')
    if (!secretsMatch(value, config.automationSecret)) return next(new ApiError(401, 'INVALID_AUTOMATION_SECRET', 'X-AUTOMATION-SECRET 缺失或无效。'))
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

  app.get('/api/system/readiness', asyncHandler(async (_request, response) => {
    let repositoryReady = true
    try {
      await repository.getDataSources()
    } catch {
      repositoryReady = false
    }
    const dataDirectoryWritable = await dataPaths.isWritable()
    const readiness: SystemReadiness = {
      server: true,
      repository: repositoryReady,
      liveCollection: config.enableLiveCollection,
      automationSecretConfigured: config.automationSecret !== 'local-automation-secret-change-me',
      miaodaWebhookConfigured: Boolean(config.aiBatchCallbackUrl),
      arkConfigured: Boolean(config.arkApiKey && config.arkModelId),
      aiImportSecretConfigured: config.aiImportSecret !== 'local-ai-import-secret-change-me',
      dataDirectoryWritable,
      notificationWebhookConfigured: notification.configured,
      overall: !repositoryReady || !dataDirectoryWritable
        ? 'blocked'
        : config.enableLiveCollection && config.automationSecret !== 'local-automation-secret-change-me'
          ? 'ready'
          : 'partially_ready',
    }
    sendSuccess(response, readiness)
  }))

  app.post('/api/automation/daily', requireAutomationSecret, asyncHandler(async (request, response) => {
    const triggerType = request.body?.triggerType ?? 'miaoda'
    if (!['manual', 'miaoda', 'local-cron', 'test'].includes(triggerType)) throw new ApiError(400, 'INVALID_TRIGGER_TYPE', 'triggerType 无效。')
    const idempotencyKey = request.header('Idempotency-Key') ?? request.body?.idempotencyKey ?? null
    sendSuccess(response, await automation.run({ triggerType, idempotencyKey }), false, 201)
  }))
  app.get('/api/automation-runs', asyncHandler(async (_request, response) => {
    sendSuccess(response, await repository.getAutomationRuns())
  }))

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
    const manualDoubao = request.body?.provider === 'manual-doubao'
    sendSuccess(response, await useCase(() => aiAnalysis.createBatch(itemIds, { manualDoubao })), undefined, 201)
  }))
  app.get('/api/ai-batches/pending', requireJobSecret, asyncHandler(async (_request, response) => {
    sendSuccess(response, await aiAnalysis.getPendingBatches())
  }))
  app.get('/api/ai-batches/candidates', requireJobSecret, asyncHandler(async (_request, response) => {
    sendSuccess(response, await aiAnalysis.getBatchCandidates())
  }))
  app.get('/api/ai-batches/:id/export', requireJobSecret, asyncHandler(async (request, response) => {
    const payload = await useCase(() => aiAnalysis.exportBatch(String(request.params.id)))
    response.setHeader('Content-Disposition', `attachment; filename="${String(request.params.id)}.json"`)
    sendSuccess(response, payload)
  }))
  app.post('/api/ai-batches/:id/execute', requireJobSecret, asyncHandler(async (request, response) => {
    sendSuccess(response, await useCase(() => aiAnalysis.executeBatch(String(request.params.id))), undefined, 201)
  }))
  app.post('/api/jobs/analysis-text-backfill', requireJobSecret, asyncHandler(async (_request, response) => {
    sendSuccess(response, await useCase(() => analysisTextBackfill.backfill()), false, 201)
  }))
  app.post('/api/ai-development/b2-dev-01', requireJobSecret, asyncHandler(async (_request, response) => {
    sendSuccess(response, await useCase(() => aiAnalysis.runDevelopmentBatch01()), false, 201)
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
    if (split === 'holdout' && !config.enableHoldoutEvaluation) throw new ApiError(403, 'HOLDOUT_LOCKED', 'holdout评测仅能在提示词冻结后通过专用命令运行一次。')
    sendSuccess(response, await useCase(() => evaluations.run(split)), config.aiProvider === 'mock', 201)
  }))
  app.get('/api/trend-candidates', asyncHandler(async (_request, response) => {
    sendSuccess(response, await repository.getTrendCandidates())
  }))
  app.get('/api/trend-aggregation/status', asyncHandler(async (_request, response) => {
    sendSuccess(response, await trendAggregation.aggregate())
  }))
  app.get('/api/validation-flags', asyncHandler(async (_request, response) => {
    sendSuccess(response, await repository.getValidationFlags())
  }))

  app.get('/api/experiment-runs', asyncHandler(async (_request, response) => {
    sendSuccess(response, await repository.getExperimentRuns())
  }))
  app.post('/api/experiment-runs', requireJobSecret, asyncHandler(async (request, response) => {
    const experimentType = request.body?.experimentType as ExperimentType
    const mode = request.body?.mode as ExperimentMode
    if (!['collection', 'comment_tagging', 'concept_generation', 'feedback_summary', 'video_variant'].includes(experimentType)) throw new ApiError(400, 'INVALID_EXPERIMENT_TYPE', 'experimentType 无效。')
    if (!['manual', 'ai_assisted'].includes(mode)) throw new ApiError(400, 'INVALID_EXPERIMENT_MODE', 'mode 无效。')
    const startedAt = typeof request.body?.startedAt === 'string' ? request.body.startedAt : new Date().toISOString()
    const finishedAt = typeof request.body?.finishedAt === 'string' ? request.body.finishedAt : null
    const run = {
      id: `experiment-${randomUUID()}`,
      experimentType,
      mode,
      startedAt,
      finishedAt,
      durationMs: finishedAt ? Math.max(0, new Date(finishedAt).getTime() - new Date(startedAt).getTime()) : 0,
      sampleCount: Math.max(0, Number(request.body?.sampleCount ?? 0)),
      notes: typeof request.body?.notes === 'string' ? request.body.notes : '',
      operator: typeof request.body?.operator === 'string' ? request.body.operator : '',
    }
    await repository.saveExperimentRun(run)
    sendSuccess(response, run, false, 201)
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
      if (split === 'holdout' && !config.enableHoldoutEvaluation) throw new ApiError(403, 'HOLDOUT_LOCKED', 'holdout评测仅能在提示词冻结后通过专用命令运行一次。')
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
