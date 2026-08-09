import type { AutomationRun } from '../../shared/types.js'
import type { NotificationProvider } from './NotificationProvider.js'

export class NoopNotificationProvider implements NotificationProvider {
  readonly name = 'noop'
  readonly configured = false

  async sendAutomationSummary(_run: AutomationRun): Promise<'skipped'> {
    return 'skipped'
  }
}
