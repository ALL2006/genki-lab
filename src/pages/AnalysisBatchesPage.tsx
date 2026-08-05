import { useCallback, useMemo, useRef, useState } from 'react'
import { Clipboard, Download, ExternalLink, FileJson, RefreshCw, Upload } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import type { AIBatch, AIAnalysisRecord, AIAnalysisRun, EvidenceRole, RawItem } from '../../shared/types'
import { EmptyState } from '../components/EmptyState'
import { ErrorState, LoadingState } from '../components/ApiState'
import { useApiResource } from '../hooks/useApiResource'
import { ApiClientError, api } from '../services/api'
import type { AIBatchExport } from '../services/api'
import { formatDateTime } from '../utils/format'

type DataTypeFilter = 'public' | 'comment'
type LayerFilter = 'all' | 'live' | 'demo'
type AnalysisFilter = 'all' | 'pending' | 'analyzed'

interface PageData {
  rawItems: RawItem[]
  records: AIAnalysisRecord[]
  runs: AIAnalysisRun[]
  batches: AIBatch[]
  evaluation: { dataset: { version: string; developmentCount: number; holdoutCount: number; disclaimer: string } }
}

interface ImportSummary {
  schemaValid: boolean
  itemIdValid: boolean
  quotePassed: number
  quoteFailed: number
  idempotent: boolean
  rejectionReason: string | null
  runId: string | null
}

const evidenceRoleLabels: Record<EvidenceRole, string> = {
  consumer_evidence: '消费者证据',
  market_evidence: '市场证据',
  background_evidence: '背景证据',
  irrelevant: '不纳入',
}

const reviewStatusLabels: Record<AIAnalysisRecord['reviewStatus'], string> = {
  pending: '待审核',
  confirmed: '已确认',
  needs_revision: '待修订',
  rejected: '已拒绝',
}

const batchStatusLabels: Record<AIBatch['status'], string> = {
  pending: '待处理',
  dispatched: '已派发',
  completed: '已完成',
  failed: '失败',
}

function getChineseSummary(item: RawItem) {
  const summary = item.summary.replace(/\s+/g, ' ').trim()
  if (/[\u4e00-\u9fff]/.test(summary)) return summary
  if (item.isDemo) return '演示资料：饮品行业信息'
  if (item.collectorType === 'configurable_list') return '品牌公开资料：产品、包装与品牌动态'
  if (item.collectorType === 'rss') return '行业研究资料：市场、消费与监管信息'
  return '行业公开资料：饮品趋势与产品信息'
}

function buildDoubaoPrompt(batchExport: AIBatchExport) {
  return [
    `批次：${batchExport.batch.id}`,
    `Prompt版本：${batchExport.batch.promptVersion}`,
    ...batchExport.instructions,
    '请严格按下方Schema分析输入，直接返回JSON对象，不要添加Markdown代码块或解释。',
    `Schema：${JSON.stringify(batchExport.schema)}`,
    `输入：${JSON.stringify(batchExport.items)}`,
  ].join('\n\n')
}

