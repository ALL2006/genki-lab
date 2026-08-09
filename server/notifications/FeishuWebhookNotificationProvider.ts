import type { AutomationRun } from '../../shared/types.js'
import type { NotificationProvider } from './NotificationProvider.js'

const statusLabels: Record<AutomationRun['status'], string> = {
  running: '运行中',
  success: '成功',
  partial_success: '部分成功',
  failed: '失败',
  stale_failed: '超时失败',
}

export class FeishuWebhookNotificationProvider implements NotificationProvider {
  readonly name = 'feishu-webhook'
  readonly configured = true

  constructor(private readonly webhookUrl: string) {}

  async sendAutomationSummary(run: AutomationRun): Promise<'sent'> {
    const seconds = Math.round(run.durationMs / 100) / 10
    const text = [
      'GENKI LAB · 每日采集',
      '',
      `状态：${statusLabels[run.status]}`,
      `数据源：${run.sourceCount}`,
      `获取：${run.fetchedCount}`,
      `新增：${run.newCount}`,
      `重复：${run.duplicateCount}`,
      `失败：${run.failedCount}`,
      `耗时：${seconds}s`,
      '',
      `待分析：${run.analysisPendingCount}`,
      `异常来源：${run.failedCount}`,
    ].join('\n')
    const response = await fetch(this.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ msg_type: 'text', content: { text } }),
    })
    if (!response.ok) throw new Error(`飞书通知发送失败（HTTP ${response.status}）`)
    return 'sent'
  }
}
