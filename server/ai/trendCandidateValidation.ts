import type { AIAnalysisRecord, TrendCandidate } from '../../shared/types.js'

export function validateTrendCandidate(candidate: TrendCandidate, records: AIAnalysisRecord[]) {
  const current = new Map(records.map((record) => [record.itemId, record.finalHumanVersion ?? record.parsedAIOutput]))
  const allEvidence = [...candidate.positiveEvidence, ...candidate.counterEvidence, ...candidate.marketEvidence, ...candidate.backgroundEvidence]
  const errors: string[] = []
  const itemIds = new Set(allEvidence.map((item) => item.itemId))
  if (itemIds.size < 2) errors.push('趋势候选至少需要 2 个独立资料编号。')
  for (const evidence of allEvidence) {
    const analysis = current.get(evidence.itemId)
    if (!analysis) errors.push(`证据引用不存在：${evidence.itemId}`)
    else if (!analysis.evidenceQuotes.some((quote) => quote.quote === evidence.quote)) errors.push(`引文未通过分析记录校验：${evidence.itemId}`)
  }
  if (candidate.eligibleForConceptGeneration) {
    const hasConsumerEvidence = candidate.positiveEvidence.some((evidence) => current.get(evidence.itemId)?.evidenceRole === 'consumer_evidence')
    if (!hasConsumerEvidence) errors.push('可进入概念生成的趋势必须包含 consumer_evidence。')
  }
  return { valid: errors.length === 0, errors, counterEvidenceDisplay: candidate.counterEvidence.length === 0 ? '当前样本未发现' : null }
}
