export type DataSourceType = 'rss' | 'brand_news' | 'industry_article' | 'public_product' | 'demo'
export type RawItemStatus = 'pending' | 'processed' | 'failed'
export type ReviewStatus = 'pending' | 'confirmed' | 'needs_revision' | 'rejected'
export type ProductConceptStatus = 'candidate' | 'selected' | 'rejected'
export type JobType = 'collect' | 'analyze' | 'generate-products' | 'weekly-report'
export type JobStatus = 'running' | 'success' | 'failed'
export type CollectionMode = 'demo' | 'live'
export type CollectorType = 'mock' | 'rss' | 'generic_article' | 'configurable_list'
export type RawItemQualityStatus = 'good' | 'low_quality' | 'rejected'
export type EvidenceRole = 'consumer_evidence' | 'market_evidence' | 'background_evidence' | 'irrelevant'
export type EvidenceSignalType = 'consumer_preference' | 'product_launch' | 'category_trend' | 'safety_context' | 'other'
export type AIProviderName = 'mock' | 'ark-doubao' | 'miaoda-webhook' | 'manual-json'
export type AIAnalysisMode = 'mock' | 'api' | 'webhook' | 'manual_import'
export type AIBatchStatus = 'pending' | 'dispatched' | 'completed' | 'failed'
export type EvaluationSplit = 'development' | 'holdout'
export type DataSourceRoleHint = 'consumer_candidate' | 'market_candidate' | 'background_candidate'
export type DataSourceHealthStatus = 'healthy' | 'warning' | 'failing' | 'disabled'
export type AutomationTriggerType = 'manual' | 'miaoda' | 'local-cron' | 'cloudflare-cron' | 'test'
export type AutomationStatus = 'running' | 'success' | 'partial_success' | 'failed' | 'stale_failed'
export type NotificationStatus = 'pending' | 'sent' | 'skipped' | 'failed'
export type AnalysisValidationStatus = 'validated' | 'auto_repaired' | 'needs_review' | 'rejected'
export type ValidationMode = 'strict' | 'automated'
export type ValidationFlagType = 'quote_mismatch' | 'unsupported_claim' | 'role_conflict' | 'title_only_evidence' | 'weak_relevance' | 'possible_overgeneralization'
export type ValidationFlagSeverity = 'info' | 'warning' | 'high'
export type ValidationFlagStatus = 'open' | 'resolved' | 'dismissed'
export type ExperimentType = 'collection' | 'comment_tagging' | 'concept_generation' | 'feedback_summary' | 'video_variant'
export type ExperimentMode = 'manual' | 'ai_assisted'

export interface DataSourceCollectorConfig {
  maxItems?: number
  itemSelector?: string
  titleSelector?: string
  linkSelector?: string
  dateSelector?: string
  summarySelector?: string
  contentSelector?: string
  removeSelectors?: string[]
}

export interface DataSource {
  id: string
  name: string
  type: DataSourceType
  entryUrl: string
  crawlMethod: string
  keywords: string[]
  schedule: string
  enabled: boolean
  collectionMode: CollectionMode
  collectorType: CollectorType
  collectorConfig: DataSourceCollectorConfig | null
  lastSuccessAt: string | null
  failureCount: number
  healthStatus?: DataSourceHealthStatus
  lastFailureAt?: string | null
  consecutiveFailures?: number
  lastHttpStatus?: number | null
  lastError: string | null
  lastRunNewCount: number
  publisherName?: string
  displaySummary?: string
  roleHint?: DataSourceRoleHint
  selectionRole?: DataSourceRoleHint
  roleGuidance?: string
  notes: string
}

export interface RawItem {
  id: string
  sourceId: string
  title: string
  rawText: string
  summary: string
  publishedAt: string | null
  fetchedAt: string
  originalUrl: string
  normalizedUrl: string
  contentHash: string
  rawPayload: Record<string, unknown>
  status: RawItemStatus
  collectorType: CollectorType
  httpStatus: number | null
  contentLength: number
  qualityStatus: RawItemQualityStatus
  failureReason: string | null
  isDemo: boolean
}

