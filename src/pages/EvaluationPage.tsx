import { useCallback, useMemo, useState } from 'react'
import { Play, RefreshCw } from 'lucide-react'
import type { EvaluationRun, SystemReadiness } from '../../shared/types'
import { ErrorState, LoadingState } from '../components/ApiState'
import { EmptyState } from '../components/EmptyState'
import { PageTitle } from '../components/PageTitle'
import { StatusBadge } from '../components/StatusBadge'
import { useApiResource } from '../hooks/useApiResource'
import { api } from '../services/api'
import { formatDateTime, formatDuration } from '../utils/format'

const percent = (value: number) => `${Math.round(value * 1000) / 10}%`

function getDifferenceRows(run: EvaluationRun) {
  const metrics = run.metrics
  return [
    { scope: run.split, dimension: '逐字引文', metric: percent(metrics.evidenceQuoteValidationRate), value: metrics.evidenceQuoteValidationRate, next: '核对原文位置' },
    { scope: run.split, dimension: '情绪标签', metric: percent(metrics.sentimentAgreementRate), value: metrics.sentimentAgreementRate, next: '抽检分歧评论' },
    { scope: run.split, dimension: '口味标签', metric: `F1 ${percent(metrics.flavor.microF1)}`, value: metrics.flavor.microF1, next: '复核漏标与误标' },
    { scope: run.split, dimension: '场景标签', metric: `F1 ${percent(metrics.scene.microF1)}`, value: metrics.scene.microF1, next: '复核场景边界' },
    { scope: run.split, dimension: '痛点标签', metric: `F1 ${percent(metrics.painPoint.microF1)}`, value: metrics.painPoint.microF1, next: '复核低频标签' },
  ]
}

function readinessLabel(value: boolean, partial = false) {
  return value ? '已配置' : partial ? '部分就绪' : '未配置'
}

