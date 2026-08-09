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
import type { AutomationClaimResult, DataRepository } from './DataRepository.js'

export class FeishuBitableRepository implements DataRepository {
  private unavailable(): never {
    throw new Error('FeishuBitableRepository 尚未接入：请配置飞书应用凭证与多维表格字段映射。')
  }
  async getDataSources(): Promise<DataSource[]> { return this.unavailable() }
  async getDataSource(_id: string): Promise<DataSource | undefined> { return this.unavailable() }
  async saveDataSource(_source: DataSource): Promise<void> { return this.unavailable() }
  async getRawItems(_status?: RawItemStatus): Promise<RawItem[]> { return this.unavailable() }
  async insertRawItems(_items: RawItem[]): Promise<void> { return this.unavailable() }
  async setRawItemStatus(_ids: string[], _status: RawItemStatus): Promise<void> { return this.unavailable() }
  async getTrendSignals(_reviewStatus?: ReviewStatus): Promise<TrendSignal[]> { return this.unavailable() }
  async insertTrendSignals(_signals: TrendSignal[]): Promise<void> { return this.unavailable() }
  async reviewTrendSignal(_id: string, _status: ReviewStatus, _reviewer: string): Promise<TrendSignal | undefined> { return this.unavailable() }
  async getProductConcepts(): Promise<ProductConcept[]> { return this.unavailable() }
  async insertProductConcepts(_products: ProductConcept[]): Promise<void> { return this.unavailable() }
  async updateProductConcept(_id: string, _patch: { humanScore?: number | null; status?: ProductConceptStatus }): Promise<ProductConcept | undefined> { return this.unavailable() }
  async getValidationResponses(): Promise<ValidationResponse[]> { return this.unavailable() }
  async getJobRuns(): Promise<JobRun[]> { return this.unavailable() }
  async saveJobRun(_run: JobRun): Promise<void> { return this.unavailable() }
  async getAIBatches(): Promise<AIBatch[]> { return this.unavailable() }
  async getAIBatch(_id: string): Promise<AIBatch | undefined> { return this.unavailable() }
  async saveAIBatch(_batch: AIBatch): Promise<void> { return this.unavailable() }
  async getAIAnalysisRecords(): Promise<AIAnalysisRecord[]> { return this.unavailable() }
  async saveAIAnalysisRecords(_records: AIAnalysisRecord[]): Promise<void> { return this.unavailable() }
  async saveAIAnalysisRecord(_record: AIAnalysisRecord): Promise<void> { return this.unavailable() }
  async getAIAnalysisRuns(): Promise<AIAnalysisRun[]> { return this.unavailable() }
  async saveAIAnalysisRun(_run: AIAnalysisRun): Promise<void> { return this.unavailable() }
  async getAIResultImports(): Promise<AIResultImport[]> { return this.unavailable() }
  async saveAIResultImport(_resultImport: AIResultImport): Promise<void> { return this.unavailable() }
  async getTrendCandidates(): Promise<TrendCandidate[]> { return this.unavailable() }
  async saveTrendCandidates(_candidates: TrendCandidate[]): Promise<void> { return this.unavailable() }
  async getEvaluationRuns(): Promise<EvaluationRun[]> { return this.unavailable() }
  async saveEvaluationRun(_run: EvaluationRun): Promise<void> { return this.unavailable() }
  async getAutomationRuns(): Promise<AutomationRun[]> { return this.unavailable() }
  async claimAutomationRun(_run: AutomationRun, _staleBefore: string): Promise<AutomationClaimResult> { return this.unavailable() }
  async saveAutomationRun(_run: AutomationRun): Promise<void> { return this.unavailable() }
  async getValidationFlags(): Promise<ValidationFlag[]> { return this.unavailable() }
  async saveValidationFlags(_flags: ValidationFlag[]): Promise<void> { return this.unavailable() }
  async getExperimentRuns(): Promise<ExperimentRun[]> { return this.unavailable() }
  async saveExperimentRun(_run: ExperimentRun): Promise<void> { return this.unavailable() }
}
