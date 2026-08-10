import { createHash, randomUUID } from 'node:crypto'
import { performance } from 'node:perf_hooks'
import type {
  AIAnalysisMode,
  AIAnalysisRecord,
  AIAnalysisRun,
  AIBatch,
  AIResultImport,
  DataSourceRoleHint,
  EvidenceAnalysisData,
  AnalysisValidationStatus,
  QuoteRepairResult,
  ReviewStatus,
  ValidationMode,
} from '../../shared/types.js'
import { evidenceAnalysisJsonSchema, evidenceAnalysisSchema, validateEvidenceAnalysis } from '../ai/evidenceSchema.js'
import { QuoteRepairService } from '../ai/QuoteRepairService.js'
import { ValidationFlagService } from '../ai/ValidationFlagService.js'
import { ANALYSIS_TEXT_VERSION, AnalysisTextNormalizer } from '../analysis-text/AnalysisTextNormalizer.js'
import type { AIProvider, AIProviderExecution, EvidenceInputItem } from '../providers/AIProvider.js'
import type { DataRepository } from '../repositories/DataRepository.js'
import type { EvaluationDataLoader } from '../evaluation/EvaluationDataLoader.js'

const PROMPT_VERSION = 'evidence-analysis-v2.2'
const SCHEMA_VERSION = 'evidence-analysis-v2'

const normalizedLabels = (values: string[]) => new Set(values.map((value) => value.trim()).filter(Boolean))

function labelMetrics(pairs: Array<{ expected: string[]; predicted: string[] }>) {
  let truePositive = 0
  let falsePositive = 0
  let falseNegative = 0
  let exact = 0
  for (const pair of pairs) {
    const expected = normalizedLabels(pair.expected)
    const predicted = normalizedLabels(pair.predicted)
    if (expected.size === predicted.size && [...expected].every((value) => predicted.has(value))) exact += 1
    for (const value of predicted) {
      if (expected.has(value)) truePositive += 1
      else falsePositive += 1
    }
    for (const value of expected) if (!predicted.has(value)) falseNegative += 1
  }
  const precision = truePositive + falsePositive === 0 ? 0 : truePositive / (truePositive + falsePositive)
  const recall = truePositive + falseNegative === 0 ? 0 : truePositive / (truePositive + falseNegative)
  return {
    exactMatch: pairs.length === 0 ? 0 : exact / pairs.length,
    microPrecision: precision,
    microRecall: recall,
    microF1: precision + recall === 0 ? 0 : 2 * precision * recall / (precision + recall),
  }
}

function inferredSentiment(output: EvidenceAnalysisData) {
  if (output.positiveSignals.length > output.negativeSignals.length) return 'positive'
  if (output.negativeSignals.length > output.positiveSignals.length) return 'negative'
  return 'neutral'
}

export type BatchCandidateDataType = 'public_material' | 'consumer_comment'
export type BatchCandidateDataset = 'development' | 'holdout' | null
export type BatchCandidateProcessingStatus = 'pending' | 'processed' | 'quality_issue'
export type BatchCandidateModelStatus = 'unanalyzed' | 'demo_result' | 'batched' | 'awaiting_import' | 'pending_review' | 'completed' | 'rejected'

export interface AIBatchCandidate {
  itemId: string
  summary: string
  originalTitle: string
  originalTextPreview: string
  source: string
  sourceName: string
  dataType: BatchCandidateDataType
  dataLayer: 'live' | 'demo'
  dataset: BatchCandidateDataset
  processingStatus: BatchCandidateProcessingStatus
  modelStatus: BatchCandidateModelStatus
  selectable: boolean
  disabledReason: string | null
  activeBatchId: string | null
  roleHint: DataSourceRoleHint | null
  selectionRole: DataSourceRoleHint | null
  roleGuidance: string | null
  isDemo: boolean
}

interface CatalogEntry {
  input: EvidenceInputItem
  candidate: Omit<AIBatchCandidate, 'modelStatus' | 'selectable' | 'disabledReason' | 'activeBatchId'>
  invalidReason: string | null
}

export interface ImportPayload {
  batchId: string
  provider?: string
  model?: string | null
  mode?: AIAnalysisMode
  results: unknown[]
  rawModelResponse?: unknown
  validationMode?: ValidationMode
}