export function EvaluationPage() {
  const loader = useCallback(() => api.getEvaluations(), [])
  const { data, loading, error, reload } = useApiResource(loader)
  const readinessLoader = useCallback(() => api.getSystemReadiness(), [])
  const { data: readiness } = useApiResource<SystemReadiness>(readinessLoader)
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null)
  const [running, setRunning] = useState<'development' | 'holdout' | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const activeRun = data?.runs.find((item) => item.id === selectedRunId) ?? data?.runs[0]
  const differenceRows = useMemo(() => activeRun ? getDifferenceRows(activeRun) : [], [activeRun])

  const runEvaluation = async (split: 'development' | 'holdout') => {
    setRunning(split)
    setNotice(null)
    try {
      const result = await api.runDemoEvaluation(split)
      setSelectedRunId(result.id)
      setNotice(`${split === 'development' ? '开发集' : '保留集'} Mock 回归完成。`)
      await reload()
    } catch (cause) {
      setNotice(cause instanceof Error ? cause.message : '评测运行失败。')
    } finally {
      setRunning(null)
    }
  }

  return <div className="page-container workspace-page evaluation-page">
    <PageTitle
      eyebrow="MODEL EVALUATION / 批次回归"
      title="模型评测"
      description="按固定数据集查看批次、质量指标、差异维度与人工复核边界。"
      actions={<button className="secondary-button" onClick={() => void reload()}><RefreshCw size={14} />刷新数据</button>}
    />
    <section className="system-readiness-strip" aria-label="系统状态">
      <div><span>公网部署</span><strong>{readinessLabel(false, readiness?.server)}</strong></div>
      <div><span>自动采集</span><strong>{readinessLabel(Boolean(readiness?.liveCollection && readiness?.automationSecretConfigured), Boolean(readiness?.liveCollection || readiness?.automationSecretConfigured))}</strong></div>
      <div><span>妙搭调度</span><strong>{readinessLabel(Boolean(readiness?.miaodaWebhookConfigured))}</strong></div>
      <div><span>豆包 Provider</span><strong>{readinessLabel(Boolean(readiness?.arkConfigured), Boolean(readiness?.aiImportSecretConfigured))}</strong></div>
      <div><span>通知 Webhook</span><strong>{readinessLabel(Boolean(readiness?.notificationWebhookConfigured))}</strong></div>
    </section>
    {loading && <LoadingState />}
    {error && <ErrorState message={error} onRetry={() => void reload()} />}

    {data && <>
      <div className="evaluation-toolbar workspace-panel">
        <div className="evaluation-dataset"><span>数据集</span><strong>{data.dataset.version}</strong><small>{data.dataset.itemCount} 条 · 开发 {data.dataset.developmentCount} / 保留 {data.dataset.holdoutCount}</small></div>
        <label><span>评测批次</span><select value={activeRun?.id ?? ''} onChange={(event) => setSelectedRunId(event.target.value)} disabled={data.runs.length === 0}>
          {data.runs.length === 0 && <option value="">暂无批次</option>}
          {data.runs.map((item) => <option key={item.id} value={item.id}>{item.split === 'development' ? '开发集' : '保留集'} · {item.provider} · {formatDateTime(item.startedAt)}</option>)}
        </select></label>
        <div className="evaluation-run-actions">
          <button disabled={running !== null} onClick={() => void runEvaluation('development')}><Play size={13} />{running === 'development' ? '运行中…' : '运行开发集'}</button>
          <button className="secondary-button" disabled={running !== null} onClick={() => void runEvaluation('holdout')}><Play size={13} />{running === 'holdout' ? '运行中…' : '运行保留集'}</button>
        </div>
      </div>
      {notice && <div className="inline-notice">{notice}</div>}

      {activeRun ? <>
        <div className="compact-stat-row evaluation-stat-row">
          <div className="compact-stat"><span>样本</span><strong>{activeRun.metrics.sampleCount}</strong><small>{activeRun.split === 'development' ? '开发集' : '保留集'}</small></div>
          <div className="compact-stat"><span>Schema 成功</span><strong>{percent(activeRun.metrics.jsonSchemaSuccessRate)}</strong><small>结构校验</small></div>
          <div className="compact-stat"><span>编号匹配</span><strong>{percent(activeRun.metrics.itemIdMatchRate)}</strong><small>itemId 对齐</small></div>
          <div className="compact-stat"><span>引文通过</span><strong>{percent(activeRun.metrics.evidenceQuoteValidationRate)}</strong><small>逐字引用</small></div>
          <div className="compact-stat"><span>人工修改需求</span><strong>{percent(activeRun.metrics.humanModificationRate)}</strong><small>估算口径</small></div>
          <div className="compact-stat"><span>平均耗时</span><strong>{Math.round(activeRun.metrics.averageDurationMs)} ms</strong><small>重试 {activeRun.metrics.retryCount} 次</small></div>
        </div>

        <div className="evaluation-workspace-grid">
          <section className="workspace-panel evaluation-difference-panel">
            <div className="workspace-panel__header"><div className="workspace-panel__title"><h2>差异样本队列</h2><span>{differenceRows.filter((item) => item.value < .9).length} 个需关注维度</span></div><small>现有 API 仅返回批次聚合指标</small></div>
            <div className="evaluation-api-boundary">逐样本编号、人工标签和模型标签差异尚未由当前接口返回；本表不伪造样本，只标记需要人工抽检的维度。</div>
            <table className="workspace-table evaluation-difference-table">
              <thead><tr><th>样本范围</th><th>差异维度</th><th>当前指标</th><th>复核状态</th><th>下一步</th></tr></thead>
              <tbody>{differenceRows.map((item) => <tr key={item.dimension}>
                <td><StatusBadge tone="neutral">{item.scope}</StatusBadge></td>
                <td className="cell-strong">{item.dimension}</td>
                <td>{item.metric}</td>
                <td><StatusBadge tone={item.value >= .9 ? 'success' : 'warning'}>{item.value >= .9 ? '通过阈值' : '待抽检'}</StatusBadge></td>
                <td className="cell-muted">{item.next}</td>
              </tr>)}</tbody>
            </table>
          </section>

          <section className="workspace-panel evaluation-history-panel">
            <div className="workspace-panel__header"><div className="workspace-panel__title"><h2>批次历史</h2><span>{data.runs.length}</span></div></div>
            <div className="evaluation-run-list-compact">{data.runs.length === 0 ? <EmptyState compact title="暂无评测批次" /> : data.runs.slice(0, 6).map((item) => <button key={item.id} className={item.id === activeRun.id ? 'is-active' : ''} onClick={() => setSelectedRunId(item.id)}>
              <span><strong>{item.split === 'development' ? '开发集' : '保留集'} · {item.provider}</strong><small>{formatDateTime(item.startedAt)} · {formatDuration(item.durationMs)}</small></span>
              <StatusBadge tone={item.isDemo ? 'warning' : 'success'}>{item.isDemo ? 'DEMO' : 'LIVE'}</StatusBadge>
            </button>)}</div>
            <div className="evaluation-disclaimer"><strong>评测边界</strong><p>{activeRun.disclaimer}</p></div>
          </section>
        </div>
      </> : <EmptyState title="暂无评测运行" description="可先运行开发集 Mock 回归。" />}
    </>}
  </div>
}
