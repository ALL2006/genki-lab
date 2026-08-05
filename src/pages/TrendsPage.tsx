import { useCallback, useMemo, useState } from 'react'
import { ExternalLink, RefreshCw, ShieldCheck } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import type { AIAnalysisRecord, ReviewStatus, TrendSignal } from '../../shared/types'
import { ErrorState, LoadingState } from '../components/ApiState'
import { DemoDataBanner } from '../components/DemoDataBanner'
import { EmptyState } from '../components/EmptyState'
import { PageTitle } from '../components/PageTitle'
import { StatusBadge } from '../components/StatusBadge'
import { useApiResource } from '../hooks/useApiResource'
import { api } from '../services/api'

type TrendSelection = { kind: 'signal' | 'analysis'; id: string }

function SignalDetail({ signal }: { signal: TrendSignal }) {
  return <>
    <div className="trend-detail__header">
      <div><span>{signal.signalType} · {signal.isDemo ? 'DEMO' : 'LIVE'}</span><h2>{signal.trendName}</h2><small>{signal.id}</small></div>
      <div className="trend-confidence"><strong>{Math.round(signal.confidence * 100)}%</strong><span>置信度</span></div>
    </div>
    <p className="trend-detail__summary">该趋势由 {signal.sourceItemIds.length} 条资料支持，当前审核状态为 {signal.reviewStatus}。</p>
    <dl className="trend-field-list">
      <div><dt>品牌 / 品类</dt><dd>{signal.brand} · {signal.productCategory}</dd></div>
      <div><dt>口味信号</dt><dd>{signal.flavors.join(' / ') || '未提及'}</dd></div>
      <div><dt>消费需求</dt><dd>{signal.consumerNeeds.join(' / ') || '未提及'}</dd></div>
      <div><dt>使用场景</dt><dd>{signal.scenes.join(' / ') || '未提及'}</dd></div>
      <div><dt>情绪</dt><dd>{signal.sentiment}</dd></div>
    </dl>
    <div className="trend-risk-block"><span>风险提示</span><p>{signal.risk}</p></div>
  </>
}

function AnalysisDetail({ record, title }: { record: AIAnalysisRecord; title: string }) {
  const output = record.finalHumanVersion ?? record.parsedAIOutput
  return <>
    <div className="trend-detail__header">
      <div><span>{output.evidenceRole} · {record.mode}</span><h2>{title}</h2><small>{record.provider} · {record.model ?? '无模型编号'}</small></div>
      <div className="trend-confidence"><strong>{Math.round(output.confidence * 100)}%</strong><span>置信度</span></div>
    </div>
    <p className="trend-detail__summary">相关性 {Math.round(output.relevanceScore * 100)}%：{output.relevanceReason}</p>
    <dl className="trend-field-list">
      <div><dt>口味标记</dt><dd>{output.flavors.join(' / ') || '未提及'}</dd></div>
      <div><dt>消费需求</dt><dd>{output.consumerNeeds.join(' / ') || '未提及'}</dd></div>
      <div><dt>使用场景</dt><dd>{output.scenes.join(' / ') || '未提及'}</dd></div>
      <div><dt>正向信号</dt><dd>{output.positiveSignals.join(' / ') || '无'}</dd></div>
      <div><dt>负向信号</dt><dd>{output.negativeSignals.join(' / ') || '无'}</dd></div>
    </dl>
    <div className="trend-risk-block"><span>概念生成资格</span><p>{output.eligibleForConceptGeneration ? '可以进入候选概念，但仍需人工确认。' : '证据不足，暂不进入候选概念。'}</p></div>
  </>
}

