export function formatDateTime(value: string | null) {
  if (!value) return '—'
  return new Intl.DateTimeFormat('zh-CN', { dateStyle: 'short', timeStyle: 'medium' }).format(new Date(value))
}

export function formatDuration(value: number) {
  return value < 1000 ? `${value} ms` : `${(value / 1000).toFixed(2)} s`
}