export interface TrendEvidence {
  sourceItemId: string
  quote: string
}

export interface TrendSignal {
  id: string
  sourceItemIds: string[]
  trendName: string
  brand: string
  productCategory: string
  flavors: string[]
  consumerNeeds: string[]
  scenes: string[]
  sentiment: 'positive' | 'neutral' | 'negative' | 'mixed'
  signalType: 'flavor' | 'scene' | 'health' | 'competitor'
  confidence: number
  evidence: TrendEvidence[]
  risk: string
  reviewStatus: ReviewStatus
  reviewer: string | null
  reviewedAt: string | null
  isDemo: boolean
}

export interface EvidenceQuote {
  quote: string
  supports: string
}

export interface EvidenceAnalysisData {
  itemId: string
  evidenceRole: EvidenceRole
  relevanceScore: number
  relevanceReason: string
  brands: string[]
  productCategories: string[]
  flavors: string[]
  consumerNeeds: string[]
  scenes: string[]
  positiveSignals: string[]
  negativeSignals: string[]
  riskSignals: string[]
  signalType: EvidenceSignalType
  evidenceQuotes: EvidenceQuote[]
  confidence: number
  eligibleForConceptGeneration: boolean
}

export interface AIAnalysisRecord {
  id: string
  batchId: string
  itemId: string
  provider: string
  model: string | null
  mode: AIAnalysisMode
  originalAIOutput: unknown
  parsedAIOutput: EvidenceAnalysisData
  finalHumanVersion: EvidenceAnalysisData | null
  schemaValid: boolean
  quoteValid: boolean
  validationStatus?: AnalysisValidationStatus
  quoteRepairs?: QuoteRepairResult[]
  reviewStatus: ReviewStatus
  reviewer: string | null
  reviewedAt: string | null
  reviewComment: string | null
  editedFields: string[]
  isAutomated: boolean
  isDemo: boolean
  createdAt: string
}

export interface QuoteRepairResult {
  originalQuote: string
  repairedQuote: string | null
  repairMethod: 'exact' | 'normalized_unique' | 'normalized_multiple' | 'not_found'
  quoteAutoRepaired: boolean
  matchedStart: number | null
  matchedEnd: number | null
}

export interface ValidationFlag {
  id: string
  analysisRecordId: string
  type: ValidationFlagType
  severity: ValidationFlagSeverity
  message: string
  field: string | null
  status: ValidationFlagStatus
  createdAt: string
}

export interface AITokenUsage {
  inputTokens: number | null
  outputTokens: number | null
  totalTokens: number | null
}

export interface AIAnalysisRun {
  id: string
  batchId: string | null
  provider: string
  model: string | null
  mode: AIAnalysisMode
  startedAt: string
  finishedAt: string | null
  durationMs: number
  inputItemCount: number
  successCount: number
  failedCount: number
  retryCount: number
  schemaValidCount: number
  itemIdValidCount?: number
  quoteValidCount: number
  lowConfidenceCount: number
  inputCharacters: number
  outputCharacters: number
  tokenUsage: AITokenUsage | null
  estimatedCost: number | null
  errorMessage: string | null
  isAutomated: boolean
  isDemo: boolean
}

export interface AIBatch {
  id: string
  provider: AIProviderName
  model: string | null
  status: AIBatchStatus
  itemIds: string[]
  createdAt: string
  updatedAt: string
  promptVersion: string
  schemaVersion: string
  importedResultHashes: string[]
  validationMode?: ValidationMode
  validationStatus?: 'success' | 'partial_success' | 'failed'
  isDemo: boolean
}

