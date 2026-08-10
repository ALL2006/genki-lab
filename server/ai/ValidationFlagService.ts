import { randomUUID } from 'node:crypto'
import type { EvidenceAnalysisData, QuoteRepairResult, ValidationFlag } from '../../shared/types.js'
import type { EvidenceValidationContext } from './evidenceSchema.js'

export class ValidationFlagService {
  create(
    analysisRecordId: string,
    data: EvidenceAnalysisData,
    context: EvidenceValidationContext,
    repairs: QuoteRepairResult[],
  ): ValidationFlag[] {
    const flags: ValidationFlag[] = []
    const add = (type: ValidationFlag['type'], severity: ValidationFlag['severity'], message: string, field: string | null) => {
      flags.push({ id: `validation-flag-${randomUUID()}`, analysisRecordId, type, severity, message, field, status: 'open', createdAt: new Date().toISOString() })
    }
    if (context.sourceKind === 'raw_item' && data.evidenceRole === 'consumer_evidence') {
      add('role_conflict', 'high', '公开资料不能作为消费者真实偏好证据。', 'evidenceRole')
    }
    if (context.sourceKind === 'consumer_comment' && data.evidenceRole !== 'consumer_evidence') {
      add('role_conflict', 'high', '真实消费者评论不能归为市场、背景或无关证据。', 'evidenceRole')
    }
    if (data.evidenceRole !== 'consumer_evidence' && data.eligibleForConceptGeneration) {
      add('role_conflict', 'high', '市场或背景证据不能直接进入概念生成。', 'eligibleForConceptGeneration')
    }
    if (repairs.some((repair) => repair.quoteAutoRepaired)) {
      add('quote_mismatch', 'info', '引文已通过确定性规范化匹配，并替换为原始连续文本。', 'evidenceQuotes')
    }
    if (data.evidenceQuotes.length === 0) {
      add('quote_mismatch', 'high', 'evidenceQuotes 为空，缺少可逐字核验的原文证据。', 'evidenceQuotes')
    }
    if (repairs.some((repair) => repair.repairMethod === 'normalized_multiple')) {
      add('quote_mismatch', 'warning', '规范化引文在原文中存在多个匹配，需要人工选择。', 'evidenceQuotes')
    }
    if (repairs.some((repair) => repair.repairMethod === 'not_found')) {
      add('quote_mismatch', 'high', '引文无法在原文中定位。', 'evidenceQuotes')
    }
    if (data.relevanceScore < 0.5 || data.confidence < 0.55) {
      add('weak_relevance', 'warning', '相关性或置信度较低，需要人工复核。', data.relevanceScore < 0.5 ? 'relevanceScore' : 'confidence')
    }
    return flags
  }
}
