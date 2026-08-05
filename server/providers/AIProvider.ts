import type {
  AIAnalysisMode,
  AIProviderName,
  AITokenUsage,
  DataSourceType,
  ProductConcept,
  RawItem,
  TrendSignal,
} from '../../shared/types.js'

export type GeneratedTrendSignal = Omit<TrendSignal, 'id' | 'reviewStatus' | 'reviewer' | 'reviewedAt' | 'isDemo'>
export type GeneratedProductConcept = Omit<ProductConcept, 'id' | 'humanScore' | 'status' | 'isDemo'>

export interface EvidenceInputItem {
  id: string
  title: string
  rawText: string
  sourceKind: 'raw_item' | 'consumer_comment'
  dataSourceType?: DataSourceType
  isDemo: boolean
}

export interface AIProviderExecution {
  outputs: unknown[]
  rawResponse: unknown
  retryCount: number
  tokenUsage: AITokenUsage | null
  outputCharacters: number
}

export interface AIProvider {
  readonly name: AIProviderName
  readonly model: string | null
  readonly mode: AIAnalysisMode
  readonly isAutomated: boolean
  readonly isDemo: boolean
  readonly delivery: 'synchronous' | 'callback' | 'manual'
  analyzeEvidence(items: EvidenceInputItem[]): Promise<AIProviderExecution>
  analyzeLegacy?(items: RawItem[]): Promise<GeneratedTrendSignal[]>
  generateProducts?(signals: TrendSignal[]): Promise<GeneratedProductConcept[]>
}