export function TrendsPage() {
  const location = useLocation()
  const requestedAnalysisId = new URLSearchParams(location.search).get('analysisRecordId')
  const loader = useCallback(async () => {
    const [signals, rawItems, analysisRecords, analysisRuns] = await Promise.all([api.getTrendSignals(), api.getRawItems(), api.getAIAnalysisRecords(), api.getAIAnalysisRuns()])
    return { signals, rawItems, analysisRecords, analysisRuns }
  }, [])
  const { data, loading, error, reload } = useApiResource(loader)
  const [selection, setSelection] = useState<TrendSelection | null>(null)
  const [updating, setUpdating] = useState<string | null>(null)
  const rawById = useMemo(() => new Map(data?.rawItems.map((item) => [item.id, item]) ?? []), [data])

  const fallbackSelection: TrendSelection | null = requestedAnalysisId && data?.analysisRecords.some((record) => record.id === requestedAnalysisId)
    ? { kind: 'analysis', id: requestedAnalysisId }
    : data?.signals[0]
    ? { kind: 'signal', id: data.signals[0].id }
    : data?.analysisRecords[0]
      ? { kind: 'analysis', id: data.analysisRecords[0].id }
      : null
  const activeSelection = selection ?? fallbackSelection
  const activeSignal = activeSelection?.kind === 'signal' ? data?.signals.find((item) => item.id === activeSelection.id) : undefined
  const activeRecord = activeSelection?.kind === 'analysis' ? data?.analysisRecords.find((item) => item.id === activeSelection.id) : undefined
  const activeOutput = activeRecord ? activeRecord.finalHumanVersion ?? activeRecord.parsedAIOutput : null
  const activeRaw = activeRecord ? rawById.get(activeRecord.itemId) : undefined
  const evidence = activeSignal?.evidence.map((item) => ({ id: item.sourceItemId, quote: item.quote, supports: '趋势判断', raw: rawById.get(item.sourceItemId) }))
    ?? activeOutput?.evidenceQuotes.map((item, index) => ({ id: `${activeRecord?.itemId}-${index + 1}`, quote: item.quote, supports: item.supports, raw: activeRaw }))
    ?? []
  const reviewStatus = activeSignal?.reviewStatus ?? activeRecord?.reviewStatus ?? 'pending'

  const reviewActive = async (reviewStatusValue: ReviewStatus) => {
    if (!activeSelection) return
    setUpdating(activeSelection.id)
    try {
      if (activeSelection.kind === 'signal') {
        await api.reviewTrendSignal(activeSelection.id, reviewStatusValue, '复赛演示审核员')
      } else {
        await api.reviewAIAnalysisRecord(activeSelection.id, reviewStatusValue, '复赛演示审核员', reviewStatusValue === 'confirmed' ? activeRecord?.parsedAIOutput : undefined)
      }
      await reload()
    } finally {
      setUpdating(null)
    }
  }

  return <div className="page-container workspace-page trends-page">
    <PageTitle
      eyebrow="TRENDS / 证据与审核"
      title="趋势"
      description="左侧选择记录，中间查看判断，右侧核对逐字证据并完成人工审核。"
      actions={<button className="secondary-button" onClick={() => void reload()}><RefreshCw size={14} />刷新数据</button>}
    />
    <DemoDataBanner>公开资料不等于消费者偏好；Schema 和逐字引文通过后仍需人工确认。</DemoDataBanner>
    {loading && <LoadingState />}
    {error && <ErrorState message={error} onRetry={() => void reload()} />}

    {data && <div className="trend-workspace">
      <aside className="workspace-panel trend-index-panel">
        <div className="workspace-panel__header"><div className="workspace-panel__title"><h2>趋势列表</h2><span>{data.signals.length + data.analysisRecords.length}</span></div></div>
        <div className="trend-index-section">
          <div className="trend-index-section__label"><span>趋势信号</span><strong>{data.signals.length}</strong></div>
          {data.signals.slice(0, 12).map((signal) => <button key={signal.id} className={activeSignal?.id === signal.id ? 'is-active' : ''} onClick={() => setSelection({ kind: 'signal', id: signal.id })}>
            <span><strong>{signal.trendName}</strong><small>{signal.flavors.slice(0, 2).join(' / ') || signal.signalType}</small></span>
            <StatusBadge tone={signal.reviewStatus === 'confirmed' ? 'success' : signal.reviewStatus === 'rejected' ? 'warning' : 'neutral'}>{signal.reviewStatus}</StatusBadge>
          </button>)}
        </div>
        <div className="trend-index-section">
          <div className="trend-index-section__label"><span>模型证据记录</span><strong>{data.analysisRecords.length}</strong></div>
          {data.analysisRecords.slice(0, 8).map((record) => <button key={record.id} className={activeRecord?.id === record.id ? 'is-active' : ''} onClick={() => setSelection({ kind: 'analysis', id: record.id })}>
            <span><strong>{rawById.get(record.itemId)?.title ?? record.itemId}</strong><small>{record.provider} · {record.mode}</small></span>
            <StatusBadge tone={record.isDemo ? 'warning' : 'accent'}>{record.isDemo ? 'DEMO' : 'LIVE'}</StatusBadge>
          </button>)}
        </div>
      </aside>

      <section className="workspace-panel trend-detail-panel">
        <div className="workspace-panel__header"><div className="workspace-panel__title"><h2>趋势详情</h2><span>{activeSelection?.kind === 'analysis' ? '模型记录' : '趋势信号'}</span></div><StatusBadge tone={reviewStatus === 'confirmed' ? 'success' : reviewStatus === 'rejected' ? 'warning' : 'neutral'}>{reviewStatus}</StatusBadge></div>
        <div className="trend-detail__body">
          {activeSignal && <SignalDetail signal={activeSignal} />}
          {activeRecord && <AnalysisDetail record={activeRecord} title={activeRaw?.title ?? activeRecord.itemId} />}
          {!activeSignal && !activeRecord && <EmptyState compact title="请选择一条趋势记录" />}
        </div>
      </section>

      <aside className="workspace-panel trend-evidence-panel">
        <div className="workspace-panel__header"><div className="workspace-panel__title"><h2>证据与审核</h2><span>{evidence.length} 条引文</span></div></div>
        <div className="trend-evidence-list">
          {evidence.length === 0 ? <EmptyState compact title="暂无逐字证据" /> : evidence.map((item) => <article key={item.id}>
            <div><code>{item.id}</code><span>{item.supports}</span></div>
            <p>{item.quote}</p>
            {item.raw && <a href={item.raw.originalUrl} target="_blank" rel="noreferrer">打开原始资料 <ExternalLink size={12} /></a>}
          </article>)}
        </div>
        <div className="trend-review-box">
          <div><ShieldCheck size={14} /><span>人工审核</span><StatusBadge tone={reviewStatus === 'confirmed' ? 'success' : reviewStatus === 'rejected' ? 'warning' : 'neutral'}>{reviewStatus}</StatusBadge></div>
          <p>确认只代表证据与当前判断一致，不代表市场验证完成。</p>
          <div className="trend-review-actions">
            <button disabled={!activeSelection || updating === activeSelection.id} onClick={() => void reviewActive('confirmed')}>确认</button>
            <button disabled={!activeSelection || updating === activeSelection.id} className="secondary-button" onClick={() => void reviewActive('needs_revision')}>需修订</button>
            <button disabled={!activeSelection || updating === activeSelection.id} className="danger-button" onClick={() => void reviewActive('rejected')}>拒绝</button>
          </div>
        </div>
      </aside>
    </div>}
  </div>
}
