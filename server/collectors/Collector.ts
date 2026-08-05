import type { CollectorType, DataSource, RawItemQualityStatus } from '../../shared/types.js'

export interface CollectedItem {
  title: string
  rawText: string
  summary: string
  publishedAt: string | null
  originalUrl: string
  rawPayload: Record<string, unknown>
  collectorType: CollectorType
  httpStatus: number | null
  contentLength: number
  qualityStatus: RawItemQualityStatus
  failureReason: string | null
  isDemo: boolean
}

export interface Collector {
  collect(source: DataSource): Promise<CollectedItem[]>
}
