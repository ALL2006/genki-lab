import type { D1Database } from '../server/repositories/D1Types.js'

export interface AssetBinding { fetch(request: Request): Promise<Response> }

export interface Env {
  DB: D1Database
  ASSETS: AssetBinding
  AUTOMATION_SECRET?: string
  AI_IMPORT_SECRET?: string
  JOB_SECRET?: string
  ARK_API_KEY?: string
  ARK_MODEL_ID?: string
  ARK_BASE_URL?: string
  MIAODA_WEBHOOK_URL?: string
  FEISHU_NOTIFICATION_WEBHOOK?: string
  MAX_SOURCES_PER_AUTOMATION?: string
  MAX_FETCHES_PER_SOURCE?: string
  MAX_TOTAL_EXTERNAL_FETCHES?: string
  SOURCE_TIMEOUT_MS?: string
  MAX_RESPONSE_BYTES?: string
  AUTOMATION_STALE_MS?: string
  BUILD_VERSION?: string
}

export interface ExecutionContextLike { waitUntil(promise: Promise<unknown>): void }
export interface ScheduledControllerLike { scheduledTime: number; cron: string }
