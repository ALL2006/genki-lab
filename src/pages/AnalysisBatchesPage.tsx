import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Clipboard, Download, ExternalLink, FileJson, RefreshCw, Save, Upload, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import type { AIBatch, AIAnalysisRecord, AIAnalysisRun, EvidenceRole, RawItem, ValidationFlag } from '../../shared/types'
import { EmptyState } from '../components/EmptyState'
import { ErrorState, LoadingState } from '../components/ApiState'
import { useApiResource } from '../hooks/useApiResource'
import {
  countPilotRoles,
  getCreateBatchLabel,
  getEffectiveSelectionRole,
  getRoleHint,
  isB2PilotDistribution,
  selectionRoleLabels,
  selectionRoleOptions,
  toggleSelectedId,
} from '../../shared/analysisBatchSelection'
import type { PilotRoleCounts, PilotSelectionRole } from '../../shared/analysisBatchSelection'
import { ApiClientError, api } from '../services/api'
import type { AIBatchCandidate, AIBatchExport } from '../services/api'
import { formatDateTime } from '../utils/format'
import {
  DEFAULT_BATCH_EXPORT_FILE_NAME,
  saveJsonFile,
} from '../../shared/saveJsonFile'
import type { JsonSaveFilePicker } from '../../shared/saveJsonFile'

type DataTypeFilter = 'public' | 'comment'
type LayerFilter = 'all' | 'live' | 'demo'
type AnalysisFilter = 'all' | 'selectable' | 'unanalyzed' | 'demo_result' | 'active' | 'pending_review' | 'completed'
type RoleFilter = 'all' | Exclude<PilotSelectionRole, 'excluded'>

interface PageData {
  candidates: AIBatchCandidate[]
  records: AIAnalysisRecord[]
  runs: AIAnalysisRun[]
  batches: AIBatch[]
  rawItems: RawItem[]
  validationFlags: ValidationFlag[]
}

