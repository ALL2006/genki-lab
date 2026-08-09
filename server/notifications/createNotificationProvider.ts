import { FeishuWebhookNotificationProvider } from './FeishuWebhookNotificationProvider.js'
import { NoopNotificationProvider } from './NoopNotificationProvider.js'

export function createNotificationProvider(webhookUrl: string) {
  return webhookUrl.trim()
    ? new FeishuWebhookNotificationProvider(webhookUrl.trim())
    : new NoopNotificationProvider()
}
