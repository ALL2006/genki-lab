import { ANALYSIS_TEXT_VERSION, AnalysisTextNormalizer } from '../analysis-text/AnalysisTextNormalizer.js'
import type { DataRepository } from '../repositories/DataRepository.js'

export class AnalysisTextBackfillService {
  constructor(
    private readonly repository: DataRepository,
    private readonly normalizer = new AnalysisTextNormalizer(),
  ) {}

  async backfill() {
    const items = await this.repository.getRawItems()
    let initialized = 0
    let updated = 0
    let skipped = 0
    for (const item of items) {
      const normalized = this.normalizer.normalize(item.rawText, item.rawPayload)
      const isCurrent = item.analysisText === normalized.analysisText
        && item.analysisTextVersion === ANALYSIS_TEXT_VERSION
        && JSON.stringify(item.analysisTextSpanMap) === JSON.stringify(normalized.analysisTextSpanMap)
      if (isCurrent) {
        skipped += 1
        continue
      }
      await this.repository.saveRawItem({ ...item, ...normalized })
      if (item.analysisText === undefined) initialized += 1
      else updated += 1
    }
    const result = {
      analysisTextVersion: ANALYSIS_TEXT_VERSION,
      total: items.length,
      initialized,
      updated,
      skipped,
      idempotent: initialized === 0 && updated === 0,
    }
    console.log(JSON.stringify({ event: 'analysis_text_backfill', ...result }))
    return result
  }
}
