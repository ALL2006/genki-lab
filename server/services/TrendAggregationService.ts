import type { DataRepository } from '../repositories/DataRepository.js'

export class TrendAggregationService {
  constructor(private readonly repository: DataRepository) {}

  async aggregate() {
    const records = (await this.repository.getAIAnalysisRecords()).filter((record) =>
      !record.isDemo
      && (record.validationStatus === 'validated' || record.validationStatus === 'auto_repaired')
      && record.parsedAIOutput.evidenceRole === 'consumer_evidence',
    )
    const uniqueConsumerIds = new Set(records.map((record) => record.itemId))
    if (uniqueConsumerIds.size < 2) {
      return { status: 'insufficient_evidence' as const, consumerItemCount: uniqueConsumerIds.size, candidates: [] }
    }
    const supportByNeed = new Map<string, Set<string>>()
    for (const record of records) {
      for (const need of record.parsedAIOutput.consumerNeeds) {
        const ids = supportByNeed.get(need) ?? new Set<string>()
        ids.add(record.itemId)
        supportByNeed.set(need, ids)
      }
    }
    const candidates = [...supportByNeed.entries()]
      .filter(([, ids]) => ids.size >= 2)
      .map(([consumerNeed, ids]) => ({ consumerNeed, consumerItemIds: [...ids], status: 'pending_human_review' as const }))
    return {
      status: candidates.length > 0 ? 'ready_for_human_review' as const : 'insufficient_evidence' as const,
      consumerItemCount: uniqueConsumerIds.size,
      candidates,
    }
  }
}
