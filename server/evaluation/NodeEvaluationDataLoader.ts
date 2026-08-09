import { readFile } from 'node:fs/promises'
import type { EvaluationDataLoader, EvaluationDatasetFile, EvaluationSplitFile } from './EvaluationDataLoader.js'

export class NodeEvaluationDataLoader implements EvaluationDataLoader {
  constructor(private readonly datasetPath: string, private readonly splitPath: string) {}

  async load() {
    const [datasetText, splitText] = await Promise.all([
      readFile(this.datasetPath, 'utf8'),
      readFile(this.splitPath, 'utf8'),
    ])
    return {
      dataset: JSON.parse(datasetText) as EvaluationDatasetFile,
      split: JSON.parse(splitText) as EvaluationSplitFile,
    }
  }
}
