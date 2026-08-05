import { AlertTriangle, LoaderCircle, RefreshCw } from 'lucide-react'

export function LoadingState({ label = '正在读取 API…' }: { label?: string }) {
  return <div className="api-state"><LoaderCircle className="spin" size={22} /><span>{label}</span></div>
}

export function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="api-state api-state--error">
      <AlertTriangle size={22} />
      <div><strong>数据读取失败</strong><span>{message}</span></div>
      <button className="secondary-button" onClick={onRetry}><RefreshCw size={15} />重试</button>
    </div>
  )
}
