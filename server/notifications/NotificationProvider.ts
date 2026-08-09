import type { AutomationRun } from '../../shared/types.js'

export interface NotificationProvider {
  readonly name: string
  readonly configured: boolean
  sendAutomationSummary(run: AutomationRun): Promise<'sent' | 'skipped'>
}