export interface AIResultImport {
  id: string
  batchId: string
  resultHash: string
  provider: string
  model: string | null
  mode: AIAnalysisMode
  analysisIds: string[]
  importedAt: string
  isAutomated: boolean
  validationMode?: ValidationMode
  validationStatus?: 'success' | 'partial_success' | 'failed'
}

export interface TrendCandidateEvidence {
  itemId: string
  quote: string
  supports: string
}

export interface TrendCandidate {
  id: string
  trendName: string
  consumerNeed: string
  positiveEvidence: TrendCandidateEvidence[]
  counterEvidence: TrendCandidateEvidence[]
  marketEvidence: TrendCandidateEvidence[]
  backgroundEvidence: TrendCandidateEvidence[]
  targetAudience: string
  targetScenes: string[]
  opportunity: string
  risk: string
  confidence: number
  evidenceCoverageScore: number
  eligibleForConceptGeneration: boolean
  reviewStatus: ReviewStatus
  reviewer: string | null
  reviewedAt: string | null
  reviewComment: string | null
  originalAIOutput: unknown
  finalHumanVersion: Record<string, unknown> | null
  editedFields: string[]
  provider: string
  model: string | null
  isDemo: boolean
}

export interface EvaluationLabelMetrics {
  exactMatch: number
  microPrecision: number
  microRecall: number
  microF1: number
}

export interface EvaluationMetrics {
  sampleCount: number
  jsonSchemaSuccessRate: number
  itemIdMatchRate: number
  evidenceQuoteValidationRate: number
  sentimentAgreementRate: number
  flavor: EvaluationLabelMetrics
  scene: EvaluationLabelMetrics
  painPoint: EvaluationLabelMetrics
  humanModificationRate: number
  averageDurationMs: number
  failureRate: number
  retryCount: number
  lowConfidenceRate: number
}

export interface EvaluationRun {
  id: string
  provider: string
  model: string | null
  split: EvaluationSplit
  datasetVersion: string
  startedAt: string
  finishedAt: string
  durationMs: number
  metrics: EvaluationMetrics
  isDemo: boolean
  disclaimer: string
}

export interface ConsumerCommentEvaluationItem {
  id: string
  rawText: string
  platform: string | null
  brand: string | null
  product: string | null
  humanSentiment: 'positive' | 'neutral' | 'negative' | null
  humanFlavorTags: string[]
  humanSceneTags: string[]
  humanPainPointTags: string[]
  humanPurchaseIntent: string | null
  revisionNotes: string[]
  humanHealthTags?: string[]
  sourceUrl?: string | null
}

export interface ProductConcept {
  id: string
  sourceSignalIds: string[]
  productName: string
  flavorCombination: string[]
  targetAudience: string
  scenes: string[]
  valueProposition: string
  sellingPoints: string[]
  risks: string[]
  aiScore: number
  humanScore: number | null
  status: ProductConceptStatus
  isDemo: boolean
}

export interface ValidationResponse {
  id: string
  productConceptId: string
  flavorInterest: number
  packagePreference: string
  sceneMatch: number
  purchaseIntent: number
  priceAcceptance: string
  rejectionReasons: string[]
  openFeedback: string
  submittedAt: string
  isDemo: boolean
}

export interface JobRun {
  id: string
  jobType: JobType
  sourceId: string | null
  startedAt: string
  finishedAt: string | null
  status: JobStatus
  fetchedCount: number
  newCount: number
  duplicateCount: number
  processedCount: number
  failedCount: number
  errorMessage: string | null
  durationMs: number
  collectionMode: CollectionMode | null
  sourceResults: CollectionSourceResult[]
  isDemo: boolean
}

export interface CollectionSourceResult {
  sourceId: string
  status: 'success' | 'failed'
  fetchedCount: number
  newCount: number
  duplicateCount: number
  failedCount: number
  errorMessage: string | null
  durationMs: number
}

