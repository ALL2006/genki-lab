import { useCallback } from 'react'
import { GitCompareArrows, MessageSquareWarning, RefreshCw, ShoppingBag, Users } from 'lucide-react'
import { ErrorState, LoadingState } from '../components/ApiState'
import { DemoDataBanner } from '../components/DemoDataBanner'
import { MetricCard } from '../components/MetricCard'
import { PageTitle } from '../components/PageTitle'
import { SectionCard } from '../components/SectionCard'
import { useApiResource } from '../hooks/useApiResource'
import { api } from '../services/api'

export function ValidationPage() {
  const loader = useCallback(() => api.getValidationSummary(), [])
  const { data, loading, error, reload } = useApiResource(loader)

  return (
    <div className="page-container">
      <PageTitle eyebrow="USER VALIDATION" title="用户验证" description="当前展示服务器端保存的模拟反馈与 V1/V2 归纳结构。" actions={<button className="secondary-button" onClick={() => void reload()}><RefreshCw size={16} />刷新</button>} />
      <DemoDataBanner>本页全部为模拟用户反馈，不得写入“真实用户验证”或作为市场结论。</DemoDataBanner>
      {loading && <LoadingState />}
      {error && <ErrorState message={error} onRetry={() => void reload()} />}
      {data && (
        <>
          <div className="metric-grid metric-grid--validation">
            <MetricCard label="模拟反馈数量" value={data.responseCount} hint="仅用于演示数据回流" icon={Users} />
            <MetricCard label="购买意愿" value={`${data.averagePurchaseIntent}%`} hint="5 分量表换算" icon={ShoppingBag} />
            <MetricCard label="拒绝原因类型" value={data.rejectionReasons.length} hint="结构化多选标签" icon={MessageSquareWarning} />
          </div>
          <div className="validation-grid">
            <SectionCard title="主要拒绝原因" description="模拟反馈的标签计数。" icon={MessageSquareWarning}>
              <div className="reason-bars">{data.rejectionReasons.map((reason) => <div key={reason.label}><span>{reason.label}</span><i style={{ width: `${Math.max(12, reason.count * 28)}%` }} /><strong>{reason.count}</strong></div>)}</div>
            </SectionCard>
            <SectionCard title="版本对比" description="V1/V2 的模拟购买意愿与场景匹配。" icon={GitCompareArrows}>
              <div className="version-comparison">{data.versionComparison.map((version) => <div key={version.version}><strong>{version.version}</strong><span>购买意愿 {version.purchaseIntent}%</span><span>场景匹配 {version.sceneMatch}%</span></div>)}</div>
            </SectionCard>
          </div>
          <div className="iteration-grid">
            <section><span>KEEP / 保留</span>{data.keep.map((item) => <strong key={item}>{item}</strong>)}</section>
            <section><span>MODIFY / 修改</span>{data.modify.map((item) => <strong key={item}>{item}</strong>)}</section>
            <section><span>ELIMINATE / 淘汰</span>{data.eliminate.map((item) => <strong key={item}>{item}</strong>)}</section>
          </div>
        </>
      )}
    </div>
  )
}
