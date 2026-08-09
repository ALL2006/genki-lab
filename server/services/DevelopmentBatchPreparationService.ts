import type { ConsumerCommentEvaluationItem } from '../../shared/types.js'
import { evidenceAnalysisJsonSchema } from '../ai/evidenceSchema.js'
import { writeJsonAtomic, readJsonStrict } from '../storage/AtomicJsonFile.js'
import type { DataPathResolver } from '../storage/DataPathResolver.js'
import { aiAnalysisVersions } from './AIAnalysisService.js'

interface EvaluationDatasetFile {
  version: string
  items: ConsumerCommentEvaluationItem[]
}

interface EvaluationSplitFile {
  developmentIds: string[]
  holdoutIds: string[]
}

export interface DevelopmentBatchManifestEntry {
  batchName: string
  itemIds: string[]
  itemCount: number
  dataset: 'development'
  promptVersion: string
  schemaVersion: string
  status: 'prepared'
  inputFile: string
}

export class DevelopmentBatchPreparationService {
  constructor(
    private readonly datasetPath: string,
    private readonly splitPath: string,
    private readonly dataPaths: DataPathResolver,
  ) {}

  async prepare() {
    const [dataset, split] = await Promise.all([
      readJsonStrict<EvaluationDatasetFile>(this.datasetPath),
      readJsonStrict<EvaluationSplitFile>(this.splitPath),
    ])
    const holdoutIds = new Set(split.holdoutIds)
    if (split.developmentIds.length !== 39) throw new Error(`development必须为39条，当前为${split.developmentIds.length}条。`)
    if (split.developmentIds.some((id) => holdoutIds.has(id))) throw new Error('development与holdout存在交集，已拒绝生成批次。')
    const itemById = new Map(dataset.items.map((item) => [item.id, item]))
    const developmentItems = split.developmentIds.map((id) => {
      const item = itemById.get(id)
      if (!item) throw new Error(`development项目不存在：${id}`)
      return item
    })
    const sizes = [10, 10, 10, 9]
    let offset = 0
    const manifest: DevelopmentBatchManifestEntry[] = []
    for (let index = 0; index < sizes.length; index += 1) {
      const items = developmentItems.slice(offset, offset + sizes[index])
      offset += sizes[index]
      const batchName = `B2-DEV-${String(index + 1).padStart(2, '0')}`
      const inputFile = `batches/${batchName}-input.json`
      const entry: DevelopmentBatchManifestEntry = {
        batchName,
        itemIds: items.map((item) => item.id),
        itemCount: items.length,
        dataset: 'development',
        promptVersion: aiAnalysisVersions.prompt,
        schemaVersion: aiAnalysisVersions.schema,
        status: 'prepared',
        inputFile,
      }
      manifest.push(entry)
      await writeJsonAtomic(this.dataPaths.resolve(inputFile), {
        batchName,
        dataset: 'development',
        promptVersion: entry.promptVersion,
        schemaVersion: entry.schemaVersion,
        instructions: [
          '逐条分析items，禁止改变itemId。',
          'evidenceQuotes.quote必须是rawText中的连续原文。',
          '只返回JSON对象 {"results": [...]}。',
        ],
        schema: { type: 'object', additionalProperties: false, required: ['results'], properties: { results: { type: 'array', items: evidenceAnalysisJsonSchema } } },
        items: items.map((item) => ({
          id: item.id,
          title: `${item.platform ?? '消费者'}评论${item.product ? ` · ${item.product}` : ''}`,
          rawText: item.rawText,
          sourceKind: 'consumer_comment',
          isDemo: false,
        })),
      })
    }
    const output = {
      version: 'b2-development-manifest-v1',
      datasetVersion: dataset.version,
      generatedAt: new Date().toISOString(),
      itemCount: developmentItems.length,
      holdoutIncluded: false,
      batches: manifest,
    }
    await writeJsonAtomic(this.dataPaths.resolve('batches/b2-development-manifest.json'), output)
    return output
  }
}