export interface AutomationRun {
  id: string
  idempotencyKey: string | null
  triggerType: AutomationTriggerType
  startedAt: string
  finishedAt: string | null
  status: AutomationStatus
  collectionRunIds: string[]
  analysisBatchIds: string[]
  sourceCount: number
  fetchedCount: number
  newCount: number
  duplicateCount: number
  failedCount: number
  analysisPendingCount: number
  analysisCompletedCount: number
  analysisFailedCount: number
  analysisStatus: 'not_needed' | 'pending_provider_configuration' | 'pending' | 'completed' | 'partial_success' | 'failed'
  notificationStatus: NotificationStatus
  errorSummary: string | null
  durationMs: number
  isDemo: boolean
}

export interface ExperimentRun {
  id: string
  experimentType: ExperimentType
  mode: ExperimentMode
  startedAt: string
  finishedAt: string | null
  durationMs: number
  sampleCount: number
  notes: string
  operator: string
}

export interface MockDatabase {
  dataSources: DataSource[]
  rawItems: RawItem[]
  trendSignals: TrendSignal[]
  productConcepts: ProductConcept[]
  validationResponses: ValidationResponse[]
  jobRuns: JobRun[]
  aiBatches: AIBatch[]
  aiAnalysisRecords: AIAnalysisRecord[]
  aiAnalysisRuns: AIAnalysisRun[]
  aiResultImports: AIResultImport[]
  trendCandidates: TrendCandidate[]
  evaluationRuns: EvaluationRun[]
  automationRuns: AutomationRun[]
  validationFlags: ValidationFlag[]
  experimentRuns: ExperimentRun[]
}

export interface ApiSuccess<T> {
  success: true
  data: T
  meta: { timestamp: string; isDemo?: boolean }
}

export interface ApiFailure {
  success: false
  error: { code: string; message: string; details?: unknown }
  meta: { timestamp: string }
}

export type ApiResponse<T> = ApiSuccess<T> | ApiFailure

export interface DashboardSummary {
  weeklyFetched: number
  weeklyNew: number
  weeklyDuplicate: number
  weeklyFailed: number
  liveItemCount: number
  demoItemCount: number
  successRate: number
  pendingTrendCount: number
  productCount: number
  pendingLiveAnalysisCount: number
  analyzedLiveCount: number
  aiCallSuccessRate: number
  schemaSuccessRate: number
  quoteValidationRate: number
  humanModificationRate: number
  aiDirectApprovalCount: number
  aiModifiedApprovalCount: number
  aiRejectedCount: number
  aiEditedFieldCount: number
  averageAnalysisDurationMs: number
  recentAIError: string | null
  latestRuns: JobRun[]
  failedRuns: JobRun[]
  latestAutomationRun?: AutomationRun | null
  automationConfigured?: boolean
  isDemo: boolean
}

export interface SystemReadiness {
  server: boolean
  repository: boolean
  liveCollection: boolean
  automationSecretConfigured: boolean
  miaodaWebhookConfigured: boolean
  arkConfigured: boolean
  aiImportSecretConfigured: boolean
  dataDirectoryWritable: boolean
  notificationWebhookConfigured: boolean
  overall: 'ready' | 'partially_ready' | 'blocked'
  runtime?: 'node' | 'cloudflare-workers'
  repositoryType?: 'json' | 'd1'
  d1Configured?: boolean
  d1Writable?: boolean
  staticAssetsReady?: boolean
  cronConfigured?: boolean
  miaodaConfigured?: boolean
  notificationConfigured?: boolean
  filesystemPersistence?: boolean
  databasePersistence?: boolean
}

export interface ValidationSummary {
  responseCount: number
  averagePurchaseIntent: number
  rejectionReasons: Array<{ label: string; count: number }>
  versionComparison: Array<{ version: string; purchaseIntent: number; sceneMatch: number }>
  keep: string[]
  modify: string[]
  eliminate: string[]
  isDemo: boolean
}
