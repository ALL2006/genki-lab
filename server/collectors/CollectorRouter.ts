import type { DataSource } from '../../shared/types.js'
import type { CollectedItem, Collector } from './Collector.js'

export class CollectorRouter implements Collector {
  constructor(private readonly collectors: Record<DataSource['collectorType'], Collector>) {}

  collect(source: DataSource): Promise<CollectedItem[]> {
    const collector = this.collectors[source.collectorType]
    if (!collector) throw new Error(`不支持的采集器类型：${source.collectorType}`)
    return collector.collect(source)
  }
}
