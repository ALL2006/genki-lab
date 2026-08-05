import { useCallback, useState } from 'react'
import { DatabaseZap, Play, RefreshCw } from 'lucide-react'
import { ErrorState, LoadingState } from '../components/ApiState'
import { DemoDataBanner } from '../components/DemoDataBanner'
import { EmptyState } from '../components/EmptyState'
import { PageTitle } from '../components/PageTitle'
import { StatusBadge } from '../components/StatusBadge'
import { useApiResource } from '../hooks/useApiResource'
import { api } from '../services/api'
import { formatDateTime } from '../utils/format'

export function DataSourcesPage() {
  const loader = useCallback(async () => {
    const [sources, rawItems] = await Promise.all([api.getDataSources(), api.getRawItems()])
    return { sources, rawItems }
  }, [])
  const { data, loading, error, reload } = useApiResource(loader)
  const [runningId, setRunningId] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const runSource = async (sourceId: string, mode: 'demo' | 'live') => {
    setRunningId(sourceId)
    setNotice(null)
    try {
      const { run } = await api.runDemoJob('collect', { mode, sourceIds: [sourceId] })
      setNotice(`${mode.toUpperCase()} 采集${run.status === 'success' ? '完成' : '失败'}：获取 ${run.fetchedCount}，新增 ${run.newCount}，重复 ${run.duplicateCount}，失败 ${run.failedCount}。${run.errorMessage ? ` ${run.errorMessage}` : ''}`)
      await reload()
    } catch (cause) {
      setNotice(cause instanceof Error ? cause.message : '数据源运行失败。')
    } finally {
      setRunningId(null)
    }
  }

  return (
    <div className="page-container">
      <PageTitle eyebrow="DATA SOURCES" title="数据源" description="查看采集入口、运行方式、启用状态与失败计数。" actions={<button className="secondary-button" onClick={() => void reload()}><RefreshCw size={16} />刷新</button>} />
      <DemoDataBanner>DEMO 与 LIVE 资料并存并分别标注。LIVE 只读取无需登录的公开页面，是否可运行还受服务端 ENABLE_LIVE_COLLECTION 开关控制。</DemoDataBanner>
      {notice && <div className="inline-notice">{notice}</div>}
      {loading && <LoadingState />}
      {error && <ErrorState message={error} onRetry={() => void reload()} />}
      {data?.sources.length === 0 && <EmptyState title="暂无数据源" />}
      {data && data.sources.length > 0 && (
        <div className="source-table-shell">
          <div className="source-table source-table--header">
            <span>数据源</span><span>类型 / 方式</span><span>运行状态</span><span>最近成功</span><span>操作</span>
          </div>
          {data.sources.map((source) => (
            <article className="source-table" key={source.id}>
              <div><strong>{source.name}</strong><a href={source.entryUrl} target="_blank" rel="noreferrer">{source.entryUrl}</a><small>{source.notes}</small></div>
              <div><div className="badge-row"><StatusBadge tone={source.collectionMode === 'live' ? 'accent' : 'neutral'}>{source.collectionMode.toUpperCase()}</StatusBadge><StatusBadge>{source.type}</StatusBadge></div><span>{source.collectorType}</span><small>{source.schedule}</small></div>
              <div><StatusBadge tone={source.enabled ? 'success' : 'neutral'}>{source.enabled ? '已启用' : '已停用'}</StatusBadge><span>连续失败 {source.failureCount} 次</span><small>{source.lastError ?? '最近无错误'}</small></div>
              <div>{formatDateTime(source.lastSuccessAt)}<small>最近新增 {source.lastRunNewCount}</small></div>
              <div><button disabled={!source.enabled || runningId !== null} onClick={() => void runSource(source.id, source.collectionMode)}><Play size={15} />{runningId === source.id ? '运行中…' : '手动运行'}</button></div>
            </article>
          ))}
          <div className="source-footnote"><DatabaseZap size={16} />真实来源接入前必须确认公开访问、合规范围、频率限制与字段映射。</div>
        </div>
      )}

      <section className="raw-items-section">
        <div className="section-heading"><div><span>RAW ITEMS</span><h2>最近原始资料</h2></div><small>最多展示最近 20 条；数据来自 GET /api/raw-items。</small></div>
        {data && data.rawItems.length === 0 && <EmptyState title="暂无原始资料" description="运行一个数据源后，资料会显示在这里。" />}
        {data && data.rawItems.length > 0 && (
          <div className="raw-item-list">
            {data.rawItems.slice(0, 20).map((item) => (
              <article className="raw-item-card" key={item.id}>
                <div className="badge-row"><StatusBadge tone={item.isDemo ? 'neutral' : 'accent'}>{item.isDemo ? 'DEMO' : 'LIVE'}</StatusBadge><StatusBadge tone={item.qualityStatus === 'good' ? 'success' : 'warning'}>{item.qualityStatus}</StatusBadge></div>
                <div><strong>{item.title || '无标题资料'}</strong><p>{item.summary || '暂无摘要'}</p><small>{item.sourceId} · 发布 {formatDateTime(item.publishedAt)} · 获取 {formatDateTime(item.fetchedAt)} · {item.contentLength} 字符</small>{item.failureReason && <small className="error-text">{item.failureReason}</small>}</div>
                <a href={item.originalUrl} target="_blank" rel="noreferrer">查看原文</a>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
