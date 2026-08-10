import type {
  ApiResponse,
  DashboardSummary,
  AIBatch,
  AIAnalysisRecord,
  AIAnalysisRun,
  AIResultImport,
  AutomationRun,
  DataSource,
  DataSourceRoleHint,
  EvaluationRun,
  JobRun,
  ProductConcept,
  ProductConceptStatus,
  RawItem,
  ReviewStatus,
  TrendSignal,
  SystemReadiness,
  ValidationFlag,
  ValidationSummary,
} from '../../shared/types'

export interface AIBatchExport {
  exportVersion: string
  batch: AIBatch
  instructions: string[]
  schema: Record<string, unknown>
  items: Array<Record<string, unknown> & { id: string; rawText: string }>
}

export interface AIImportResult {
  idempotent: boolean
  resultImport: AIResultImport
  records: AIAnalysisRecord[]
}

export interface AIBatchCandidate {
  itemId: string
  summary: string
  originalTitle: string
  originalTextPreview: string
  source: string
  sourceName: string
  dataType: 'public_material' | 'consumer_comment'
  dataLayer: 'live' | 'demo'
  dataset: 'development' | 'holdout' | null
  processingStatus: 'pending' | 'processed' | 'quality_issue'
  modelStatus: 'unanalyzed' | 'demo_result' | 'batched' | 'awaiting_import' | 'pending_review' | 'completed' | 'rejected'
  selectable: boolean
  disabledReason: string | null
  activeBatchId: string | null
  roleHint: DataSourceRoleHint | null
  selectionRole: DataSourceRoleHint | null
  roleGuidance: string | null
  isDemo: boolean
}

export class ApiClientError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly requestId: string,
    public readonly occurredAt: string,
  ) {
    super(message)
  }
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const occurredAt = new Date().toISOString()
  const fallbackRequestId = `web-${Date.now().toString(36)}`
  let response: Response
  try {
    response = await fetch(path, {
      headers: { 'Content-Type': 'application/json', ...options?.headers },
      ...options,
    })
  } catch {
    throw new ApiClientError('NETWORK_UNAVAILABLE', '暂时无法连接数据服务。', fallbackRequestId, occurredAt)
  }
  const requestId = response.headers.get('x-request-id') ?? fallbackRequestId
  let responseText = ''
  try {
    responseText = await response.text()
  } catch {
    throw new ApiClientError('RESPONSE_READ_FAILED', '暂时无法读取服务响应。', requestId, occurredAt)
  }
  if (!responseText.trim()) {
    throw new ApiClientError('EMPTY_RESPONSE', '服务暂时没有返回可用数据。', requestId, occurredAt)
  }

  let payload: ApiResponse<T>
  try {
    payload = JSON.parse(responseText) as ApiResponse<T>
  } catch {
    throw new ApiClientError('INVALID_RESPONSE', '服务返回的数据格式暂时不可用。', requestId, occurredAt)
  }

  if (!payload.success) throw new ApiClientError(payload.error.code, payload.error.message, requestId, occurredAt)
  return payload.data
}

export const api = {
  getDashboard: () => request<DashboardSummary>('/api/dashboard'),
  getAutomationRuns: () => request<AutomationRun[]>('/api/automation-runs'),
  getSystemReadiness: () => request<SystemReadiness>('/api/system/readiness'),
  getValidationFlags: () => request<ValidationFlag[]>('/api/validation-flags'),
  getJobRuns: () => request<JobRun[]>('/api/job-runs'),
  getDataSources: () => request<DataSource[]>('/api/data-sources'),
  getRawItems: () => request<RawItem[]>('/api/raw-items'),
  getTrendSignals: () => request<TrendSignal[]>('/api/trend-signals'),
  getAIAnalysisRecords: () => request<AIAnalysisRecord[]>('/api/ai-analysis-records'),
  getAIAnalysisRuns: () => request<AIAnalysisRun[]>('/api/ai-analysis-runs'),
  getPendingAIBatches: () => request<AIBatch[]>('/api/ai-batches/pending'),
  getAIBatchCandidates: () => request<AIBatchCandidate[]>('/api/ai-batches/candidates'),
  createAIBatch: (itemIds: string[]) => request<AIBatch>('/api/ai-batches', { method: 'POST', body: JSON.stringify({ itemIds, provider: 'manual-doubao' }) }),
  exportAIBatch: (id: string) => request<AIBatchExport>(`/api/ai-batches/${id}/export`),
  importAIResults: (payload: { batchId: string; provider: 'manual-doubao'; model?: string | null; mode: 'manual_import'; results: unknown[]; rawModelResponse: unknown }) =>
    request<AIImportResult>('/api/ai-results/import', { method: 'POST', body: JSON.stringify(payload) }),
  reviewAIAnalysisRecord: (id: string, reviewStatus: ReviewStatus, reviewer: string, finalHumanVersion?: AIAnalysisRecord['parsedAIOutput']) =>
    request<AIAnalysisRecord>(`/api/ai-analysis-records/${id}/review`, {
      method: 'PATCH', body: JSON.stringify({ reviewStatus, reviewer, finalHumanVersion }),
    }),
  reviewTrendSignal: (id: string, reviewStatus: ReviewStatus, reviewer: string) =>
    request<TrendSignal>(`/api/trend-signals/${id}/review`, {
      method: 'PATCH', body: JSON.stringify({ reviewStatus, reviewer }),
    }),
  getProductConcepts: () => request<ProductConcept[]>('/api/product-concepts'),
  updateProductConcept: (id: string, patch: { humanScore?: number; status?: ProductConceptStatus }) =>
    request<ProductConcept>(`/api/product-concepts/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }),
  getValidationSummary: () => request<ValidationSummary>('/api/validation-summary'),
  getEvaluations: () => request<{ dataset: { version: string; itemCount: number; developmentCount: number; holdoutCount: number; disclaimer: string }; runs: EvaluationRun[] }>('/api/evaluations'),
  runDemoEvaluation: (split: 'development' | 'holdout') => request<EvaluationRun>('/api/demo/evaluations/run', { method: 'POST', body: JSON.stringify({ split }) }),
  runDemoJob: <T>(job: 'collect' | 'analyze' | 'generate-products' | 'weekly-report', body?: object) =>
    request<{ run: JobRun; result: T }>(`/api/demo/jobs/${job}`, { method: 'POST', body: JSON.stringify(body ?? {}) }),
}
