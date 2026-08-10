import type { ConsumerCommentEvaluationItem } from '../../shared/types.js'

export interface EvaluationDatasetFile {
  version?: string
  disclaimer?: string
  items: ConsumerCommentEvaluationItem[]
}

export interface EvaluationSplitFile {
  datasetVersion?: string
  developmentIds: string[]
  holdoutIds: string[]
}

export interface EvaluationDataLoader {
  load(): Promise<{ dataset: EvaluationDatasetFile; split: EvaluationSplitFile }>
}

export class InMemoryEvaluationDataLoader implements EvaluationDataLoader {
  constructor(
    private readonly dataset: EvaluationDatasetFile,
    private readonly split: EvaluationSplitFile,
  ) {}

  async load() { return { dataset: this.dataset, split: this.split } }
}
