import { z } from 'zod'
import type { DataSourceType, EvidenceAnalysisData } from '../../shared/types.js'

const evidenceRoles = ['consumer_evidence', 'market_evidence', 'background_evidence', 'irrelevant'] as const
const signalTypes = ['consumer_preference', 'product_launch', 'category_trend', 'safety_context', 'other'] as const

const nonEmptyString = z.string().trim()

export const evidenceAnalysisSchema = z.strictObject({
  itemId: z.string().trim().min(1),
  evidenceRole: z.enum(evidenceRoles),
  relevanceScore: z.number().min(0).max(1),
  relevanceReason: z.string(),
  brands: z.array(nonEmptyString),
  productCategories: z.array(nonEmptyString),
  flavors: z.array(nonEmptyString),
  consumerNeeds: z.array(nonEmptyString),
  scenes: z.array(nonEmptyString),
  positiveSignals: z.array(nonEmptyString),
  negativeSignals: z.array(nonEmptyString),
  riskSignals: z.array(nonEmptyString),
  signalType: z.enum(signalTypes),
  evidenceQuotes: z.array(z.strictObject({ quote: z.string().trim().min(1), supports: z.string().trim().min(1) })),
  confidence: z.number().min(0).max(1),
  eligibleForConceptGeneration: z.boolean(),
})

export const evidenceAnalysisJsonSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'itemId', 'evidenceRole', 'relevanceScore', 'relevanceReason', 'brands', 'productCategories',
    'flavors', 'consumerNeeds', 'scenes', 'positiveSignals', 'negativeSignals', 'riskSignals',
    'signalType', 'evidenceQuotes', 'confidence', 'eligibleForConceptGeneration',
  ],
  properties: {
    itemId: { type: 'string' },
    evidenceRole: { type: 'string', enum: evidenceRoles },
    relevanceScore: { type: 'number', minimum: 0, maximum: 1 },
    relevanceReason: { type: 'string' },
    brands: { type: 'array', items: { type: 'string' } },
    productCategories: { type: 'array', items: { type: 'string' } },
    flavors: { type: 'array', items: { type: 'string' } },
    consumerNeeds: { type: 'array', items: { type: 'string' } },
    scenes: { type: 'array', items: { type: 'string' } },
    positiveSignals: { type: 'array', items: { type: 'string' } },
    negativeSignals: { type: 'array', items: { type: 'string' } },
    riskSignals: { type: 'array', items: { type: 'string' } },
    signalType: { type: 'string', enum: signalTypes },
    evidenceQuotes: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['quote', 'supports'],
        properties: { quote: { type: 'string', minLength: 1 }, supports: { type: 'string', minLength: 1 } },
      },
    },
    confidence: { type: 'number', minimum: 0, maximum: 1 },
    eligibleForConceptGeneration: { type: 'boolean' },
  },
} as const

export interface EvidenceValidationContext {
  itemId: string
  rawText: string
  sourceKind: 'raw_item' | 'consumer_comment'
  dataSourceType?: DataSourceType
}

export interface EvidenceValidationResult {
  data: EvidenceAnalysisData | null
  schemaValid: boolean
  itemIdValid: boolean
  quoteValid: boolean
  errors: string[]
}

function normalizeForQuote(value: string) {
  return value.replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim()
}

export function validateEvidenceAnalysis(value: unknown, context: EvidenceValidationContext): EvidenceValidationResult {
  const parsed = evidenceAnalysisSchema.safeParse(value)
  if (!parsed.success) {
    return {
      data: null,
      schemaValid: false,
      itemIdValid: false,
      quoteValid: false,
      errors: parsed.error.issues.map((issue) => `${issue.path.join('.') || 'root'}: ${issue.message}`),
    }
  }

  const data = parsed.data
  const errors: string[] = []
  const itemIdValid = data.itemId === context.itemId
  if (!itemIdValid) errors.push(`itemId 不匹配：期望 ${context.itemId}，实际 ${data.itemId}`)

  const normalizedSource = normalizeForQuote(context.rawText)
  const quoteValid = data.evidenceQuotes.length > 0
    && data.evidenceQuotes.every((evidence) => normalizedSource.includes(normalizeForQuote(evidence.quote)))
  if (!quoteValid) errors.push(data.evidenceQuotes.length === 0 ? 'evidenceQuotes 为空' : 'evidenceQuote 不存在于原始文本')

  if (data.evidenceRole !== 'consumer_evidence' && data.eligibleForConceptGeneration) {
    errors.push('只有 consumer_evidence 可以直接标记为可进入概念生成')
  }
  if (data.evidenceRole === 'irrelevant' && data.signalType !== 'other') {
    errors.push('irrelevant 的 signalType 必须为 other')
  }
  if (data.signalType === 'consumer_preference' && data.evidenceRole !== 'consumer_evidence') {
    errors.push('只有 consumer_evidence 可以输出 consumer_preference')
  }
  if (context.sourceKind === 'raw_item' && data.evidenceRole === 'consumer_evidence') {
    errors.push('公开资料 RawItem 不能被识别为消费者评论证据')
  }
  if (context.dataSourceType === 'brand_news' && data.evidenceRole === 'consumer_evidence') {
    errors.push('品牌官方新闻不得作为消费者偏好证据')
  }

  return { data, schemaValid: true, itemIdValid, quoteValid, errors }
}
