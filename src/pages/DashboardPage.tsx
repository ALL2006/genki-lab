import { useCallback, useState } from 'react'
import { AlertCircle, ChevronDown, ExternalLink, RefreshCw } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import type { AIAnalysisRecord, AutomationRun, DashboardSummary, EvidenceRole, JobRun, RawItem, SystemReadiness, TrendSignal } from '../../shared/types'
import { LoadingState } from '../components/ApiState'
import { EmptyState } from '../components/EmptyState'
import { runPageFixture } from '../data/runPageFixture'
import { useApiResource } from '../hooks/useApiResource'
import { ApiClientError, api } from '../services/api'
import { formatDateTime, formatDuration } from '../utils/format'

const CACHE_KEY = 'genki-lab:run-page:last-success'

interface RunPageIssue {
  code: string
  requestId: string
  occurredAt: string
  source: string
}

interface RunPageSnapshot {
  summary: DashboardSummary
  rawItems: RawItem[]
  analysisRecords: AIAnalysisRecord[]
  trendSignals: TrendSignal[]
  automationRuns: AutomationRun[]
  readiness: SystemReadiness | null
  savedAt: string
  issues: RunPageIssue[]
  dataSource: 'live' | 'cache' | 'fixture'
}

type TaskLayerFilter = 'all' | 'live' | 'demo'

const jobTypeLabels: Record<JobRun['jobType'], string> = {
  collect: '资料采集',
  analyze: '趋势分析',
  'generate-products': '产品概念生成',
  'weekly-report': '周报生成',
}

const rawStatusLabels: Record<RawItem['status'], string> = {
  pending: '待处理',
  processed: '已处理',
  failed: '失败',
}

const qualityStatusLabels: Record<RawItem['qualityStatus'], string> = {
  good: '质量正常',
  low_quality: '质量待复核',
  rejected: '已排除',
}

const evidenceRoleLabels: Record<EvidenceRole, string> = {
  consumer_evidence: '消费者证据',
  market_evidence: '市场证据',
  background_evidence: '背景证据',
  irrelevant: '不纳入',
}

function getJobTarget(jobType: JobRun['jobType']) {
  if (jobType === 'collect') return '/data-sources?view=raw'
  if (jobType === 'analyze') return '/trends?view=analysis'
  if (jobType === 'generate-products') return '/concepts'
  return '/dashboard?view=reports'
}

function getChineseSummaryTitle(item: RawItem) {
  const summary = item.summary.replace(/\s+/g, ' ').trim()
  if (/[\u4e00-\u9fff]/.test(summary)) return summary.length > 38 ? `${summary.slice(0, 38)}…` : summary
  if (item.isDemo) return '演示资料：饮品行业信息'
  if (item.collectorType === 'configurable_list') return '品牌公开资料：产品与包装动态'
  if (item.collectorType === 'rss') return '行业研究资料：市场与消费信号'
  return '行业公开资料：饮品趋势与产品信息'
}

function readCachedSnapshot(): Omit<RunPageSnapshot, 'issues' | 'dataSource'> | null {
  try {
    const value = window.localStorage.getItem(CACHE_KEY)
    return value ? JSON.parse(value) as Omit<RunPageSnapshot, 'issues' | 'dataSource'> : null
  } catch {
    return null
  }
}

function saveCachedSnapshot(snapshot: Omit<RunPageSnapshot, 'issues' | 'dataSource'>) {
  try {
    window.localStorage.setItem(CACHE_KEY, JSON.stringify(snapshot))
  } catch {
    // Storage failure does not block the live page.
  }
}

function toIssue(cause: unknown, source: string): RunPageIssue {
  if (cause instanceof ApiClientError) {
    return { code: cause.code, requestId: cause.requestId, occurredAt: cause.occurredAt, source }
  }
  return { code: 'SERVICE_UNAVAILABLE', requestId: `web-${Date.now().toString(36)}`, occurredAt: new Date().toISOString(), source }
}

function StatusText({ status }: { status: JobRun['status'] }) {
  return <span className={`run-status run-status--${status}`}><i />{status === 'success' ? '成功' : status === 'failed' ? '失败' : '运行中'}</span>
}