export function AnalysisBatchesPage() {
  const navigate = useNavigate()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const loader = useCallback(async (): Promise<PageData> => {
    const [rawItems, records, runs, batches, evaluation] = await Promise.all([
      api.getRawItems(),
      api.getAIAnalysisRecords(),
      api.getAIAnalysisRuns(),
      api.getPendingAIBatches(),
      api.getEvaluations(),
    ])
    return { rawItems, records, runs, batches, evaluation }
  }, [])
  const { data, loading, error, reload } = useApiResource(loader)

  const [dataType, setDataType] = useState<DataTypeFilter>('public')
  const [layer, setLayer] = useState<LayerFilter>('all')
  const [dataset, setDataset] = useState<'development' | 'holdout'>('development')
  const [source, setSource] = useState('all')
  const [analysis, setAnalysis] = useState<AnalysisFilter>('pending')
  const [holdoutUnlocked, setHoldoutUnlocked] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [batchName, setBatchName] = useState('')
  const [activeBatch, setActiveBatch] = useState<AIBatch | null>(null)
  const [batchExport, setBatchExport] = useState<AIBatchExport | null>(null)
  const [schemaOpen, setSchemaOpen] = useState(false)
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null)
  const [uploadedPayload, setUploadedPayload] = useState<unknown>(null)
  const [importSummary, setImportSummary] = useState<ImportSummary | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)

  const analyzedIds = useMemo(() => new Set(data?.records.map((record) => record.itemId) ?? []), [data?.records])
  const sources = useMemo(() => [...new Set(data?.rawItems.map((item) => item.sourceId) ?? [])].sort(), [data?.rawItems])
  const filteredItems = useMemo(() => {
    if (!data || dataType === 'comment') return []
    return data.rawItems.filter((item) => {
      const isAnalyzed = analyzedIds.has(item.id)
      if (layer !== 'all' && (layer === 'demo') !== item.isDemo) return false
      if (source !== 'all' && item.sourceId !== source) return false
      if (analysis === 'pending' && isAnalyzed) return false
      if (analysis === 'analyzed' && !isAnalyzed) return false
      return true
    })
  }, [analysis, analyzedIds, data, dataType, layer, source])

  const currentBatch = activeBatch ?? data?.batches[0] ?? null
  const availableBatches = currentBatch
    ? [currentBatch, ...(data?.batches.filter((batch) => batch.id !== currentBatch.id) ?? [])]
    : data?.batches ?? []
  const batchRecords = currentBatch ? data?.records.filter((record) => currentBatch.itemIds.includes(record.itemId)) ?? [] : []

  const toggleItem = (item: RawItem) => {
    if (item.status !== 'pending' || analyzedIds.has(item.id)) return
    setSelectedIds((current) => {
      const next = new Set(current)
      if (next.has(item.id)) next.delete(item.id)
      else next.add(item.id)
      return next
    })
  }

  const toggleAllVisible = () => {
    const eligibleIds = filteredItems.filter((item) => item.status === 'pending' && !analyzedIds.has(item.id)).map((item) => item.id)
    const allSelected = eligibleIds.length > 0 && eligibleIds.every((id) => selectedIds.has(id))
    setSelectedIds((current) => {
      const next = new Set(current)
      eligibleIds.forEach((id) => allSelected ? next.delete(id) : next.add(id))
      return next
    })
  }

  const createBatch = async () => {
    if (!batchName.trim() || selectedIds.size === 0) return
    setBusy('create')
    setNotice(null)
    try {
      const batch = await api.createAIBatch([...selectedIds])
      setActiveBatch(batch)
      setSelectedIds(new Set())
      setBatchExport(null)
      setNotice(`批次“${batchName.trim()}”已创建；名称仅作为本次操作备注，不写入冻结批次Schema。`)
      await reload()
    } catch (cause) {
      setNotice(cause instanceof Error ? cause.message : '批次创建失败。')
    } finally {
      setBusy(null)
    }
  }

  const loadExport = async () => {
    if (!currentBatch) return null
    if (batchExport?.batch.id === currentBatch.id) return batchExport
    const exported = await api.exportAIBatch(currentBatch.id)
    setBatchExport(exported)
    return exported
  }

  const downloadExport = async () => {
    setBusy('export')
    setNotice(null)
    try {
      const exported = await loadExport()
      if (!exported) return
      const blob = new Blob([JSON.stringify(exported, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `${currentBatch?.id ?? 'ai-batch'}-input.json`
      anchor.click()
      URL.revokeObjectURL(url)
      setNotice('批次输入JSON已下载。')
    } catch (cause) {
      setNotice(cause instanceof Error ? cause.message : '批次导出失败。')
    } finally {
      setBusy(null)
    }
  }

  const copyPrompt = async () => {
    setBusy('copy')
    setNotice(null)
    try {
      const exported = await loadExport()
      if (!exported) return
      await navigator.clipboard.writeText(buildDoubaoPrompt(exported))
      setNotice('豆包操作提示词已复制。')
    } catch (cause) {
      setNotice(cause instanceof Error ? cause.message : '提示词复制失败。')
    } finally {
      setBusy(null)
    }
  }

  const viewSchema = async () => {
    setBusy('schema')
    setNotice(null)
    try {
      await loadExport()
      setSchemaOpen(true)
    } catch (cause) {
      setNotice(cause instanceof Error ? cause.message : 'Schema读取失败。')
    } finally {
      setBusy(null)
    }
  }

  const readResultFile = async (file: File | undefined) => {
    if (!file) return
    setNotice(null)
    setImportSummary(null)
    try {
      const parsed = JSON.parse(await file.text()) as unknown
      const results = Array.isArray(parsed)
        ? parsed
        : parsed && typeof parsed === 'object' && Array.isArray((parsed as { results?: unknown }).results)
          ? (parsed as { results: unknown[] }).results
          : null
      if (!results) throw new Error('文件必须是结果数组，或包含 results 数组的JSON对象。')
      setUploadedPayload(parsed)
      setUploadedFileName(file.name)
      setNotice(`已读取 ${file.name}，文件内容保持原样，等待后端校验。`)
    } catch (cause) {
      setUploadedPayload(null)
      setUploadedFileName(null)
      setNotice(cause instanceof Error ? cause.message : '无法读取JSON文件。')
    }
  }

  const importResults = async () => {
    if (!currentBatch || uploadedPayload === null) return
    const results = Array.isArray(uploadedPayload)
      ? uploadedPayload
      : (uploadedPayload as { results: unknown[] }).results
    setBusy('import')
    setNotice(null)
    try {
      const result = await api.importAIResults({
        batchId: currentBatch.id,
        provider: 'manual-doubao',
        mode: 'manual_import',
        results,
        rawModelResponse: uploadedPayload,
      })
      const runs = await api.getAIAnalysisRuns()
      const run = runs.find((item) => item.batchId === currentBatch.id) ?? null
      const itemIds = new Set(currentBatch.itemIds)
      setImportSummary({
        schemaValid: result.records.every((record) => record.schemaValid),
        itemIdValid: result.records.length === currentBatch.itemIds.length && result.records.every((record) => itemIds.has(record.itemId)),
        quotePassed: result.records.filter((record) => record.quoteValid).length,
        quoteFailed: result.records.filter((record) => !record.quoteValid).length,
        idempotent: result.idempotent,
        rejectionReason: null,
        runId: run?.id ?? null,
      })
      setActiveBatch({ ...currentBatch, status: 'completed', updatedAt: new Date().toISOString() })
      setNotice(result.idempotent ? '相同结果已导入过，本次为幂等重放。' : '结果已通过后端校验并导入。')
      await reload()
    } catch (cause) {
      const runs = await api.getAIAnalysisRuns().catch(() => [])
      const run = runs.find((item) => item.batchId === currentBatch.id) ?? null
      setImportSummary({
        schemaValid: false,
        itemIdValid: false,
        quotePassed: run?.quoteValidCount ?? 0,
        quoteFailed: run?.failedCount ?? currentBatch.itemIds.length,
        idempotent: false,
        rejectionReason: cause instanceof ApiClientError ? cause.message : '导入未通过后端校验。',
        runId: run?.id ?? null,
      })
      setNotice('结果未写入，请查看拒绝原因。')
    } finally {
      setBusy(null)
    }
  }

  if (loading && !data) return <div className="page-container analysis-batches-page"><LoadingState label="正在读取待分析资料与批次…" /></div>
  if (error && !data) return <div className="page-container analysis-batches-page"><ErrorState message={error} onRetry={() => void reload()} /></div>

  return <div className="page-container analysis-batches-page">
    <header className="analysis-page-toolbar">
      <div><h1>分析批次</h1><span>Manual Doubao · 批次导出与结果导入</span></div>
      <button type="button" onClick={() => void reload()}><RefreshCw size={12} />刷新</button>
    </header>

    <div className="analysis-holdout-rule">
      <strong>留出样本仅在提示词冻结后运行一次。</strong>
      <label><input type="checkbox" checked={holdoutUnlocked} onChange={(event) => setHoldoutUnlocked(event.target.checked)} />提示词已冻结，允许查看holdout</label>
    </div>

    {notice && <div className="run-inline-notice">{notice}</div>}

    <div className="analysis-workspace-grid">
      <section className="analysis-queue-panel">
        <div className="analysis-panel-heading"><div><h2>待分析资料</h2><span>{filteredItems.length} 条 · 已选择 {selectedIds.size} 条</span></div></div>
        <div className="analysis-filter-bar">
          <label><span>数据类型</span><select value={dataType} onChange={(event) => { setDataType(event.target.value as DataTypeFilter); setSelectedIds(new Set()) }}><option value="public">公开资料</option><option value="comment">消费者评论</option></select></label>
          <label><span>数据层</span><select value={layer} onChange={(event) => setLayer(event.target.value as LayerFilter)}><option value="all">全部</option><option value="live">LIVE</option><option value="demo">DEMO</option></select></label>
          <label><span>数据集</span><select disabled={dataType === 'public'} value={dataset} onChange={(event) => setDataset(event.target.value as 'development' | 'holdout')}><option value="development">development</option><option value="holdout" disabled={!holdoutUnlocked}>holdout</option></select></label>
          <label><span>证据来源</span><select value={source} onChange={(event) => setSource(event.target.value)}><option value="all">全部来源</option>{sources.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
          <label><span>分析状态</span><select value={analysis} onChange={(event) => setAnalysis(event.target.value as AnalysisFilter)}><option value="all">全部</option><option value="pending">未分析</option><option value="analyzed">已分析</option></select></label>
        </div>

        {dataType === 'comment' ? <div className="analysis-boundary-empty">
          <strong>{dataset === 'development' ? `development · ${data?.evaluation.dataset.developmentCount ?? 0}条` : `holdout · ${data?.evaluation.dataset.holdoutCount ?? 0}条`}</strong>
          <p>B1现有批次接口只接受RawItem，未提供消费者评论明细查询与手工批次创建。这里不将冻结评测样本伪装成公开资料。</p>
        </div> : filteredItems.length === 0 ? <EmptyState compact title="当前筛选下没有资料" description="调整数据层、来源或分析状态后重试。" /> : <div className="analysis-table-scroll"><table className="analysis-table analysis-items-table">
          <thead><tr><th><input aria-label="选择当前可用资料" type="checkbox" onChange={toggleAllVisible} /></th><th>itemId</th><th>摘要</th><th>来源</th><th>数据类型</th><th>数据层</th><th>分析状态</th></tr></thead>
          <tbody>{filteredItems.slice(0, 8).map((item) => {
            const isAnalyzed = analyzedIds.has(item.id)
            const selectable = item.status === 'pending' && !isAnalyzed
            return <tr key={item.id} className={!selectable ? 'is-disabled' : ''}>
              <td><input aria-label={`选择 ${item.id}`} type="checkbox" disabled={!selectable} checked={selectedIds.has(item.id)} onChange={() => toggleItem(item)} /></td>
              <td><code>{item.id}</code></td>
              <td><strong>{getChineseSummary(item)}</strong><small>{item.rawText.slice(0, 72)}</small></td>
              <td>{item.sourceId}</td><td>公开资料</td>
              <td><span className="run-layer-label"><i className={item.isDemo ? 'is-demo' : 'is-live'} />{item.isDemo ? 'DEMO' : 'LIVE'}</span></td>
              <td>{isAnalyzed ? '已分析' : item.status === 'pending' ? '待分析' : '原始资料已处理'}</td>
            </tr>
          })}</tbody>
        </table></div>}
      </section>

      <aside className="analysis-action-panel">
        <section>
          <div className="analysis-panel-heading"><div><h2>创建批次</h2><span>只提交已勾选的pending资料</span></div></div>
          <div className="analysis-form-stack">
            <label><span>批次名称</span><input value={batchName} onChange={(event) => setBatchName(event.target.value)} placeholder="例如：8月公开资料复核" /></label>
            <label><span>Provider</span><select value="manual-doubao" disabled><option>manual-doubao</option></select></label>
            <button className="analysis-primary-button" disabled={!batchName.trim() || selectedIds.size === 0 || busy !== null} onClick={() => void createBatch()}>创建批次 · {selectedIds.size}条</button>
          </div>
        </section>

        <section>
          <div className="analysis-panel-heading"><div><h2>当前批次</h2><span>{data?.batches.length ?? 0} 个待处理批次</span></div></div>
          {currentBatch ? <div className="analysis-batch-meta">
            <label><span>选择批次</span><select value={currentBatch.id} onChange={(event) => { setActiveBatch(availableBatches.find((batch) => batch.id === event.target.value) ?? null); setBatchExport(null); setImportSummary(null) }}>{availableBatches.map((batch) => <option key={batch.id} value={batch.id}>{batch.id}</option>)}</select></label>
            <dl><div><dt>batchId</dt><dd>{currentBatch.id}</dd></div><div><dt>数据数量</dt><dd>{currentBatch.itemIds.length}</dd></div><div><dt>创建时间</dt><dd>{formatDateTime(currentBatch.createdAt)}</dd></div><div><dt>promptVersion</dt><dd>{currentBatch.promptVersion}</dd></div><div><dt>schemaVersion</dt><dd>{currentBatch.schemaVersion}</dd></div><div><dt>批次状态</dt><dd>{batchStatusLabels[currentBatch.status]}</dd></div></dl>
          </div> : <EmptyState compact title="尚无待处理批次" description="选择pending资料并创建批次后显示。" />}
        </section>

        <section>
          <div className="analysis-panel-heading"><div><h2>导出与导入</h2><span>密钥仅由本地代理注入</span></div></div>
          <div className="analysis-export-actions">
            <button disabled={!currentBatch || busy !== null} onClick={() => void downloadExport()}><Download size={12} />下载输入JSON</button>
            <button disabled={!currentBatch || busy !== null} onClick={() => void copyPrompt()}><Clipboard size={12} />复制豆包提示词</button>
            <button disabled={!currentBatch || busy !== null} onClick={() => void viewSchema()}><FileJson size={12} />查看Schema</button>
          </div>
          {schemaOpen && batchExport && <details className="analysis-schema" open><summary>Schema · {batchExport.batch.schemaVersion}</summary><pre>{JSON.stringify(batchExport.schema, null, 2)}</pre></details>}
          <div className="analysis-upload-zone" onClick={() => fileInputRef.current?.click()}>
            <Upload size={14} /><strong>{uploadedFileName ?? '选择豆包返回的JSON文件'}</strong><span>文件不会在浏览器中编辑或保存密钥</span>
            <input ref={fileInputRef} hidden type="file" accept="application/json,.json" onChange={(event) => void readResultFile(event.target.files?.[0])} />
          </div>
          <button className="analysis-primary-button" disabled={!currentBatch || uploadedPayload === null || busy !== null} onClick={() => void importResults()}>{busy === 'import' ? '校验并导入中…' : '校验并导入结果'}</button>
        </section>
      </aside>
    </div>

    {importSummary && <section className="analysis-import-summary">
      <div><span>Schema</span><strong>{importSummary.schemaValid ? '合法' : '未通过'}</strong></div>
      <div><span>itemId匹配</span><strong>{importSummary.itemIdValid ? '通过' : '未通过'}</strong></div>
      <div><span>引文通过</span><strong>{importSummary.quotePassed}</strong></div>
      <div><span>引文失败</span><strong>{importSummary.quoteFailed}</strong></div>
      <div><span>幂等</span><strong>{importSummary.idempotent ? '是' : '否'}</strong></div>
      <div><span>AIAnalysisRun</span><strong>{importSummary.runId ?? '未生成'}</strong></div>
      {importSummary.rejectionReason && <p><strong>拒绝原因：</strong>{importSummary.rejectionReason}</p>}
    </section>}

    <section className="analysis-results-panel">
      <div className="analysis-panel-heading"><div><h2>结果列表</h2><span>{batchRecords.length} 条 · 点击进入分析详情</span></div></div>
      {batchRecords.length === 0 ? <EmptyState compact title="当前批次尚无分析结果" description="导入JSON并通过后端Schema、itemId和引文校验后显示。" /> : <div className="analysis-table-scroll"><table className="analysis-table analysis-results-table">
        <thead><tr><th>itemId</th><th>evidenceRole</th><th>relevanceScore</th><th>引文数量</th><th>confidence</th><th>Provider</th><th>自动化</th><th>审核状态</th><th /></tr></thead>
        <tbody>{batchRecords.map((record) => <tr key={record.id} tabIndex={0} onClick={() => navigate(`/trends?analysisRecordId=${record.id}`)} onKeyDown={(event) => { if (event.key === 'Enter') navigate(`/trends?analysisRecordId=${record.id}`) }}>
          <td><code>{record.itemId}</code></td><td>{evidenceRoleLabels[record.parsedAIOutput.evidenceRole]}</td><td>{Math.round(record.parsedAIOutput.relevanceScore * 100)}%</td><td>{record.parsedAIOutput.evidenceQuotes.length}</td><td>{Math.round(record.parsedAIOutput.confidence * 100)}%</td><td>{record.provider}</td><td>{record.isAutomated ? '是' : '否'}</td><td>{reviewStatusLabels[record.reviewStatus]}</td><td><ExternalLink size={11} /></td>
        </tr>)}</tbody>
      </table></div>}
    </section>
  </div>
}
