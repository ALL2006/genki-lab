import { randomUUID } from 'node:crypto'
import { performance } from 'node:perf_hooks'
import type { AutomationRun, AutomationTriggerType, CollectionSourceResult } from '../../shared/types.js'
import type { NotificationProvider } from '../notifications/NotificationProvider.js'
import type { DataRepository } from '../repositories/DataRepository.js'
import type { AIAnalysisService } from './AIAnalysisService.js'
import type { JobService } from './JobService.js'

export interface DailyAutomationOptions {
  triggerType?: AutomationTriggerType
  idempotencyKey?: string | null
  maxSources?: number
}

export interface DailyAutomationResponse {
  success: boolean
  skipped?: boolean
  reason?: 'automation_already_running' | 'idempotency_key_replayed'
  automationRunId: string
  status: AutomationRun['status']
  collection: { sources: number; fetched: number; new: number; duplicates: number; failed: number }
  analysis: { status: AutomationRun['analysisStatus']; pendingItems: number; createdBatches: number }
  durationMs: number
}

const terminalResponse = (
  run: AutomationRun,
  skipped = false,
  reason?: DailyAutomationResponse['reason'],
): DailyAutomationResponse => ({
  success: run.status === 'success' || run.status === 'partial_success' || skipped,
  skipped: skipped || undefined,
  reason,
  automationRunId: run.id,
  status: run.status,
  collection: {
    sources: run.sourceCount,
    fetched: run.fetchedCount,
    new: run.newCount,
    duplicates: run.duplicateCount,
    failed: run.failedCount,
  },
  analysis: {
    status: run.analysisStatus,
    pendingItems: run.analysisPendingCount,
    createdBatches: run.analysisBatchIds.length,
  },
  durationMs: run.durationMs,
})

export class DailyAutomationOrchestrator {
  constructor(
    private readonly repository: DataRepository,
    private readonly jobs: JobService,
    private readonly aiAnalysis: AIAnalysisService,
    private readonly notification: NotificationProvider,
    private readonly automaticProviderReady: boolean,
    private readonly staleAfterMs: number,
  ) {}

  async dryRun() {
    const sources = (await this.repository.getDataSources())
      .filter((source) => source.enabled && source.collectionMode === 'live')
    return {
      dryRun: true,
      sources: sources.map((source) => ({ id: source.id, name: source.name, healthStatus: source.healthStatus ?? 'healthy' })),
      provider: this.aiAnalysis.getProviderInfo(),
      automaticProviderReady: this.automaticProviderReady,
      nextAction: sources.length === 0
        ? 'no_enabled_live_sources'
        : this.automaticProviderReady ? 'collect_then_execute_ai' : 'collect_then_create_pending_manual_batch',
    }
  }

  async run(options: DailyAutomationOptions = {}): Promise<DailyAutomationResponse> {
    const idempotencyKey = options.idempotencyKey?.trim() || null
    const started = performance.now()
    const run: AutomationRun = {
      id: `automation-${randomUUID()}`,
      idempotencyKey,
      triggerType: options.triggerType ?? 'manual',
      startedAt: new Date().toISOString(),
      finishedAt: null,
      status: 'running',
      collectionRunIds: [],
      analysisBatchIds: [],
      sourceCount: 0,
      fetchedCount: 0,
      newCount: 0,
      duplicateCount: 0,
      failedCount: 0,
      analysisPendingCount: 0,
      analysisCompletedCount: 0,
      analysisFailedCount: 0,
      analysisStatus: 'not_needed',
      notificationStatus: 'pending',
      errorSummary: null,
      durationMs: 0,
      isDemo: false,
    }
    const staleBefore = new Date(Date.now() - this.staleAfterMs).toISOString()
    const claim = await this.repository.claimAutomationRun(run, staleBefore)
    if (claim.outcome === 'idempotency_replayed') {
      return terminalResponse(claim.run, true, 'idempotency_key_replayed')
    }
    if (claim.outcome === 'already_running') {
      return terminalResponse(claim.run, true, 'automation_already_running')
    }

    try {
      const sources = (await this.repository.getDataSources())
        .filter((source) => source.enabled && source.collectionMode === 'live')
        .slice(0, Math.max(0, options.maxSources ?? Number.POSITIVE_INFINITY))
      run.sourceCount = sources.length
      const finalResults: CollectionSourceResult[] = []
      const newItemIds: string[] = []

      for (const source of sources) {
        let finalResult: CollectionSourceResult | null = null
        for (let attempt = 0; attempt < 2; attempt += 1) {
          const result = await this.jobs.collect({ mode: 'live', sourceIds: [source.id] })
          run.collectionRunIds.push(result.run.id)
          finalResult = result.run.sourceResults[0] ?? null
          if (result.run.status === 'success') {
            newItemIds.push(...result.result.inserted.map((item) => item.id))
            break
          }
        }
        if (finalResult) finalResults.push(finalResult)
      }

      run.fetchedCount = finalResults.reduce((sum, item) => sum + item.fetchedCount, 0)
      run.newCount = finalResults.reduce((sum, item) => sum + item.newCount, 0)
      run.duplicateCount = finalResults.reduce((sum, item) => sum + item.duplicateCount, 0)
      run.failedCount = finalResults.filter((item) => item.status === 'failed').length

      if (newItemIds.length > 0) {
        const batch = await this.aiAnalysis.createBatch(newItemIds, { manualDoubao: !this.automaticProviderReady })
        run.analysisBatchIds.push(batch.id)
        run.analysisPendingCount = newItemIds.length
        if (this.automaticProviderReady) {
          try {
            const result = await this.aiAnalysis.executeBatch(batch.id)
            run.analysisCompletedCount = result.records.length
            run.analysisPendingCount = result.dispatched ? newItemIds.length : 0
            run.analysisStatus = result.dispatched ? 'pending' : 'completed'
          } catch (error) {
            run.analysisFailedCount = newItemIds.length
            run.analysisStatus = 'failed'
            run.errorSummary = error instanceof Error ? error.message : '自动 AI 执行失败。'
          }
        } else {
          run.analysisStatus = 'pending_provider_configuration'
        }
      }

      run.status = run.failedCount > 0 || run.analysisFailedCount > 0 ? 'partial_success' : 'success'
      run.errorSummary ??= finalResults
        .filter((item) => item.status === 'failed')
        .map((item) => `${item.sourceId}: ${item.errorMessage ?? '采集失败'}`)
        .join('；') || null
    } catch (error) {
      run.status = 'failed'
      run.errorSummary = error instanceof Error ? error.message : '每日自动任务失败。'
    } finally {
      run.finishedAt = new Date().toISOString()
      run.durationMs = Math.max(1, Math.round(performance.now() - started))
      try {
        run.notificationStatus = await this.notification.sendAutomationSummary(run)
      } catch (error) {
        run.notificationStatus = 'failed'
        const notificationError = error instanceof Error ? error.message : '通知发送失败。'
        run.errorSummary = [run.errorSummary, notificationError].filter(Boolean).join('；')
        if (run.status === 'success') run.status = 'partial_success'
      }
      await this.repository.saveAutomationRun(run)
    }
    return terminalResponse(run)
  }
}
