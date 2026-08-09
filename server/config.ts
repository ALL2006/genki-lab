import { resolve } from 'node:path'
import type { AIProviderName } from '../shared/types.js'
import { DataPathResolver } from './storage/DataPathResolver.js'

export interface AppConfig {
  port: number
  dataDir: string
  jobSecret: string
  mockDbPath: string
  enableDemoActions: boolean
  enableLiveCollection: boolean
  liveCollectionUserAgent: string
  liveCollectionTimeoutMs: number
  liveCollectionMaxRetries: number
  liveCollectionRequestIntervalMs: number
  aiProvider: AIProviderName
  arkApiKey: string
  arkModelId: string
  arkBaseUrl: string
  arkTimeoutMs: number
  arkMaxRetries: number
  aiImportSecret: string
  aiBatchCallbackUrl: string
  automationSecret: string
  automationStaleMs: number
  feishuNotificationWebhook: string
  enableHoldoutEvaluation: boolean
  evaluationDatasetPath: string
  evaluationSplitPath: string
}

export function getConfig(overrides: Partial<AppConfig> = {}): AppConfig {
  const dataPaths = new DataPathResolver(overrides.dataDir ?? process.env.DATA_DIR ?? 'data')
  return {
    port: Number(process.env.PORT ?? 8787),
    dataDir: dataPaths.dataDir,
    jobSecret: process.env.X_JOB_SECRET ?? 'local-demo-secret-change-me',
    mockDbPath: overrides.mockDbPath ?? dataPaths.resolve('mock-db.json'),
    enableDemoActions: process.env.ENABLE_DEMO_ACTIONS !== 'false',
    enableLiveCollection: process.env.ENABLE_LIVE_COLLECTION === 'true',
    liveCollectionUserAgent: process.env.LIVE_COLLECTION_USER_AGENT ?? 'GENKI-LAB/0.2 (+https://example.invalid/contact)',
    liveCollectionTimeoutMs: Number(process.env.LIVE_COLLECTION_TIMEOUT_MS ?? 10_000),
    liveCollectionMaxRetries: Number(process.env.LIVE_COLLECTION_MAX_RETRIES ?? 2),
    liveCollectionRequestIntervalMs: Number(process.env.LIVE_COLLECTION_REQUEST_INTERVAL_MS ?? 1_000),
    aiProvider: (process.env.AI_PROVIDER ?? 'mock') as AIProviderName,
    arkApiKey: process.env.ARK_API_KEY ?? '',
    arkModelId: process.env.ARK_MODEL_ID ?? '',
    arkBaseUrl: process.env.ARK_BASE_URL ?? 'https://ark.cn-beijing.volces.com/api/v3',
    arkTimeoutMs: Number(process.env.ARK_TIMEOUT_MS ?? 30_000),
    arkMaxRetries: Number(process.env.ARK_MAX_RETRIES ?? 2),
    aiImportSecret: process.env.AI_IMPORT_SECRET ?? 'local-ai-import-secret-change-me',
    aiBatchCallbackUrl: process.env.AI_BATCH_CALLBACK_URL ?? '',
    automationSecret: process.env.X_AUTOMATION_SECRET ?? 'local-automation-secret-change-me',
    automationStaleMs: Number(process.env.AUTOMATION_STALE_MS ?? 30 * 60 * 1000),
    feishuNotificationWebhook: process.env.FEISHU_NOTIFICATION_WEBHOOK ?? '',
    enableHoldoutEvaluation: process.env.ENABLE_HOLDOUT_EVALUATION === 'true',
    evaluationDatasetPath: resolve(process.env.EVALUATION_DATASET_PATH ?? 'data/evaluation/consumer-comments-v1.json'),
    evaluationSplitPath: resolve(process.env.EVALUATION_SPLIT_PATH ?? 'data/evaluation/split-v1.json'),
    ...overrides,
  }
}