interface LocalBatchPresentation {
  name: string
  roles: Record<string, PilotSelectionRole>
  counts: PilotRoleCounts
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

function getCandidateSummary(item: AIBatchCandidate) {
  return item.summary || item.originalTextPreview
}

export function AnalysisBatchesPage() {
  const navigate = useNavigate()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const tableScrollRef = useRef<HTMLDivElement>(null)
  const loader = useCallback(async (): Promise<PageData> => {
    const [candidates, records, runs, batches, rawItems, validationFlags] = await Promise.all([
      api.getAIBatchCandidates(),
      api.getAIAnalysisRecords(),
      api.getAIAnalysisRuns(),
      api.getPendingAIBatches(),
      api.getRawItems(),
      api.getValidationFlags(),
    ])
    return { candidates, records, runs, batches, rawItems, validationFlags }
  }, [])
  const { data, loading, error, reload } = useApiResource(loader)

  const [dataType, setDataType] = useState<DataTypeFilter>('public')
  const [layer, setLayer] = useState<LayerFilter>('all')
  const [dataset, setDataset] = useState<'development' | 'holdout'>('development')
  const [source, setSource] = useState('all')
  const [analysis, setAnalysis] = useState<AnalysisFilter>('unanalyzed')
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all')
  const [holdoutUnlocked, setHoldoutUnlocked] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [selectionRoles, setSelectionRoles] = useState<Record<string, PilotSelectionRole>>({})
  const [selectedDrawerOpen, setSelectedDrawerOpen] = useState(false)
  const [batchName, setBatchName] = useState('')
  const [confirmedDistributionKey, setConfirmedDistributionKey] = useState<string | null>(null)
  const [batchPresentations, setBatchPresentations] = useState<Record<string, LocalBatchPresentation>>({})
  const [activeBatch, setActiveBatch] = useState<AIBatch | null>(null)
  const [batchExport, setBatchExport] = useState<AIBatchExport | null>(null)
  const [schemaOpen, setSchemaOpen] = useState(false)
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null)
  const [uploadedPayload, setUploadedPayload] = useState<unknown>(null)
  const [importSummary, setImportSummary] = useState<ImportSummary | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)

  useEffect(() => {
    tableScrollRef.current?.scrollTo({ top: 0 })
  }, [analysis, dataType, dataset, layer, roleFilter, source])

  const sources = useMemo(() => [...new Set(data?.candidates.map((item) => item.source) ?? [])].sort(), [data?.candidates])
  const filteredItems = useMemo(() => {
    if (!data) return []
    return data.candidates.filter((item) => {
      if ((dataType === 'public') !== (item.dataType === 'public_material')) return false
      if (layer !== 'all' && item.dataLayer !== layer) return false
      if (item.dataType === 'consumer_comment' && item.dataset !== dataset) return false
      if (source !== 'all' && item.source !== source) return false
      if (roleFilter !== 'all' && getEffectiveSelectionRole(item, selectionRoles) !== roleFilter) return false
      if (analysis === 'selectable' && !item.selectable) return false
      if (analysis === 'unanalyzed' && (!item.selectable || !['unanalyzed', 'demo_result'].includes(item.modelStatus))) return false
      if (analysis === 'demo_result' && item.modelStatus !== 'demo_result') return false
      if (analysis === 'active' && !['batched', 'awaiting_import'].includes(item.modelStatus)) return false
      if (analysis === 'pending_review' && item.modelStatus !== 'pending_review') return false
      if (analysis === 'completed' && !['completed', 'rejected'].includes(item.modelStatus)) return false
      return true
    })
  }, [analysis, data, dataType, dataset, layer, roleFilter, selectionRoles, source])

  const currentBatch = activeBatch ?? data?.batches[0] ?? null
  const availableBatches = currentBatch
    ? [currentBatch, ...(data?.batches.filter((batch) => batch.id !== currentBatch.id) ?? [])]
    : data?.batches ?? []
  const batchRecords = currentBatch ? data?.records.filter((record) => currentBatch.itemIds.includes(record.itemId)) ?? [] : []
  const pendingAutomaticCount = data?.batches
    .filter((batch) => batch.status === 'pending' || batch.status === 'dispatched')
    .reduce((total, batch) => total + batch.itemIds.length, 0) ?? 0
  const pendingFlagCount = data?.validationFlags.filter((flag) => flag.status === 'open').length ?? 0
  const validatedCount = data?.records.filter((record) => record.validationStatus === 'validated').length ?? 0
  const autoRepairedCount = data?.records.filter((record) => record.validationStatus === 'auto_repaired').length ?? 0
  const currentBatchItems = currentBatch ? data?.candidates.filter((item) => currentBatch.itemIds.includes(item.itemId)) ?? [] : []
  const selectedCandidates = data?.candidates.filter((item) => selectedIds.has(item.itemId)) ?? []
  const selectedRoleCounts = countPilotRoles(data?.candidates ?? [], selectedIds, selectionRoles)
  const b2PilotMode = batchName.toUpperCase().includes('B2-PILOT')
  const b2DistributionValid = isB2PilotDistribution(selectedRoleCounts)
  const distributionKey = `${selectedRoleCounts.consumer_candidate}:${selectedRoleCounts.market_candidate}:${selectedRoleCounts.background_candidate}:${selectedRoleCounts.unknown}:${selectedRoleCounts.excluded}`
  const b2DistributionConfirmed = confirmedDistributionKey === distributionKey
  const rawItemById = new Map((data?.rawItems ?? []).map((item) => [item.id, item]))
  const currentBatchPresentation = currentBatch ? batchPresentations[currentBatch.id] : undefined
  const currentBatchCounts = currentBatchPresentation?.counts ?? countPilotRoles(
    data?.candidates ?? [],
    new Set(currentBatch?.itemIds ?? []),
    currentBatchPresentation?.roles ?? {},
  )

  const toggleItem = (item: AIBatchCandidate) => {
    if (!item.selectable) return
    if (!selectedIds.has(item.itemId) && getEffectiveSelectionRole(item, selectionRoles) === 'excluded') {
      setSelectionRoles((current) => ({ ...current, [item.itemId]: getRoleHint(item) }))
    }
    setSelectedIds((current) => toggleSelectedId(current, item.itemId))
  }

  const updateSelectionRole = (item: AIBatchCandidate, role: PilotSelectionRole) => {
    setSelectionRoles((current) => ({ ...current, [item.itemId]: role }))
    if (role === 'excluded') {
      setSelectedIds((current) => {
        const next = new Set(current)
        next.delete(item.itemId)
        return next
      })
    }
  }

  const removeSelectedItem = (itemId: string) => {
    setSelectedIds((current) => {
      const next = new Set(current)
      next.delete(itemId)
      return next
    })
  }

  const toggleAllVisible = () => {
    const eligibleIds = filteredItems
      .filter((item) => item.selectable && getEffectiveSelectionRole(item, selectionRoles) !== 'excluded')
      .map((item) => item.itemId)
    const allSelected = eligibleIds.length > 0 && eligibleIds.every((id) => selectedIds.has(id))
    setSelectedIds((current) => {
      const next = new Set(current)
      eligibleIds.forEach((id) => allSelected ? next.delete(id) : next.add(id))
      return next
    })
  }

  const createBatch = async () => {
    if (!batchName.trim() || selectedIds.size === 0) return
    if (b2PilotMode && !b2DistributionValid && !b2DistributionConfirmed) return
    setBusy('create')
    setNotice(null)
    try {
      const batch = await api.createAIBatch([...selectedIds])
      setActiveBatch(batch)
      setBatchPresentations((current) => ({
        ...current,
        [batch.id]: {
          name: batchName.trim(),
          roles: Object.fromEntries(selectedCandidates.map((item) => [item.itemId, getEffectiveSelectionRole(item, selectionRoles)])),
          counts: selectedRoleCounts,
        },
      }))
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

  const createDisabled = !batchName.trim()
    || selectedIds.size === 0
    || busy !== null
    || (b2PilotMode && !b2DistributionValid && !b2DistributionConfirmed)

  const loadExport = async () => {
    if (!currentBatch) return null
    if (batchExport?.batch.id === currentBatch.id) return batchExport
    const exported = await api.exportAIBatch(currentBatch.id)
    setBatchExport(exported)
    return exported
  }

  const buildExportBlob = (exported: AIBatchExport) => new Blob(
    [JSON.stringify(exported, null, 2)],
    { type: 'application/json' },
  )

  const triggerBrowserDownload = (blob: Blob, fileName: string) => {
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = fileName
    anchor.click()
    URL.revokeObjectURL(url)
  }

  const downloadExport = async () => {
    setBusy('export')
    setNotice(null)
    try {
      const exported = await loadExport()
      if (!exported) return
      triggerBrowserDownload(buildExportBlob(exported), DEFAULT_BATCH_EXPORT_FILE_NAME)
      setNotice(`${DEFAULT_BATCH_EXPORT_FILE_NAME} · 文件已下载到浏览器默认目录`)
    } catch (cause) {
      setNotice(cause instanceof Error ? cause.message : '批次导出失败。')
    } finally {
      setBusy(null)
    }
  }

  const saveExportAs = async () => {
    setBusy('save-as')
    setNotice(null)
    try {
      const picker = (window as typeof window & {
        showSaveFilePicker?: JsonSaveFilePicker
      }).showSaveFilePicker?.bind(window)
      const result = await saveJsonFile({
        getBlob: async () => {
          const exported = await loadExport()
          if (!exported) throw new Error('当前没有可导出的批次。')
          return buildExportBlob(exported)
        },
        fileName: DEFAULT_BATCH_EXPORT_FILE_NAME,
        showSaveFilePicker: picker,
        fallbackDownload: triggerBrowserDownload,
      })
      setNotice(`${result.fileName} · ${result.mode === 'saved' ? '文件已保存' : '文件已下载到浏览器默认目录'}`)
    } catch (cause) {
      if (cause instanceof DOMException && cause.name === 'AbortError') {
        setNotice('已取消另存为。')
      } else {
        setNotice(cause instanceof Error ? cause.message : '文件保存失败。')
      }
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
      <label><input type="checkbox" checked={holdoutUnlocked} onChange={(event) => { setHoldoutUnlocked(event.target.checked); if (!event.target.checked) setDataset('development') }} />提示词已冻结，仅允许查看holdout</label>
    </div>

    <div className="analysis-selection-strip" aria-label="B2试运行选择统计">
      <strong>已选择 {selectedIds.size} 条</strong>
      <span>消费者候选 {selectedRoleCounts.consumer_candidate}</span>
      <span>市场候选 {selectedRoleCounts.market_candidate}</span>
      <span>背景候选 {selectedRoleCounts.background_candidate}</span>
      <span>待判断 {selectedRoleCounts.unknown}</span>
      <small>本批用途是人工预分类，仅用于抽样，不代表模型分析结论。</small>
    </div>

    <div className="analysis-validation-strip" aria-label="自动分析与复核状态">
      <span>待自动分析 <strong>{pendingAutomaticCount}</strong></span>
      <span>待复核 <strong>{pendingFlagCount}</strong></span>
      <span>自动通过 <strong>{validatedCount}</strong></span>
      <span>自动修复 <strong>{autoRepairedCount}</strong></span>
    </div>

    {notice && <div className="run-inline-notice">{notice}</div>}

    <div className="analysis-workspace-grid">
      <section className="analysis-queue-panel">
        <div className="analysis-panel-heading"><div><h2>待分析资料</h2><span>{filteredItems.length} 条 · 已选择 {selectedIds.size} 条</span></div><button className="analysis-heading-button" type="button" onClick={() => setSelectedDrawerOpen(true)}>查看已选择项目</button></div>
        <div className="analysis-filter-bar">
          <label><span>数据类型</span><select value={dataType} onChange={(event) => { setDataType(event.target.value as DataTypeFilter); setSource('all') }}><option value="public">公开资料</option><option value="comment">消费者评论</option></select></label>
          <label><span>数据层</span><select value={layer} onChange={(event) => setLayer(event.target.value as LayerFilter)}><option value="all">全部</option><option value="live">LIVE</option><option value="demo">DEMO</option></select></label>
          <label><span>数据集</span><select disabled={dataType === 'public'} value={dataset} onChange={(event) => setDataset(event.target.value as 'development' | 'holdout')}><option value="development">development</option><option value="holdout" disabled={!holdoutUnlocked}>holdout</option></select></label>
          <label><span>证据来源</span><select value={source} onChange={(event) => setSource(event.target.value)}><option value="all">全部来源</option>{sources.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
          <label><span>模型分析状态</span><select value={analysis} onChange={(event) => setAnalysis(event.target.value as AnalysisFilter)}><option value="all">全部</option><option value="selectable">可加入批次</option><option value="unanalyzed">未分析</option><option value="demo_result">已有DEMO结果</option><option value="active">批次处理中</option><option value="pending_review">待审核</option><option value="completed">已完成</option></select></label>
          <label><span>建议角色</span><select value={roleFilter} onChange={(event) => setRoleFilter(event.target.value as RoleFilter)}><option value="all">全部</option><option value="consumer_candidate">消费者候选</option><option value="market_candidate">市场候选</option><option value="background_candidate">背景候选</option><option value="unknown">待判断</option></select></label>
        </div>

        {filteredItems.length === 0 ? <EmptyState compact title="当前筛选下没有资料" description="调整数据类型、数据集、来源、角色或模型分析状态后重试。" /> : <div ref={tableScrollRef} className="analysis-table-scroll analysis-items-scroll"><table className="analysis-table analysis-items-table">
          <thead><tr><th><input aria-label="选择当前可用资料" type="checkbox" onChange={toggleAllVisible} /></th><th>itemId</th><th>摘要</th><th>来源</th><th>数据类型</th><th>数据层</th><th>数据处理状态</th><th>模型分析状态</th><th>建议角色</th><th>本批用途</th><th>资格/禁用原因</th></tr></thead>
          <tbody>{filteredItems.map((item) => {
            const modelLabel = item.modelStatus === 'unanalyzed' ? '未分析' : item.modelStatus === 'demo_result' ? '已有DEMO结果' : item.modelStatus === 'batched' ? '已加入批次' : item.modelStatus === 'awaiting_import' ? '待导入' : item.modelStatus === 'pending_review' ? '待审核' : item.modelStatus === 'completed' ? '已完成' : '已驳回'
            const processingLabel = item.processingStatus === 'pending' ? '待处理' : item.processingStatus === 'processed' ? '已处理' : '质量异常'
            const roleHint = getRoleHint(item)
            const selectionRole = getEffectiveSelectionRole(item, selectionRoles)
            return <tr key={item.itemId} className={!item.selectable ? 'is-disabled' : ''}>
              <td title={item.disabledReason ?? '可加入Manual Doubao批次'}><input aria-label={`选择 ${item.itemId}${item.disabledReason ? `，${item.disabledReason}` : ''}`} type="checkbox" disabled={!item.selectable} checked={selectedIds.has(item.itemId)} onChange={() => toggleItem(item)} /></td>
              <td><code>{item.itemId}</code></td>
              <td title={item.originalTextPreview}><strong>{getCandidateSummary(item)}</strong><small>{item.originalTitle}</small></td>
              <td><strong>{item.sourceName}</strong><small>{item.source}</small></td><td>{item.dataType === 'consumer_comment' ? `消费者评论${item.dataset ? ` · ${item.dataset}` : ''}` : '公开资料'}</td>
              <td><span className="run-layer-label"><i className={item.dataLayer === 'demo' ? 'is-demo' : 'is-live'} />{item.dataLayer === 'demo' ? 'DEMO' : 'LIVE'}</span></td>
              <td>{processingLabel}</td>
              <td><strong>{modelLabel}</strong>{item.modelStatus === 'demo_result' && <small>仍可进行真实分析</small>}</td>
              <td><strong>建议：{selectionRoleLabels[roleHint]}</strong><small>规则预判，待模型与人工复核。</small></td>
              <td><select className="analysis-role-select" aria-label={`设置 ${item.itemId} 的本批用途`} value={selectionRole} onChange={(event) => updateSelectionRole(item, event.target.value as PilotSelectionRole)}>{selectionRoleOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select><small>用于本次抽样，不改变正式证据角色。</small></td>
              <td><span className={item.disabledReason ? 'analysis-disabled-reason' : 'analysis-eligible-reason'}>{item.disabledReason ?? '可加入批次'}</span></td>
            </tr>
          })}</tbody>
        </table></div>}
      </section>

      <aside className="analysis-action-panel">
        <section>
          <div className="analysis-panel-heading"><div><h2>创建批次</h2><span>只提交符合资格的已勾选项目</span></div></div>
          <div className="analysis-form-stack">
            <label><span>批次名称</span><input value={batchName} onChange={(event) => setBatchName(event.target.value)} placeholder="例如：8月公开资料复核" /></label>
            <label><span>Provider</span><select value="manual-doubao" disabled><option>manual-doubao</option></select></label>
            <button className="analysis-primary-button" disabled={createDisabled} onClick={() => void createBatch()}>{getCreateBatchLabel(selectedIds.size)}</button>
          </div>
          {selectedIds.size === 0 && <p className="analysis-selection-hint">请选择至少1条可分析资料。</p>}
          {b2PilotMode && <div className={b2DistributionValid ? 'analysis-b2-check is-valid' : 'analysis-b2-check is-warning'}>
            <strong>{b2DistributionValid
              ? '试运行样本结构符合2＋2＋2建议。'
              : `当前批次不符合2＋2＋2试运行建议：消费者候选 ${selectedRoleCounts.consumer_candidate} 条、市场候选 ${selectedRoleCounts.market_candidate} 条、背景候选 ${selectedRoleCounts.background_candidate} 条。`}</strong>
            {!b2DistributionValid && <label><input type="checkbox" checked={b2DistributionConfirmed} onChange={(event) => setConfirmedDistributionKey(event.target.checked ? distributionKey : null)} />我已确认当前分布，继续创建</label>}
          </div>}
        </section>

        <section>
          <div className="analysis-panel-heading"><div><h2>当前批次</h2><span>{data?.batches.length ?? 0} 个待处理批次</span></div></div>
          {currentBatch ? <div className="analysis-batch-meta">
            <label><span>选择批次</span><select value={currentBatch.id} onChange={(event) => { setActiveBatch(availableBatches.find((batch) => batch.id === event.target.value) ?? null); setBatchExport(null); setImportSummary(null) }}>{availableBatches.map((batch) => <option key={batch.id} value={batch.id}>{batch.id}</option>)}</select></label>
            <dl><div><dt>batchId</dt><dd>{currentBatch.id}</dd></div><div><dt>批次名称</dt><dd>{currentBatchPresentation?.name ?? '本地名称未保留'}</dd></div><div><dt>Provider</dt><dd>manual-doubao</dd></div><div><dt>创建时间</dt><dd>{formatDateTime(currentBatch.createdAt)}</dd></div><div><dt>数据数量</dt><dd>{currentBatch.itemIds.length}</dd></div><div><dt>消费者候选</dt><dd>{currentBatchCounts.consumer_candidate}</dd></div><div><dt>市场候选</dt><dd>{currentBatchCounts.market_candidate}</dd></div><div><dt>背景候选</dt><dd>{currentBatchCounts.background_candidate}</dd></div><div><dt>promptVersion</dt><dd>{currentBatch.promptVersion}</dd></div><div><dt>schemaVersion</dt><dd>{currentBatch.schemaVersion}</dd></div><div><dt>批次状态</dt><dd>{batchStatusLabels[currentBatch.status]}</dd></div></dl>
            <div className="analysis-batch-items">{currentBatchItems.map((item) => <div key={item.itemId}><code>{item.itemId}</code><span>{item.sourceName}</span><small>{selectionRoleLabels[currentBatchPresentation?.roles[item.itemId] ?? getEffectiveSelectionRole(item, {})]}</small></div>)}</div>
          </div> : <EmptyState compact title="尚无待处理批次" description="选择可分析资料并创建批次后显示。" />}
        </section>

        <section>
          <div className="analysis-panel-heading"><div><h2>导出与导入</h2><span>密钥仅由本地代理注入</span></div></div>
          <div className="analysis-export-actions">
            <button disabled={!currentBatch || busy !== null} onClick={() => void downloadExport()}><Download size={12} />下载输入JSON</button>
            <button disabled={!currentBatch || busy !== null} onClick={() => void saveExportAs()}><Save size={12} />另存为…</button>
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

    {selectedDrawerOpen && <>
      <button className="analysis-drawer-backdrop" type="button" aria-label="关闭已选择项目" onClick={() => setSelectedDrawerOpen(false)} />
      <aside className="analysis-selected-drawer" role="dialog" aria-modal="true" aria-label="已选择项目">
        <header><div><h2>已选择 {selectedIds.size} 条</h2><p>不受当前资料筛选影响</p></div><button type="button" aria-label="关闭抽屉" onClick={() => setSelectedDrawerOpen(false)}><X size={14} /></button></header>
        <div className="analysis-drawer-counts">
          <span>消费者候选 <strong>{selectedRoleCounts.consumer_candidate}</strong></span>
          <span>市场候选 <strong>{selectedRoleCounts.market_candidate}</strong></span>
          <span>背景候选 <strong>{selectedRoleCounts.background_candidate}</strong></span>
          <span>待判断 <strong>{selectedRoleCounts.unknown}</strong></span>
        </div>
        <p className="analysis-drawer-boundary">本批用途是人工预分类，仅用于抽样，不代表模型分析结论。</p>
        <div className="analysis-selected-list">
          {selectedCandidates.length === 0 ? <EmptyState compact title="尚未选择资料" description="从待分析资料列表勾选可分析项目。" /> : selectedCandidates.map((item) => {
            const roleHint = getRoleHint(item)
            const selectionRole = getEffectiveSelectionRole(item, selectionRoles)
            const rawItem = rawItemById.get(item.itemId)
            return <article key={item.itemId}>
              <div className="analysis-selected-item-heading"><div><code>{item.itemId}</code><strong>{getCandidateSummary(item)}</strong></div><button type="button" onClick={() => removeSelectedItem(item.itemId)}>移出选择</button></div>
              <dl><div><dt>来源</dt><dd>{item.sourceName}</dd></div><div><dt>数据类型</dt><dd>{item.dataType === 'consumer_comment' ? '消费者评论' : '公开资料'}</dd></div><div><dt>数据层</dt><dd>{item.dataLayer === 'demo' ? 'DEMO' : 'LIVE'}</dd></div><div><dt>建议角色</dt><dd>{selectionRoleLabels[roleHint]}</dd></div><div><dt>是否可加入</dt><dd>{item.selectable ? '可以' : '不可加入'}</dd></div><div><dt>禁用原因</dt><dd>{item.disabledReason ?? '—'}</dd></div></dl>
              <label><span>本批用途</span><select aria-label={`在已选择项目中设置 ${item.itemId} 的本批用途`} value={selectionRole} onChange={(event) => updateSelectionRole(item, event.target.value as PilotSelectionRole)}>{selectionRoleOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select><small>用于本次抽样，不改变正式证据角色。</small></label>
              <details><summary>查看原始资料</summary><p>{item.originalTextPreview}</p>{rawItem?.originalUrl && <a href={rawItem.originalUrl} target="_blank" rel="noreferrer">打开原始链接 <ExternalLink size={11} /></a>}</details>
            </article>
          })}
        </div>
      </aside>
    </>}

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
