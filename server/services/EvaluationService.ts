import { randomUUID } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { performance } from 'node:perf_hooks'
import type {
  ConsumerCommentEvaluationItem,
  EvaluationLabelMetrics,
  EvaluationMetrics,
  EvaluationRun,
  EvaluationSplit,
  EvidenceAnalysisData,
} from '../../shared/types.js'
import { validateEvidenceAnalysis } from '../ai/evidenceSchema.js'
import type { AIProvider, EvidenceInputItem } from '../providers/AIProvider.js'
import type { DataRepository } from '../repositories/DataRepository.js'
import { AnalysisTextNormalizer } from '../analysis-text/AnalysisTextNormalizer.js'

interface DatasetFile {
  version: string
  disclaimer: string
  items: ConsumerCommentEvaluationItem[]
}

interface SplitFile {
  datasetVersion: string
  developmentIds: string[]
  holdoutIds: string[]
}

const normalizeSet = (values: string[]) => new Set(values.map((value) => value.trim()).filter(Boolean))

function labelMetrics(pairs: Array<{ expected: string[]; predicted: string[] }>): EvaluationLabelMetrics {
  let truePositive = 0
  let falsePositive = 0
  let falseNegative = 0
  let exact = 0
  for (const pair of pairs) {
    const expected = normalizeSet(pair.expected)
    const predicted = normalizeSet(pair.predicted)
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

function predictedSentiment(output: EvidenceAnalysisData) {
  if (output.positiveSignals.length > output.negativeSignals.length) return 'positive'
  if (output.negativeSignals.length > output.positiveSignals.length) return 'negative'
  return 'neutral'
}

export class EvaluationService {
  private readonly analysisTextNormalizer = new AnalysisTextNormalizer()
  constructor(
    private readonly repository: DataRepository,
    private readonly provider: AIProvider,
    private readonly datasetPath: string,
    private readonly splitPath: string,
  ) {}

  async getDatasetSummary() {
    const { dataset, split } = await this.load()
    return {
      version: dataset.version,
      itemCount: dataset.items.length,
      developmentCount: split.developmentIds.length,
      holdoutCount: split.holdoutIds.length,
      disclaimer: dataset.disclaimer,
    }
  }

  async run(splitName: EvaluationSplit): Promise<EvaluationRun> {
    if (this.provider.delivery !== 'synchronous') throw new Error('当前 Provider 不能同步运行评测；请切换 mock 或 ark-doubao。')
    const { dataset, split } = await this.load()
    const selectedIds = new Set(splitName === 'development' ? split.developmentIds : split.holdoutIds)
    const selected = dataset.items.filter((item) => selectedIds.has(item.id))
    if (selected.length !== selectedIds.size) throw new Error('冻结划分引用了评测集中不存在的编号。')
    const inputs: EvidenceInputItem[] = selected.map((item) => {
      const analysis = this.analysisTextNormalizer.normalize(item.rawText)
      return {
        id: item.id,
        title: `${item.platform ?? '未知平台'} · ${item.product ?? '饮料评论'}`,
        rawText: item.rawText,
        ...analysis,
        sourceKind: 'consumer_comment',
        isDemo: this.provider.isDemo,
      }
    })
    const startedAt = new Date().toISOString()
    const started = performance.now()
    let outputs: unknown[] = []
    let retryCount = 0
    let errorMessage: string | null = null
    try {
      const execution = await this.provider.analyzeEvidence(inputs)
      outputs = execution.outputs
      retryCount = execution.retryCount
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : '未知评测错误'
    }
    const outputById = new Map<string, unknown>()
    for (const output of outputs) {
      if (output && typeof output === 'object' && typeof (output as { itemId?: unknown }).itemId === 'string') {
        outputById.set((output as { itemId: string }).itemId, output)
      }
    }

    const valid: Array<{ item: ConsumerCommentEvaluationItem; output: EvidenceAnalysisData }> = []
    let schemaValid = 0
    let itemIdValid = 0
    let quoteValid = 0
    let lowConfidence = 0
    for (const item of selected) {
      const validation = validateEvidenceAnalysis(outputById.get(item.id), { itemId: item.id, rawText: this.analysisTextNormalizer.normalize(item.rawText).analysisText, sourceKind: 'consumer_comment' })
      if (validation.schemaValid) schemaValid += 1
      if (validation.itemIdValid) itemIdValid += 1
      if (validation.quoteValid) quoteValid += 1
      if (validation.data?.confidence !== undefined && validation.data.confidence < 0.6) lowConfidence += 1
      if (validation.data && validation.schemaValid && validation.itemIdValid && validation.quoteValid && validation.errors.length === 0) valid.push({ item, output: validation.data })
    }
    const sentimentMatches = valid.filter(({ item, output }) => item.humanSentiment === predictedSentiment(output)).length
    const flavorPairs = valid.map(({ item, output }) => ({ expected: item.humanFlavorTags, predicted: output.flavors }))
    const scenePairs = valid.map(({ item, output }) => ({ expected: item.humanSceneTags, predicted: output.scenes }))
    const painPairs = valid.map(({ item, output }) => ({ expected: item.humanPainPointTags, predicted: [...new Set([...output.negativeSignals, ...output.riskSignals])] }))
    const modificationNeeded = valid.filter(({ item, output }) => {
      const labelEqual = (expected: string[], predicted: string[]) => {
        const a = normalizeSet(expected); const b = normalizeSet(predicted)
        return a.size === b.size && [...a].every((value) => b.has(value))
      }
      return item.humanSentiment !== predictedSentiment(output)
        || !labelEqual(item.humanFlavorTags, output.flavors)
        || !labelEqual(item.humanSceneTags, output.scenes)
        || !labelEqual(item.humanPainPointTags, [...new Set([...output.negativeSignals, ...output.riskSignals])])
    }).length
    const sampleCount = selected.length
    const metrics: EvaluationMetrics = {
      sampleCount,
      jsonSchemaSuccessRate: schemaValid / sampleCount,
      itemIdMatchRate: itemIdValid / sampleCount,
      evidenceQuoteValidationRate: quoteValid / sampleCount,
      sentimentAgreementRate: valid.length === 0 ? 0 : sentimentMatches / valid.length,
      flavor: labelMetrics(flavorPairs),
      scene: labelMetrics(scenePairs),
      painPoint: labelMetrics(painPairs),
      humanModificationRate: valid.length === 0 ? 1 : modificationNeeded / valid.length,
      averageDurationMs: Math.max(1, Math.round(performance.now() - started)) / sampleCount,
      failureRate: 1 - valid.length / sampleCount,
      retryCount,
      lowConfidenceRate: lowConfidence / sampleCount,
    }
    const run: EvaluationRun = {
      id: `evaluation-${randomUUID()}`,
      provider: this.provider.name,
      model: this.provider.model,
      split: splitName,
      datasetVersion: dataset.version,
      startedAt,
      finishedAt: new Date().toISOString(),
      durationMs: Math.max(1, Math.round(performance.now() - started)),
      metrics,
      isDemo: this.provider.isDemo,
      disclaimer: `${dataset.disclaimer} “人工修改率”为与冻结人工标签相比的估算修改需求率，不是实际审核操作率。${errorMessage ? ` 调用错误：${errorMessage}` : ''}`,
    }
    await this.repository.saveEvaluationRun(run)
    return run
  }

  private async load() {
    const [datasetText, splitText] = await Promise.all([readFile(this.datasetPath, 'utf8'), readFile(this.splitPath, 'utf8')])
    const dataset = JSON.parse(datasetText) as DatasetFile
    const split = JSON.parse(splitText) as SplitFile
    if (dataset.version !== split.datasetVersion) throw new Error('评测集与冻结划分版本不匹配。')
    if (dataset.items.length !== 49 || split.developmentIds.length !== 39 || split.holdoutIds.length !== 10) {
      throw new Error('评测集冻结数量异常，期望 49 = 39 development + 10 holdout。')
    }
    const overlap = split.developmentIds.filter((id) => split.holdoutIds.includes(id))
    if (overlap.length > 0) throw new Error(`开发集与保留集重叠：${overlap.join(', ')}`)
    return { dataset, split }
  }
}
