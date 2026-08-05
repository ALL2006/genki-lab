import type {
  ApiResponse,
  DashboardSummary,
  AIBatch,
  AIAnalysisRecord,
  AIAnalysisRun,
  AIResultImport,
  DataSource,
  EvaluationRun,
  JobRun,
  ProductConcept,
  ProductConceptStatus,
  RawItem,
  ReviewStatus,
  TrendSignal,
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
  getJobRuns: () => request<JobRun[]>('/api/job-runs'),
  getDataSources: () => request<DataSource[]>('/api/data-sources'),
  getRawItems: () => request<RawItem[]>('/api/raw-items'),
  getTrendSignals: () => request<TrendSignal[]>('/api/trend-signals'),
  getAIAnalysisRecords: () => request<AIAnalysisRecord[]>('/api/ai-analysis-records'),
  getAIAnalysisRuns: () => request<AIAnalysisRun[]>('/api/ai-analysis-runs'),
  getPendingAIBatches: () => request<AIBatch[]>('/api/ai-batches/pending'),
  createAIBatch: (itemIds: string[]) => request<AIBatch>('/api/ai-batches', { method: 'POST', body: JSON.stringify({ itemIds }) }),
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
