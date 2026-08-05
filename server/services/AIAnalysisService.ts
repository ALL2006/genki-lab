import { createHash, randomUUID } from 'node:crypto'
import { performance } from 'node:perf_hooks'
import type {
  AIAnalysisMode,
  AIAnalysisRecord,
  AIAnalysisRun,
  AIBatch,
  AIResultImport,
  EvidenceAnalysisData,
  ReviewStatus,
} from '../../shared/types.js'
import { evidenceAnalysisJsonSchema, validateEvidenceAnalysis } from '../ai/evidenceSchema.js'
import type { AIProvider, AIProviderExecution, EvidenceInputItem } from '../providers/AIProvider.js'
import type { DataRepository } from '../repositories/DataRepository.js'

const PROMPT_VERSION = 'evidence-analysis-v1'
const SCHEMA_VERSION = 'evidence-analysis-v1'

export interface ImportPayload {
  batchId: string
  provider?: string
  model?: string | null
  mode?: AIAnalysisMode
  results: unknown[]
  rawModelResponse?: unknown
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
  constructor(
    private readonly repository: DataRepository,
    private readonly provider: AIProvider,
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

  async createBatch(itemIds?: string[]): Promise<AIBatch> {
    const [rawItems, records] = await Promise.all([
      this.repository.getRawItems('pending'),
      this.repository.getAIAnalysisRecords(),
    ])
    const analyzedIds = new Set(records.map((record) => record.itemId))
    const requested = itemIds?.length ? new Set(itemIds) : null
    const selected = rawItems.filter((item) =>
      !analyzedIds.has(item.id) && (requested ? requested.has(item.id) : !item.isDemo),
    )
    if (requested && selected.length !== requested.size) {
      throw new Error('一个或多个 itemId 不存在、非 pending，或已经有 AI 分析记录。')
    }
    if (selected.length === 0) throw new Error('没有待分析资料；默认只选择尚未分析的 LIVE pending RawItem。')
    const now = new Date().toISOString()
    const batch: AIBatch = {
      id: `ai-batch-${randomUUID()}`,
      provider: this.provider.name,
      model: this.provider.model,
      status: 'pending',
      itemIds: selected.map((item) => item.id),
      createdAt: now,
      updatedAt: now,
      promptVersion: PROMPT_VERSION,
      schemaVersion: SCHEMA_VERSION,
      importedResultHashes: [],
      isDemo: this.provider.isDemo || selected.every((item) => item.isDemo),
    }
    await this.repository.saveAIBatch(batch)
    return batch
  }

  async getPendingBatches() {
    return (await this.repository.getAIBatches()).filter((batch) => batch.status === 'pending' || batch.status === 'dispatched')
  }

  async exportBatch(id: string) {
    const batch = await this.requireBatch(id)
    const inputs = await this.getInputs(batch)
    return {
      exportVersion: 'ai-batch-export-v1',
      batch,
      instructions: [
        '逐条分析 items，禁止改变 itemId。',
        'evidenceQuotes.quote 必须是 rawText 的连续原文片段。',
        '公开资料 RawItem 不得标为 consumer_evidence。',
        '只返回 {"results": [...]}，每个字段都必须存在。',
      ],
      schema: { type: 'object', additionalProperties: false, required: ['results'], properties: { results: { type: 'array', items: evidenceAnalysisJsonSchema } } },
      items: inputs,
    }
  }

  async executeBatch(id: string) {
    const batch = await this.requireBatch(id)
    if (batch.status === 'completed') throw new Error('批次已经完成。')
    if (batch.provider !== this.provider.name) throw new Error('批次 Provider 与当前 AI_PROVIDER 不一致。')
    if (this.provider.delivery === 'manual') throw new Error('Manual JSON 模式请导出批次，再通过导入端点回传结果。')
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
      const records = await this.validateAndBuildRecords(batch, inputs, execution.outputs, {
        provider: this.provider.name,
        model: this.provider.model,
        mode: this.provider.mode,
        isAutomated: this.provider.isAutomated,
        rawModelResponse: execution.rawResponse,
      })
      await this.repository.saveAIAnalysisRecords(records)
      batch.status = 'completed'
      batch.updatedAt = new Date().toISOString()
      await this.repository.saveAIBatch(batch)
      await this.saveRun(batch, execution, startedAt, started, records.length, records.filter((record) => record.quoteValid).length, null)
      return { batch, records, dispatched: false }
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
      const records = await this.validateAndBuildRecords(batch, inputs, payload.results, {
        provider,
        model,
        mode,
        isAutomated: mode !== 'manual_import',
        rawModelResponse: payload.rawModelResponse ?? payload.results,
      })
      await this.repository.saveAIAnalysisRecords(records)
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
      }
      await this.repository.saveAIResultImport(resultImport)
      batch.status = 'completed'
      batch.updatedAt = new Date().toISOString()
      batch.importedResultHashes = [...batch.importedResultHashes, hash]
      await this.repository.saveAIBatch(batch)
      await this.saveRun(batch, { outputs: payload.results, rawResponse: payload.rawModelResponse, retryCount: 0, tokenUsage: null, outputCharacters: canonical(payload.results).length }, startedAt, started, records.length, records.length, null, provider, model, mode, mode !== 'manual_import')
      return { idempotent: false, resultImport, records }
    } catch (error) {
      const message = error instanceof Error ? error.message : '未知导入错误'
      await this.saveRun(batch, null, startedAt, started, 0, 0, message, payload.provider ?? 'manual-doubao', payload.model ?? null, payload.mode ?? 'manual_import', payload.mode !== undefined && payload.mode !== 'manual_import')
      throw error
    }
  }

  async reviewRecord(id: string, patch: { reviewStatus: ReviewStatus; reviewer: string; reviewComment?: string | null; finalHumanVersion?: unknown }) {
    const record = (await this.repository.getAIAnalysisRecords()).find((item) => item.id === id)
    if (!record) return undefined
    const rawItem = (await this.repository.getRawItems()).find((item) => item.id === record.itemId)
    if (!rawItem) throw new Error('分析记录对应的 RawItem 不存在。')
    let finalHumanVersion: EvidenceAnalysisData | null = record.finalHumanVersion
    let editedFields: string[] = record.editedFields
    if (patch.finalHumanVersion !== undefined) {
      const validation = validateEvidenceAnalysis(patch.finalHumanVersion, { itemId: rawItem.id, rawText: rawItem.rawText, sourceKind: 'raw_item' })
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
      const validation = validateEvidenceAnalysis(output, {
        itemId: input.id,
        rawText: input.rawText,
        sourceKind: input.sourceKind,
        dataSourceType: input.dataSourceType,
      })
      if (!validation.data || !validation.schemaValid || !validation.itemIdValid || !validation.quoteValid || validation.errors.length > 0) {
        throw new Error(`${input.id} 校验失败：${validation.errors.join('；')}`)
      }
      return {
        id: `ai-analysis-${randomUUID()}`,
        batchId: batch.id,
        itemId: input.id,
        provider: metadata.provider,
        model: metadata.model,
        mode: metadata.mode,
        originalAIOutput: output,
        parsedAIOutput: validation.data,
        finalHumanVersion: null,
        schemaValid: true,
        quoteValid: true,
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

  private async getInputs(batch: AIBatch): Promise<EvidenceInputItem[]> {
    const [rawItems, sources] = await Promise.all([this.repository.getRawItems(), this.repository.getDataSources()])
    const rawById = new Map(rawItems.map((item) => [item.id, item]))
    const sourceById = new Map(sources.map((source) => [source.id, source]))
    return batch.itemIds.map((id) => {
      const item = rawById.get(id)
      if (!item) throw new Error(`批次引用的 RawItem 不存在：${id}`)
      return { id: item.id, title: item.title, rawText: item.rawText, sourceKind: 'raw_item', dataSourceType: sourceById.get(item.sourceId)?.type, isDemo: item.isDemo }
    })
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
      schemaValidCount: successCount,
      quoteValidCount,
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
