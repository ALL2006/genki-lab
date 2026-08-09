import type {
  AIAnalysisRecord,
  AIAnalysisRun,
  AIBatch,
  AIResultImport,
  AutomationRun,
  DataSource,
  EvaluationRun,
  ExperimentRun,
  JobRun,
  ProductConcept,
  ProductConceptStatus,
  RawItem,
  RawItemStatus,
  ReviewStatus,
  TrendSignal,
  TrendCandidate,
  ValidationFlag,
  ValidationResponse,
} from '../../shared/types.js'

export interface DataRepository {
  getDataSources(): Promise<DataSource[]>
  getDataSource(id: string): Promise<DataSource | undefined>
  saveDataSource(source: DataSource): Promise<void>
  getRawItems(status?: RawItemStatus): Promise<RawItem[]>
  insertRawItems(items: RawItem[]): Promise<void>
  setRawItemStatus(ids: string[], status: RawItemStatus): Promise<void>
  getTrendSignals(reviewStatus?: ReviewStatus): Promise<TrendSignal[]>
  insertTrendSignals(signals: TrendSignal[]): Promise<void>
  reviewTrendSignal(id: string, status: ReviewStatus, reviewer: string): Promise<TrendSignal | undefined>
  getProductConcepts(): Promise<ProductConcept[]>
  insertProductConcepts(products: ProductConcept[]): Promise<void>
  updateProductConcept(
    id: string,
    patch: { humanScore?: number | null; status?: ProductConceptStatus },
  ): Promise<ProductConcept | undefined>
  getValidationResponses(): Promise<ValidationResponse[]>
  getJobRuns(): Promise<JobRun[]>
  saveJobRun(run: JobRun): Promise<void>
  getAIBatches(): Promise<AIBatch[]>
  getAIBatch(id: string): Promise<AIBatch | undefined>
  saveAIBatch(batch: AIBatch): Promise<void>
  getAIAnalysisRecords(): Promise<AIAnalysisRecord[]>
  saveAIAnalysisRecords(records: AIAnalysisRecord[]): Promise<void>
  saveAIAnalysisRecord(record: AIAnalysisRecord): Promise<void>
  getAIAnalysisRuns(): Promise<AIAnalysisRun[]>
  saveAIAnalysisRun(run: AIAnalysisRun): Promise<void>
  getAIResultImports(): Promise<AIResultImport[]>
  saveAIResultImport(resultImport: AIResultImport): Promise<void>
  getTrendCandidates(): Promise<TrendCandidate[]>
  saveTrendCandidates(candidates: TrendCandidate[]): Promise<void>
  getEvaluationRuns(): Promise<EvaluationRun[]>
  saveEvaluationRun(run: EvaluationRun): Promise<void>
  getAutomationRuns(): Promise<AutomationRun[]>
  saveAutomationRun(run: AutomationRun): Promise<void>
  getValidationFlags(): Promise<ValidationFlag[]>
  saveValidationFlags(flags: ValidationFlag[]): Promise<void>
  getExperimentRuns(): Promise<ExperimentRun[]>
  saveExperimentRun(run: ExperimentRun): Promise<void>
}