export function DashboardPage() {
  const navigate = useNavigate()
  const loader = useCallback(async (): Promise<RunPageSnapshot> => {
    const cached = readCachedSnapshot()
    const forcedPartial = new URLSearchParams(window.location.search).get('uiState') === 'partial-error'
    const summaryPromise = api.getDashboard()
    const rawItemsPromise = forcedPartial
      ? Promise.reject(new ApiClientError('RAW_ITEMS_UNAVAILABLE', '原始资料接口暂时不可用。', 'ui-review-partial-001', new Date().toISOString()))
      : api.getRawItems()
    const analysisRecordsPromise = api.getAIAnalysisRecords()
    const trendSignalsPromise = api.getTrendSignals()
    const automationRunsPromise = api.getAutomationRuns()
    const readinessPromise = api.getSystemReadiness()
    const [summaryResult, rawItemsResult, analysisRecordsResult, trendSignalsResult, automationRunsResult, readinessResult] = await Promise.allSettled([
      summaryPromise,
      rawItemsPromise,
      analysisRecordsPromise,
      trendSignalsPromise,
      automationRunsPromise,
      readinessPromise,
    ])
    const issues: RunPageIssue[] = []

    if (summaryResult.status === 'rejected') issues.push(toIssue(summaryResult.reason, '运行摘要'))
    if (rawItemsResult.status === 'rejected') issues.push(toIssue(rawItemsResult.reason, '最近资料'))
    if (analysisRecordsResult.status === 'rejected') issues.push(toIssue(analysisRecordsResult.reason, '证据角色'))
    if (trendSignalsResult.status === 'rejected') issues.push(toIssue(trendSignalsResult.reason, '流程状态'))
    if (automationRunsResult.status === 'rejected') issues.push(toIssue(automationRunsResult.reason, '自动运行'))
    if (readinessResult.status === 'rejected') issues.push(toIssue(readinessResult.reason, '系统就绪状态'))

    const summary = summaryResult.status === 'fulfilled'
      ? summaryResult.value
      : cached?.summary ?? runPageFixture.summary
    const rawItems = rawItemsResult.status === 'fulfilled'
      ? rawItemsResult.value
      : cached?.rawItems ?? runPageFixture.rawItems
    const analysisRecords = analysisRecordsResult.status === 'fulfilled'
      ? analysisRecordsResult.value
      : cached?.analysisRecords ?? []
    const trendSignals = trendSignalsResult.status === 'fulfilled'
      ? trendSignalsResult.value
      : cached?.trendSignals ?? []
    const automationRuns = automationRunsResult.status === 'fulfilled'
      ? automationRunsResult.value
      : cached?.automationRuns ?? []
    const readiness = readinessResult.status === 'fulfilled'
      ? readinessResult.value
      : cached?.readiness ?? null
    const savedAt = issues.length === 0 ? new Date().toISOString() : cached?.savedAt ?? new Date().toISOString()

    if (issues.length === 0) saveCachedSnapshot({ summary, rawItems, analysisRecords, trendSignals, automationRuns, readiness, savedAt })

    return {
      summary,
      rawItems,
      analysisRecords,
      trendSignals,
      automationRuns,
      readiness,
      savedAt,
      issues,
      dataSource: issues.length === 0 ? 'live' : cached ? 'cache' : 'fixture',
    }
  }, [])

  const { data, loading, reload } = useApiResource(loader)
  const [running, setRunning] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [taskLayerFilter, setTaskLayerFilter] = useState<TaskLayerFilter>('all')

  const runJob = async (job: 'collect' | 'analyze' | 'weekly-report') => {
    setRunning(job)
    setNotice(null)
    try {
      const result = await api.runDemoJob(job)
      setNotice(`${jobTypeLabels[job]}已完成：新增 ${result.run.newCount}，重复 ${result.run.duplicateCount}，耗时 ${formatDuration(result.run.durationMs)}。`)
      await reload()
    } catch {
      setNotice('任务暂时无法执行，请稍后重试。')
    } finally {
      setRunning(null)
    }
  }

  if (loading && !data) return <div className="page-container run-page"><LoadingState label="正在读取最近运行记录…" /></div>

  const summary = data?.summary ?? runPageFixture.summary
  const rawItems = data?.rawItems ?? runPageFixture.rawItems
  const analysisRecords = data?.analysisRecords ?? []
  const trendSignals = data?.trendSignals ?? []
  const latestAutomation = data?.automationRuns[0] ?? null
  const latestRun = summary.latestRuns[0]
  const filteredRuns = summary.latestRuns.filter((run) => taskLayerFilter === 'all' || (taskLayerFilter === 'demo') === run.isDemo)
  const evidenceRoleByItem = new Map(analysisRecords.map((record) => [
    record.itemId,
    record.finalHumanVersion?.evidenceRole ?? record.parsedAIOutput.evidenceRole,
  ]))
  const flowCounts = {
    collected: rawItems.filter((item) => item.status !== 'failed').length,
    pendingAnalysis: summary.pendingLiveAnalysisCount,
    pendingReview: summary.pendingTrendCount,
    confirmed: trendSignals.filter((signal) => signal.reviewStatus === 'confirmed').length,
  }
  const pendingItems = [
    { label: '趋势待审核', detail: '确认后才可进入产品概念', count: summary.pendingTrendCount, tone: 'warning', to: '/trends' },
    { label: 'LIVE 资料待分析', detail: `已完成 ${summary.analyzedLiveCount} 条`, count: summary.pendingLiveAnalysisCount, tone: 'action', to: '/trends?view=analysis' },
    { label: '失败来源待检查', detail: '查看采集来源与错误代码', count: summary.weeklyFailed, tone: summary.weeklyFailed > 0 ? 'danger' : 'success', to: '/data-sources' },
    { label: '模型记录待复核', detail: `修改后通过 ${summary.aiModifiedApprovalCount} 条`, count: Math.max(0, summary.aiRejectedCount), tone: 'neutral', to: '/evaluation' },
  ]

  return <div className="page-container run-page">
    <header className="run-page-toolbar">
      <div><h1>运行</h1><span>最近更新：{formatDateTime(data?.savedAt ?? new Date().toISOString())}</span></div>
      <div className="run-page-actions">
        <button className="run-primary-action" disabled={running !== null} onClick={() => void runJob('collect')}>{running === 'collect' ? '采集中…' : '运行采集'}</button>
        <details className="run-more-menu">
          <summary>更多 <ChevronDown size={12} /></summary>
          <div>
            <button disabled={running !== null} onClick={() => void runJob('analyze')}>运行分析</button>
            <button disabled={running !== null} onClick={() => void runJob('weekly-report')}>生成周报</button>
            <button onClick={() => setNotice('任务配置由服务端环境变量与调度器管理。')}>查看任务配置</button>
          </div>
        </details>
      </div>
    </header>

    <nav className="run-flow-status" aria-label="当前流程状态">
      <span>采集完成 <strong>{flowCounts.collected}</strong></span><i>→</i>
      <span>待分析 <strong>{flowCounts.pendingAnalysis}</strong></span><i>→</i>
      <span>待审核 <strong>{flowCounts.pendingReview}</strong></span><i>→</i>
      <span>已确认 <strong>{flowCounts.confirmed}</strong></span>
    </nav>

    <section className="run-automation-strip" aria-label="自动化状态">
      <div><span>最近自动运行</span><strong>{latestAutomation ? formatDateTime(latestAutomation.startedAt) : '暂无记录'}</strong></div>
      <div><span>下次触发</span><strong>由妙搭定时任务触发</strong></div>
      <div><span>自动化配置</span><strong>{data?.readiness?.automationSecretConfigured && data.readiness.liveCollection ? '已配置' : '未配置'}</strong></div>
    </section>

    {data && data.issues.length > 0 && <section className="run-partial-notice" role="status">
      <AlertCircle size={15} />
      <div><strong>部分运行数据暂时无法更新</strong><span>正在显示上次成功保存的数据。</span></div>
      <button onClick={() => void reload()}><RefreshCw size={12} />重试</button>
      <details><summary>查看技术详情</summary><div>{data.issues.map((issue) => <dl key={`${issue.source}-${issue.requestId}`}>
        <div><dt>错误代码</dt><dd>{issue.code}</dd></div>
        <div><dt>请求编号</dt><dd>{issue.requestId}</dd></div>
        <div><dt>发生时间</dt><dd>{formatDateTime(issue.occurredAt)}</dd></div>
      </dl>)}</div></details>
    </section>}

    {notice && <div className="run-inline-notice">{notice}</div>}

    <section className="run-metric-strip" aria-label="运行指标">
      <div><span>LIVE 资料</span><strong>{summary.liveItemCount}</strong></div>
      <div><span>本轮获取</span><strong>{latestRun?.fetchedCount ?? 0}</strong></div>
      <div><span>本轮新增</span><strong>{latestRun?.newCount ?? 0}</strong></div>
      <div><span>重复</span><strong>{latestRun?.duplicateCount ?? 0}</strong></div>
      <div><span>失败</span><strong>{latestRun?.failedCount ?? 0}</strong></div>
      <div><span>待审趋势</span><strong>{summary.pendingTrendCount}</strong></div>
      <small>{data?.dataSource === 'fixture' ? 'DEMO Fixture' : data?.dataSource === 'cache' ? '已保存快照' : '实时接口'}</small>
    </section>

    <div className="run-main-grid">
      <section className="run-table-section">
        <div className="run-section-heading">
          <h2>最近任务</h2><span>{filteredRuns.length} / {summary.latestRuns.length} 条记录</span>
          <div className="run-layer-filter" aria-label="按数据层筛选任务">
            {(['all', 'live', 'demo'] as const).map((filter) => <button
              className={taskLayerFilter === filter ? 'is-active' : ''}
              key={filter}
              type="button"
              onClick={() => setTaskLayerFilter(filter)}
            >{filter === 'all' ? '全部' : filter.toUpperCase()}</button>)}
          </div>
        </div>
        {filteredRuns.length === 0 ? <EmptyState compact title="当前筛选下暂无任务记录" /> : <div className="run-table-scroll"><table className="run-data-table run-jobs-table">
          <thead><tr><th>开始时间</th><th>任务</th><th>数据层</th><th>来源</th><th>获取</th><th>新增</th><th>重复</th><th>失败</th><th>耗时</th><th>状态</th></tr></thead>
          <tbody>{filteredRuns.slice(0, 7).map((run) => <tr
            aria-label={`查看${jobTypeLabels[run.jobType]}相关页面`}
            key={run.id}
            tabIndex={0}
            onClick={() => navigate(getJobTarget(run.jobType))}
            onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') navigate(getJobTarget(run.jobType)) }}
          >
            <td>{formatDateTime(run.startedAt)}</td>
            <td><strong>{jobTypeLabels[run.jobType]}</strong><small>{run.jobType}</small></td>
            <td><span className="run-layer-label"><i className={run.isDemo ? 'is-demo' : 'is-live'} />{run.isDemo ? 'DEMO' : 'LIVE'}</span></td>
            <td className="run-cell-clip">{run.sourceId ?? 'SYSTEM'}</td>
            <td>{run.fetchedCount}</td><td>{run.newCount}</td><td>{run.duplicateCount}</td><td className={run.failedCount > 0 ? 'run-cell-danger' : ''}>{run.failedCount}</td>
            <td>{formatDuration(run.durationMs)}</td><td><StatusText status={run.status} /></td>
          </tr>)}</tbody>
        </table></div>}
      </section>

      <aside className="run-pending-section">
        <div className="run-section-heading"><h2>待处理事项</h2><span>{pendingItems.filter((item) => item.count > 0).length} 项</span></div>
        <div className="run-pending-list">{pendingItems.map((item) => <div
          aria-label={`${item.label}，${item.count}项`}
          key={item.label}
          role="link"
          tabIndex={0}
          onClick={() => navigate(item.to)}
          onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') navigate(item.to) }}
        >
          <i className={`run-pending-dot run-pending-dot--${item.tone}`} />
          <span><strong>{item.label}</strong><small>{item.detail}</small></span>
          <b>{item.count}</b>
        </div>)}</div>
      </aside>
    </div>

    <section className="run-materials-section">
      <div className="run-section-heading"><h2>最近新增资料</h2><span>{rawItems.length} 条记录 · LIVE / DEMO 在行内标记</span></div>
      {rawItems.length === 0 ? <EmptyState compact title="暂无新增资料" /> : <div className="run-table-scroll"><table className="run-data-table run-materials-table">
        <thead><tr><th>获取时间</th><th>资料摘要</th><th>来源</th><th>数据层</th><th>证据角色</th><th>质量</th><th>处理状态</th><th /></tr></thead>
        <tbody>{rawItems.slice(0, 5).map((item) => <tr key={item.id}>
          <td>{formatDateTime(item.fetchedAt)}</td>
          <td className="run-material-title"><strong>{getChineseSummaryTitle(item)}</strong><small title={item.title}>{item.title}</small></td>
          <td className="run-cell-clip">{item.sourceId}</td>
          <td><span className="run-layer-label"><i className={item.isDemo ? 'is-demo' : 'is-live'} />{item.isDemo ? 'DEMO' : 'LIVE'}</span></td>
          <td>{evidenceRoleByItem.has(item.id) ? evidenceRoleLabels[evidenceRoleByItem.get(item.id)!] : '待分析'}</td>
          <td>{qualityStatusLabels[item.qualityStatus]}</td><td>{rawStatusLabels[item.status]}</td>
          <td><a href={item.originalUrl} target="_blank" rel="noreferrer" aria-label={`打开 ${item.title}`}><ExternalLink size={12} /></a></td>
        </tr>)}</tbody>
      </table></div>}
    </section>
  </div>
}