const canonical = (value: unknown): string => {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`
  if (value && typeof value === 'object') {
    return `{${Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([key, nested]) => `${JSON.stringify(key)}:${canonical(nested)}`).join(',')}}`
  }
  return JSON.stringify(value)
}

const changedFields = (before: EvidenceAnalysisData, after: EvidenceAnalysisData) =>
  Object.keys(before).filter((key) => canonical(before[key as keyof EvidenceAnalysisData]) !== canonical(after[key as keyof EvidenceAnalysisData]))

export class AIAnalysisService {
  private readonly quoteRepair = new QuoteRepairService()
  private readonly validationFlags = new ValidationFlagService()
  private readonly analysisTextNormalizer = new AnalysisTextNormalizer()
  constructor(
    private readonly repository: DataRepository,
    private readonly provider: AIProvider,
    private readonly evaluationDataLoader?: EvaluationDataLoader,
  ) {}

  getProviderInfo() {
    return {
      name: this.provider.name,
      model: this.provider.model,
      mode: this.provider.mode,
      delivery: this.provider.delivery,
      isAutomated: this.provider.isAutomated,
      isDemo: this.provider.isDemo,
    }
  }

  async createBatch(itemIds?: string[], options: { manualDoubao?: boolean } = {}): Promise<AIBatch> {
    const candidates = await this.getBatchCandidates()
    const requested = itemIds?.length ? new Set(itemIds) : null
    const selected = candidates.filter((item) => item.selectable && (requested ? requested.has(item.itemId) : item.dataLayer === 'live' && item.dataset !== 'holdout'))
    if (requested && selected.length !== requested.size) {
      const reasons = [...requested].map((id) => {
        const candidate = candidates.find((item) => item.itemId === id)
        return candidate ? `${id}：${candidate.disabledReason ?? '不可加入批次'}` : `${id}：itemId不存在`
      }).filter((value) => !selected.some((item) => value.startsWith(`${item.itemId}：`)))
      throw new Error(`一个或多个项目不可加入批次：${reasons.join('；')}`)
    }
    if (selected.length === 0) throw new Error('没有可加入批次的资料。')
    const now = new Date().toISOString()
    const batch: AIBatch = {
      id: `ai-batch-${randomUUID()}`,
      provider: options.manualDoubao ? 'manual-json' : this.provider.name,
      model: options.manualDoubao ? null : this.provider.model,
      status: 'pending',
      itemIds: selected.map((item) => item.itemId),
      createdAt: now,
      updatedAt: now,
      promptVersion: PROMPT_VERSION,
      schemaVersion: SCHEMA_VERSION,
      analysisTextVersion: ANALYSIS_TEXT_VERSION,
      importedResultHashes: [],
      isDemo: options.manualDoubao ? selected.every((item) => item.isDemo) : this.provider.isDemo || selected.every((item) => item.isDemo),
    }
    await this.repository.saveAIBatch(batch)
    return batch
  }

  async getBatchCandidates(): Promise<AIBatchCandidate[]> {
    const [catalog, records, batches] = await Promise.all([
      this.getCatalog(),
      this.repository.getAIAnalysisRecords(),
      this.repository.getAIBatches(),
    ])
    const batchById = new Map(batches.map((batch) => [batch.id, batch]))
    return catalog.map((entry) => {
      const itemRecords = records.filter((record) => record.itemId === entry.input.id)
      const demoRecord = itemRecords.find((record) => record.isDemo || record.provider === 'mock')
      const realRecord = itemRecords.find((record) => {
        const batch = batchById.get(record.batchId)
        return !record.isDemo
          && ['manual-doubao', 'ark-doubao'].includes(record.provider)
          && record.schemaValid
          && record.quoteValid
          && batch?.status === 'completed'
      })
      const activeBatch = batches.find((batch) => ['pending', 'running', 'dispatched'].includes(batch.status) && batch.itemIds.includes(entry.input.id))
      let modelStatus: BatchCandidateModelStatus = 'unanalyzed'
      if (realRecord) modelStatus = realRecord.validationStatus === 'rejected' || realRecord.reviewStatus === 'rejected'
        ? 'rejected'
        : realRecord.reviewStatus === 'confirmed' ? 'completed' : 'pending_review'
      else if (activeBatch) modelStatus = activeBatch.status === 'dispatched' ? 'awaiting_import' : 'batched'
      else if (demoRecord) modelStatus = 'demo_result'

      let disabledReason: string | null = null
      if (!entry.input.id.trim()) disabledReason = 'itemId不存在'
      else if (!entry.input.rawText.trim()) disabledReason = '原始文本为空'
      else if (entry.invalidReason) disabledReason = entry.invalidReason
      else if (entry.candidate.dataset === 'holdout') disabledReason = '留出样本尚未解锁，禁止加入批次'
      else if (activeBatch) disabledReason = `已在批次 ${activeBatch.id} 中`
      else if (realRecord) disabledReason = `已有 ${realRecord.provider === 'manual-doubao' ? 'Manual Doubao' : 'Ark Doubao'} 分析结果`

      return {
        ...entry.candidate,
        modelStatus,
        selectable: disabledReason === null,
        disabledReason,
        activeBatchId: activeBatch?.id ?? null,
      }
    })
  }

  async getPendingBatches() {
    return (await this.repository.getAIBatches()).filter((batch) => batch.status === 'pending' || batch.status === 'dispatched')
  }

  async createComparisonPilot(sourceBatchId: string, pilotId = 'B2-AUTO-PILOT-01') {
    if (!['B2-AUTO-PILOT-01', 'B2-AUTO-PILOT-02', 'B2-AUTO-PILOT-03', 'B2-AUTO-PILOT-04'].includes(pilotId)) throw new Error('只允许执行已批准的 B2 AUTO Pilot。')
    if (this.provider.name !== 'ark-doubao' || !this.provider.isAutomated || this.provider.delivery !== 'synchronous' || !this.provider.model) {
      throw new Error('Ark Doubao Provider 尚未就绪。')
    }
    const existing = await this.repository.getAIBatch(pilotId)
    if (existing) {
      if (existing.provider !== 'ark-doubao' || existing.itemIds.length !== 6) throw new Error('已有同名 Pilot，但配置不一致。')
      return existing
    }
    const sourceBatch = await this.requireBatch(sourceBatchId)
    if (sourceBatch.status !== 'completed' || sourceBatch.itemIds.length !== 6) throw new Error('对照 Manual 批次必须已完成且恰好包含 6 条资料。')
    const catalog = await this.getCatalog()
    const entryById = new Map(catalog.map((entry) => [entry.input.id, entry]))
    const entries = sourceBatch.itemIds.map((itemId) => entryById.get(itemId))
    if (entries.some((entry) => !entry)) throw new Error('Manual 批次包含已不存在的资料。')
    if (entries.some((entry) => entry?.candidate.dataset === 'holdout')) throw new Error('Pilot 禁止包含 holdout。')
    const commentCount = entries.filter((entry) => entry?.candidate.dataType === 'consumer_comment').length
    const materialCount = entries.filter((entry) => entry?.candidate.dataType === 'public_material').length
    if (commentCount !== 2 || materialCount !== 4) throw new Error('Pilot 必须保持原 2 条评论 + 4 条公开资料结构。')
    const now = new Date().toISOString()
    const batch: AIBatch = {
      id: pilotId,
      provider: 'ark-doubao',
      model: this.provider.model,
      status: 'pending',
      itemIds: [...sourceBatch.itemIds],
      createdAt: now,
      updatedAt: now,
      promptVersion: PROMPT_VERSION,
      schemaVersion: SCHEMA_VERSION,
      analysisTextVersion: ANALYSIS_TEXT_VERSION,
      importedResultHashes: [],
      validationMode: 'automated',
      isDemo: false,
    }
    await this.repository.saveAIBatch(batch)
    return batch
  }

  async runComparisonPilot(sourceBatchId: string, pilotId = 'B2-AUTO-PILOT-01') {
    const batch = await this.createComparisonPilot(sourceBatchId, pilotId)
    if (batch.status === 'completed') {
      return { batch, records: await this.recordsForBatch(batch.id), validationFlags: [], dispatched: false, idempotent: true }
    }
    if (batch.status === 'failed') throw new Error('Pilot 已失败；必须先检查失败记录，禁止自动重跑。')
    return { ...await this.executeBatch(batch.id), idempotent: false }
  }

  async runDevelopmentBatch01() {
    if (this.provider.name !== 'ark-doubao' || !this.provider.isAutomated || this.provider.delivery !== 'synchronous' || !this.provider.model) {
      throw new Error('B2-DEV-01 只允许使用已就绪的 Ark Doubao Provider。')
    }
    const evaluationData = await this.loadEvaluationData()
    if (!evaluationData) throw new Error('development 评测数据未加载。')
    const itemIds = evaluationData.split.developmentIds.slice(0, 10)
    const holdout = new Set(evaluationData.split.holdoutIds)
    if (itemIds.length !== 10 || itemIds.some((id) => holdout.has(id))) throw new Error('B2-DEV-01 必须恰好包含10条development且不得包含holdout。')

    let batch = await this.repository.getAIBatch('B2-DEV-01')
    if (!batch) {
      const now = new Date().toISOString()
      batch = {
        id: 'B2-DEV-01',
        provider: 'ark-doubao',
        model: this.provider.model,
        status: 'pending',
        itemIds,
        createdAt: now,
        updatedAt: now,
        promptVersion: PROMPT_VERSION,
        schemaVersion: SCHEMA_VERSION,
        analysisTextVersion: ANALYSIS_TEXT_VERSION,
        importedResultHashes: [],
        validationMode: 'automated',
        isDemo: false,
      }
      await this.repository.saveAIBatch(batch)
    } else if (batch.provider !== 'ark-doubao'
      || batch.itemIds.length !== 10
      || batch.itemIds.some((id, index) => id !== itemIds[index])
      || batch.itemIds.some((id) => holdout.has(id))) {
      throw new Error('已有 B2-DEV-01 配置与冻结的前10条development不一致。')
    }

    const execution = batch.status === 'completed'
      ? { batch, records: await this.recordsForBatch(batch.id), validationFlags: [], dispatched: false, idempotent: true }
      : await this.executeBatch(batch.id)
    return { ...execution, evaluation: await this.evaluateDevelopmentBatch01() }
  }

  async evaluateDevelopmentBatch01() {
    const evaluationData = await this.loadEvaluationData()
    if (!evaluationData) throw new Error('development 评测数据未加载。')
    const itemIds = evaluationData.split.developmentIds.slice(0, 10)
    const itemById = new Map(evaluationData.dataset.items.map((item) => [item.id, item]))
    const records = await this.recordsForBatch('B2-DEV-01')
    const recordById = new Map(records.map((record) => [record.itemId, record]))
    const pairs = itemIds.map((itemId) => {
      const groundTruth = itemById.get(itemId)
      if (!groundTruth) throw new Error(`development ground truth不存在：${itemId}`)
      const record = recordById.get(itemId)
      const output = record?.parsedAIOutput
      const sentiment = output ? inferredSentiment(output) : null
      const predictedPainPoints = output ? [...new Set([...output.negativeSignals, ...output.riskSignals])] : []
      return {
        itemId,
        groundTruth: {
          evidenceRole: 'consumer_evidence' as const,
          sentiment: groundTruth.humanSentiment,
          flavors: groundTruth.humanFlavorTags,
          scenes: groundTruth.humanSceneTags,
          painPoints: groundTruth.humanPainPointTags,
        },
        modelResult: output ? {
          evidenceRole: output.evidenceRole,
          sentiment,
          flavors: output.flavors,
          scenes: output.scenes,
          painPoints: predictedPainPoints,
        } : null,
        match: {
          evidenceRole: output?.evidenceRole === 'consumer_evidence',
          sentiment: groundTruth.humanSentiment !== null && sentiment === groundTruth.humanSentiment,
          flavors: output ? labelMetrics([{ expected: groundTruth.humanFlavorTags, predicted: output.flavors }]).exactMatch === 1 : false,
          scenes: output ? labelMetrics([{ expected: groundTruth.humanSceneTags, predicted: output.scenes }]).exactMatch === 1 : false,
          painPoints: output ? labelMetrics([{ expected: groundTruth.humanPainPointTags, predicted: predictedPainPoints }]).exactMatch === 1 : false,
        },
      }
    })
    const flavor = labelMetrics(pairs.map((pair) => ({ expected: pair.groundTruth.flavors, predicted: pair.modelResult?.flavors ?? [] })))
    const scene = labelMetrics(pairs.map((pair) => ({ expected: pair.groundTruth.scenes, predicted: pair.modelResult?.scenes ?? [] })))
    const painPoint = labelMetrics(pairs.map((pair) => ({ expected: pair.groundTruth.painPoints, predicted: pair.modelResult?.painPoints ?? [] })))
    const sentimentPairs = pairs.filter((pair) => pair.groundTruth.sentiment !== null)
    const run = (await this.repository.getAIAnalysisRuns())
      .filter((item) => item.batchId === 'B2-DEV-01')
      .sort((a, b) => b.startedAt.localeCompare(a.startedAt))[0] ?? null
    const recordIds = new Set(records.map((record) => record.id))
    const flags = (await this.repository.getValidationFlags()).filter((flag) => recordIds.has(flag.analysisRecordId))
    const traceableCount = records.filter((record) => record.quoteRepairs?.length && record.quoteRepairs.every((repair) => repair.traceable)).length
    const statuses = { validated: 0, auto_repaired: 0, needs_review: 0, rejected: 0 }
    for (const record of records) statuses[record.validationStatus ?? 'needs_review'] += 1
    return {
      itemIds,
      sampleCount: itemIds.length,
      schemaPass: records.filter((record) => record.schemaValid).length,
      itemIdPass: records.filter((record) => record.parsedAIOutput.itemId === record.itemId).length,
      quotePass: records.filter((record) => record.quoteValid).length,
      traceableQuotePass: traceableCount,
      evidenceRoleAccuracy: pairs.filter((pair) => pair.match.evidenceRole).length / itemIds.length,
      sentimentAccuracy: sentimentPairs.length === 0 ? 0 : sentimentPairs.filter((pair) => pair.match.sentiment).length / sentimentPairs.length,
      flavorMicroF1: flavor.microF1,
      sceneAccuracy: scene.exactMatch,
      painPointAccuracy: painPoint.exactMatch,
      statuses,
      highFlagCount: flags.filter((flag) => flag.severity === 'high').length,
      flags,
      tokenUsage: run?.tokenUsage ?? null,
      latencyMs: run?.durationMs ?? null,
      arkSubrequests: run?.subrequestCount ?? null,
      pairs,
    }
  }

  async exportBatch(id: string) {
    const batch = await this.requireBatch(id)
    const inputs = await this.getInputs(batch)
    return {
      exportVersion: 'ai-batch-export-v1',
      batch,
      instructions: [
        '逐条分析 items，禁止改变 itemId。',
        'rawText 是不可修改的原始存档；analysisText 是确定性清洗后的模型分析正文。',
        'evidenceQuotes.quote 必须是 analysisText 的连续原文片段。',
        '公开资料 RawItem 不得标为 consumer_evidence。',
        '只返回 {"results": [...]}，每个字段都必须存在。',
      ],
      schema: { type: 'object', additionalProperties: false, required: ['results'], properties: { results: { type: 'array', items: evidenceAnalysisJsonSchema } } },
      items: inputs.map((input) => ({
        id: input.id,
        title: input.title,
        rawText: input.rawText,
        analysisText: input.analysisText ?? input.rawText,
        analysisTextVersion: input.analysisTextVersion ?? ANALYSIS_TEXT_VERSION,
        sourceKind: input.sourceKind,
        dataSourceType: input.dataSourceType ?? null,
        isDemo: input.isDemo,
      })),
    }
  }

  async executeBatch(id: string) {
    const batch = await this.requireBatch(id)
    if (batch.status === 'completed') throw new Error('批次已经完成。')
    if (batch.status === 'running') throw new Error('批次正在运行，禁止并发重复执行。')
    if (batch.provider !== this.provider.name) throw new Error('批次 Provider 与当前 AI_PROVIDER 不一致。')
    if (this.provider.delivery === 'manual') throw new Error('Manual JSON 模式请导出批次，再通过导入端点回传结果。')
    if (!await this.repository.claimAIBatchExecution(batch)) throw new Error('批次执行锁获取失败；可能已有运行正在处理。')
    batch.status = 'running'
    batch.updatedAt = new Date().toISOString()
    const inputs = await this.getInputs(batch)
    const startedAt = new Date().toISOString()
    const started = performance.now()
    try {
      const execution = await this.provider.analyzeEvidence(inputs)
      if (this.provider.delivery === 'callback') {
        batch.status = 'dispatched'
        batch.updatedAt = new Date().toISOString()
        await this.repository.saveAIBatch(batch)
        await this.saveRun(batch, execution, startedAt, started, 0, 0, null)
        return { batch, records: [], dispatched: true }
      }
      const metadata = {
        provider: this.provider.name,
        model: this.provider.model,
        mode: this.provider.mode,
        isAutomated: this.provider.isAutomated,
        rawModelResponse: execution.rawResponse,
      }
      const validationResult = this.provider.isAutomated
        ? await this.validateAutomatedAndBuildRecords(batch, inputs, execution.outputs, metadata)
        : {
          records: await this.validateAndBuildRecords(batch, inputs, execution.outputs, metadata),
          flags: [],
          status: 'success' as const,
        }
      const records = validationResult.records
      await this.repository.saveAIAnalysisRecords(records)
      await this.repository.saveValidationFlags(validationResult.flags)
      batch.model = this.provider.model
      batch.status = validationResult.status === 'failed' ? 'failed' : 'completed'
      batch.validationMode = this.provider.isAutomated ? 'automated' : 'strict'
      batch.validationStatus = validationResult.status
      batch.updatedAt = new Date().toISOString()
      await this.repository.saveAIBatch(batch)
      const successfulRecords = records.filter((record) => record.validationStatus === 'validated' || record.validationStatus === 'auto_repaired')
      await this.saveRun(
        batch,
        execution,
        startedAt,
        started,
        successfulRecords.length,
        records.filter((record) => record.quoteValid).length,
        null,
        this.provider.name,
        this.provider.model,
        this.provider.mode,
        this.provider.isAutomated,
        {
          schemaValidCount: records.length,
          itemIdValidCount: records.length,
          traceableQuoteCount: records.filter((record) => record.quoteRepairs?.length && record.quoteRepairs.every((repair) => repair.traceable)).length,
        },
      )
      return { batch, records, validationFlags: validationResult.flags, dispatched: false }
    } catch (error) {
      batch.status = 'failed'
      batch.updatedAt = new Date().toISOString()
      await this.repository.saveAIBatch(batch)
      const message = error instanceof Error ? error.message : '未知 AI 分析错误'
      await this.saveRun(batch, null, startedAt, started, 0, 0, message)
      throw error
    }
  }

  async importResults(payload: ImportPayload) {
    const batch = await this.requireBatch(payload.batchId)
    if (!Array.isArray(payload.results)) throw new Error('results 必须是数组。')
    const hash = createHash('sha256').update(canonical(payload)).digest('hex')
    const existing = (await this.repository.getAIResultImports()).find((item) => item.batchId === batch.id && item.resultHash === hash)
    if (existing) return { idempotent: true, resultImport: existing, records: await this.recordsForBatch(batch.id) }
    if (batch.status === 'completed') throw new Error('批次已经完成；只接受相同内容哈希的幂等重放。')

    const inputs = await this.getInputs(batch)
    const startedAt = new Date().toISOString()
    const started = performance.now()
    try {
      const provider = payload.provider?.trim() || 'manual-doubao'
      const model = payload.model?.trim() || null
      const mode = payload.mode ?? 'manual_import'
      const validationMode = payload.validationMode ?? 'strict'
      const validationResult = validationMode === 'automated'
        ? await this.validateAutomatedAndBuildRecords(batch, inputs, payload.results, {
          provider,
          model,
          mode,
          isAutomated: mode !== 'manual_import',
          rawModelResponse: payload.rawModelResponse ?? payload.results,
        })
        : {
          records: await this.validateAndBuildRecords(batch, inputs, payload.results, {
            provider,
            model,
            mode,
            isAutomated: mode !== 'manual_import',
            rawModelResponse: payload.rawModelResponse ?? payload.results,
          }),
          flags: [],
          status: 'success' as const,
        }
      const records = validationResult.records
      await this.repository.saveAIAnalysisRecords(records)
      await this.repository.saveValidationFlags(validationResult.flags)
      const resultImport: AIResultImport = {
        id: `ai-import-${randomUUID()}`,
        batchId: batch.id,
        resultHash: hash,
        provider,
        model,
        mode,
        analysisIds: records.map((record) => record.id),
        importedAt: new Date().toISOString(),
        isAutomated: mode !== 'manual_import',
        validationMode,
        validationStatus: validationResult.status,
      }
      await this.repository.saveAIResultImport(resultImport)
      batch.status = validationResult.status === 'failed' ? 'failed' : 'completed'
      batch.validationMode = validationMode
      batch.validationStatus = validationResult.status
      batch.updatedAt = new Date().toISOString()
      batch.importedResultHashes = [...batch.importedResultHashes, hash]
      await this.repository.saveAIBatch(batch)
      const successfulRecords = records.filter((record) => record.validationStatus === 'validated' || record.validationStatus === 'auto_repaired')
      await this.saveRun(batch, { outputs: payload.results, rawResponse: payload.rawModelResponse, retryCount: 0, tokenUsage: null, outputCharacters: canonical(payload.results).length }, startedAt, started, successfulRecords.length, records.filter((record) => record.quoteValid).length, null, provider, model, mode, mode !== 'manual_import', { schemaValidCount: records.length, itemIdValidCount: records.length, traceableQuoteCount: records.filter((record) => record.quoteRepairs?.length && record.quoteRepairs.every((repair) => repair.traceable)).length })
      return { idempotent: false, resultImport, records, validationStatus: validationResult.status, validationFlags: validationResult.flags }
    } catch (error) {
      const message = error instanceof Error ? error.message : '未知导入错误'
      await this.saveRun(batch, null, startedAt, started, 0, 0, message, payload.provider ?? 'manual-doubao', payload.model ?? null, payload.mode ?? 'manual_import', payload.mode !== undefined && payload.mode !== 'manual_import')
      throw error
    }
  }

  async reviewRecord(id: string, patch: { reviewStatus: ReviewStatus; reviewer: string; reviewComment?: string | null; finalHumanVersion?: unknown }) {
    const record = (await this.repository.getAIAnalysisRecords()).find((item) => item.id === id)
    if (!record) return undefined
    const input = (await this.getCatalog()).find((item) => item.input.id === record.itemId)?.input
    if (!input) throw new Error('分析记录对应的输入资料不存在。')
    let finalHumanVersion: EvidenceAnalysisData | null = record.finalHumanVersion
    let editedFields: string[] = record.editedFields
    if (patch.finalHumanVersion !== undefined) {
      const validation = validateEvidenceAnalysis(patch.finalHumanVersion, {
        itemId: input.id,
        rawText: input.analysisText ?? input.rawText,
        sourceKind: input.sourceKind,
        dataSourceType: input.dataSourceType,
      })
      if (!validation.data || !validation.schemaValid || !validation.itemIdValid || !validation.quoteValid || validation.errors.length > 0) {
        throw new Error(`人工版本校验失败：${validation.errors.join('；')}`)
      }
      finalHumanVersion = validation.data
      editedFields = changedFields(record.parsedAIOutput, finalHumanVersion)
    }
    const updated: AIAnalysisRecord = {
      ...record,
      reviewStatus: patch.reviewStatus,
      reviewer: patch.reviewer.trim(),
      reviewedAt: new Date().toISOString(),
      reviewComment: patch.reviewComment?.trim() || null,
      finalHumanVersion,
      editedFields,
    }
    await this.repository.saveAIAnalysisRecord(updated)
    return updated
  }

  private async validateAndBuildRecords(
    batch: AIBatch,
    inputs: EvidenceInputItem[],
    outputs: unknown[],
    metadata: { provider: string; model: string | null; mode: AIAnalysisMode; isAutomated: boolean; rawModelResponse: unknown },
  ) {
    if (outputs.length !== inputs.length) throw new Error(`结果数量不匹配：期望 ${inputs.length}，实际 ${outputs.length}。`)
    const outputById = new Map<string, unknown>()
    for (const output of outputs) {
      const itemId = output && typeof output === 'object' && typeof (output as { itemId?: unknown }).itemId === 'string'
        ? (output as { itemId: string }).itemId : ''
      if (!itemId || outputById.has(itemId)) throw new Error('结果存在缺失或重复的 itemId。')
      outputById.set(itemId, output)
    }
    const records = inputs.map((input) => {
      const output = outputById.get(input.id)
      if (!output) throw new Error(`结果缺少 itemId=${input.id}。`)
      const parsed = evidenceAnalysisSchema.safeParse(output)
      if (!parsed.success) throw new Error(`${input.id} Schema校验失败。`)
      const analysisText = input.analysisText ?? input.rawText
      const repairs = parsed.data.evidenceQuotes.map((quote) => this.traceRepair(
        this.quoteRepair.repair(quote.quote, analysisText),
        input,
      ))
      const repairedData: EvidenceAnalysisData = {
        ...parsed.data,
        evidenceQuotes: parsed.data.evidenceQuotes.map((quote, index) => ({ ...quote, quote: repairs[index].repairedQuote ?? quote.quote })),
      }
      const validation = validateEvidenceAnalysis(repairedData, {
        itemId: input.id,
        rawText: analysisText,
        sourceKind: input.sourceKind,
        dataSourceType: input.dataSourceType,
      })
      if (repairs.some((repair) => !repair.traceable || repair.repairMethod === 'not_found' || repair.repairMethod === 'normalized_multiple')
        || !validation.data || !validation.schemaValid || !validation.itemIdValid || !validation.quoteValid || validation.errors.length > 0) {
        throw new Error(`${input.id} 校验失败：${validation.errors.join('；')}`)
      }
      const autoRepaired = repairs.some((repair) => repair.quoteAutoRepaired)
      return {
        id: `ai-analysis-${randomUUID()}`,
        batchId: batch.id,
        itemId: input.id,
        provider: metadata.provider,
        model: metadata.model,
        mode: metadata.mode,
        originalAIOutput: output,
        parsedAIOutput: repairedData,
        finalHumanVersion: null,
        schemaValid: true,
        quoteValid: true,
        validationStatus: autoRepaired ? 'auto_repaired' : 'validated',
        quoteRepairs: repairs,
        reviewStatus: 'pending',
        reviewer: null,
        reviewedAt: null,
        reviewComment: null,
        editedFields: [],
        isAutomated: metadata.isAutomated,
        isDemo: batch.isDemo || metadata.provider === 'mock',
        createdAt: new Date().toISOString(),
      } satisfies AIAnalysisRecord
    })
    return records
  }

  private async validateAutomatedAndBuildRecords(
    batch: AIBatch,
    inputs: EvidenceInputItem[],
    outputs: unknown[],
    metadata: { provider: string; model: string | null; mode: AIAnalysisMode; isAutomated: boolean; rawModelResponse: unknown },
  ) {
    const outputById = new Map<string, unknown>()
    for (const output of outputs) {
      const itemId = output && typeof output === 'object' && typeof (output as { itemId?: unknown }).itemId === 'string'
        ? (output as { itemId: string }).itemId : ''
      if (itemId && !outputById.has(itemId)) outputById.set(itemId, output)
    }
    const records: AIAnalysisRecord[] = []
    const flags = []
    let rejectedCount = 0
    for (const input of inputs) {
      const rawOutput = outputById.get(input.id)
      const parsed = evidenceAnalysisSchema.safeParse(rawOutput)
      if (!parsed.success || parsed.data.itemId !== input.id) {
        rejectedCount += 1
        flags.push({
          id: `validation-flag-${randomUUID()}`,
          analysisRecordId: `missing:${batch.id}:${input.id}`,
          type: 'unsupported_claim' as const,
          severity: 'high' as const,
          message: !rawOutput ? '批次结果缺少该itemId。' : 'Schema或itemId校验失败。',
          field: !rawOutput ? 'itemId' : null,
          status: 'open' as const,
          createdAt: new Date().toISOString(),
        })
        continue
      }
      const recordId = `ai-analysis-${randomUUID()}`
      const analysisText = input.analysisText ?? input.rawText
      const repairs = parsed.data.evidenceQuotes.map((quote) => this.traceRepair(
        this.quoteRepair.repair(quote.quote, analysisText),
        input,
      ))
      const repairedData: EvidenceAnalysisData = {
        ...parsed.data,
        evidenceQuotes: parsed.data.evidenceQuotes.map((quote, index) => ({
          ...quote,
          quote: repairs[index].repairedQuote ?? quote.quote,
        })),
      }
      const context = { itemId: input.id, rawText: analysisText, sourceKind: input.sourceKind, dataSourceType: input.dataSourceType }
      const itemFlags = this.validationFlags.create(recordId, repairedData, context, repairs)
      flags.push(...itemFlags)
      const hasMissing = parsed.data.evidenceQuotes.length === 0 || repairs.some((repair) => repair.repairMethod === 'not_found'
        || (repair.repairMethod !== 'normalized_multiple' && repair.traceable === false))
      const hasMultiple = repairs.some((repair) => repair.repairMethod === 'normalized_multiple')
      const hasHighConflict = itemFlags.some((flag) => flag.severity === 'high' && flag.type === 'role_conflict')
      const autoRepaired = repairs.some((repair) => repair.quoteAutoRepaired)
      const validationStatus: AnalysisValidationStatus = hasMissing
        ? 'rejected'
        : hasMultiple || hasHighConflict
          ? 'needs_review'
          : autoRepaired ? 'auto_repaired' : 'validated'
      if (validationStatus === 'rejected') rejectedCount += 1
      records.push({
        id: recordId,
        batchId: batch.id,
        itemId: input.id,
        provider: metadata.provider,
        model: metadata.model,
        mode: metadata.mode,
        originalAIOutput: rawOutput,
        parsedAIOutput: repairedData,
        finalHumanVersion: null,
        schemaValid: true,
        quoteValid: !hasMissing && !hasMultiple,
        validationStatus,
        quoteRepairs: repairs,
        // Machine rejection belongs to validationStatus. Human review remains
        // pending until a reviewer explicitly records a decision.
        reviewStatus: 'pending',
        reviewer: null,
        reviewedAt: null,
        reviewComment: null,
        editedFields: [],
        isAutomated: metadata.isAutomated,
        isDemo: batch.isDemo || metadata.provider === 'mock',
        createdAt: new Date().toISOString(),
      })
    }
    const acceptedCount = records.filter((record) => record.validationStatus !== 'rejected').length
    const status = acceptedCount === 0
      ? 'failed' as const
      : rejectedCount > 0 || records.some((record) => record.validationStatus === 'needs_review')
        ? 'partial_success' as const
        : 'success' as const
    return { records, flags, status }
  }

  private async getInputs(batch: AIBatch): Promise<EvidenceInputItem[]> {
    const catalog = await this.getCatalog()
    const inputById = new Map(catalog.map((item) => [item.input.id, item.input]))
    return batch.itemIds.map((id) => {
      const input = inputById.get(id)
      if (!input) throw new Error(`批次引用的输入资料不存在：${id}`)
      return input
    })
  }

  private traceRepair(repair: QuoteRepairResult, input: EvidenceInputItem): QuoteRepairResult {
    const analysisStart = repair.matchedStart
    const analysisEnd = repair.matchedEnd
    if (analysisStart === null || analysisEnd === null || !input.analysisTextSpanMap) {
      return {
        ...repair,
        analysisMatchedStart: analysisStart,
        analysisMatchedEnd: analysisEnd,
        rawMatchedStart: null,
        rawMatchedEnd: null,
        sourceTransformation: [],
        traceable: false,
      }
    }
    return { ...repair, ...this.analysisTextNormalizer.traceQuote(analysisStart, analysisEnd, input.analysisTextSpanMap) }
  }

  private async getCatalog(): Promise<CatalogEntry[]> {
    const [rawItems, sources, evaluationData] = await Promise.all([
      this.repository.getRawItems(),
      this.repository.getDataSources(),
      this.loadEvaluationData(),
    ])
    const sourceById = new Map(sources.map((source) => [source.id, source]))
    const rawEntries: CatalogEntry[] = rawItems.map((item) => {
      const source = sourceById.get(item.sourceId)
      const analysis = item.analysisText !== undefined && item.analysisTextSpanMap
        ? {
          analysisText: item.analysisText,
          analysisTextVersion: item.analysisTextVersion ?? ANALYSIS_TEXT_VERSION,
          analysisTextSpanMap: item.analysisTextSpanMap,
        }
        : this.analysisTextNormalizer.normalize(item.rawText, item.rawPayload)
      const qualityIssue = item.qualityStatus === 'low_quality' || item.qualityStatus === 'rejected' || item.status === 'failed'
      const invalidReason = item.qualityStatus === 'rejected' || item.status === 'failed' ? '资料记录无效' : null
      return {
        input: {
          id: item.id,
          title: item.title,
          rawText: item.rawText,
          ...analysis,
          sourceKind: 'raw_item',
          dataSourceType: source?.type,
          isDemo: item.isDemo,
        },
        candidate: {
          itemId: item.id,
          summary: source?.displaySummary || item.summary || item.title,
          originalTitle: item.title,
          originalTextPreview: item.rawText.slice(0, 180),
          source: item.sourceId,
          sourceName: source?.publisherName || source?.name || item.sourceId,
          dataType: 'public_material',
          dataLayer: item.isDemo ? 'demo' : 'live',
          dataset: null,
          processingStatus: qualityIssue ? 'quality_issue' : item.status === 'pending' ? 'pending' : 'processed',
          roleHint: source?.roleHint ?? null,
          selectionRole: source?.selectionRole ?? source?.roleHint ?? null,
          roleGuidance: source?.roleGuidance ?? null,
          isDemo: item.isDemo,
        },
        invalidReason,
      }
    })
    const developmentIds = new Set(evaluationData?.split.developmentIds ?? [])
    const holdoutIds = new Set(evaluationData?.split.holdoutIds ?? [])
    const commentEntries: CatalogEntry[] = (evaluationData?.dataset.items ?? []).map((item) => {
      const analysis = this.analysisTextNormalizer.normalize(item.rawText)
      return {
      input: {
        id: item.id,
        title: `${item.platform ?? '消费者'}评论${item.product ? ` · ${item.product}` : ''}`,
        rawText: item.rawText,
        ...analysis,
        sourceKind: 'consumer_comment',
        isDemo: false,
      },
      candidate: {
        itemId: item.id,
        summary: item.rawText.slice(0, 80),
        originalTitle: `${item.platform ?? '消费者'}评论${item.product ? ` · ${item.product}` : ''}`,
        originalTextPreview: item.rawText.slice(0, 180),
        source: item.platform ?? '真实评论样本',
        sourceName: item.platform ?? '真实评论样本',
        dataType: 'consumer_comment',
        dataLayer: 'live',
        dataset: holdoutIds.has(item.id) ? 'holdout' : developmentIds.has(item.id) ? 'development' : null,
        processingStatus: 'processed',
        roleHint: 'consumer_candidate',
        selectionRole: 'consumer_candidate',
        roleGuidance: '真实评论样本，待模型与人工复核',
        isDemo: false,
      },
      invalidReason: item.rawText.trim() ? null : '原始文本为空',
    }})
    return [...rawEntries, ...commentEntries]
  }

  private async loadEvaluationData() {
    if (!this.evaluationDataLoader) return null
    return this.evaluationDataLoader.load()
  }

  private async requireBatch(id: string) {
    const batch = await this.repository.getAIBatch(id)
    if (!batch) throw new Error('AI 批次不存在。')
    return batch
  }

  private async recordsForBatch(batchId: string) {
    return (await this.repository.getAIAnalysisRecords()).filter((record) => record.batchId === batchId)
  }

  private async saveRun(
    batch: AIBatch,
    execution: AIProviderExecution | null,
    startedAt: string,
    started: number,
    successCount: number,
    quoteValidCount: number,
    errorMessage: string | null,
    provider: string = this.provider.name,
    model = this.provider.model,
    mode = this.provider.mode,
    isAutomated = this.provider.isAutomated,
    validationCounts?: { schemaValidCount: number; itemIdValidCount: number; traceableQuoteCount?: number },
  ) {
    const inputs = await this.getInputs(batch)
    const run: AIAnalysisRun = {
      id: `ai-run-${randomUUID()}`,
      batchId: batch.id,
      provider,
      model,
      mode,
      startedAt,
      finishedAt: new Date().toISOString(),
      durationMs: Math.max(1, Math.round(performance.now() - started)),
      inputItemCount: inputs.length,
      successCount,
      failedCount: inputs.length - successCount,
      retryCount: execution?.retryCount ?? 0,
      schemaValidCount: validationCounts?.schemaValidCount ?? successCount,
      itemIdValidCount: validationCounts?.itemIdValidCount ?? successCount,
      quoteValidCount,
      traceableQuoteCount: validationCounts?.traceableQuoteCount ?? 0,
      subrequestCount: execution?.subrequestCount,
      lowConfidenceCount: execution?.outputs.filter((output) => output && typeof output === 'object' && typeof (output as { confidence?: unknown }).confidence === 'number' && (output as { confidence: number }).confidence < 0.6).length ?? 0,
      inputCharacters: inputs.reduce((sum, item) => sum + item.rawText.length, 0),
      outputCharacters: execution?.outputCharacters ?? 0,
      tokenUsage: execution?.tokenUsage ?? null,
      estimatedCost: null,
      errorMessage,
      isAutomated,
      isDemo: batch.isDemo || provider === 'mock',
    }
    await this.repository.saveAIAnalysisRun(run)
  }
}

export const aiAnalysisVersions = { prompt: PROMPT_VERSION, schema: SCHEMA_VERSION }
