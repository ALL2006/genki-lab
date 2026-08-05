import { useCallback, useState } from 'react'
import { Check, RefreshCw, Sparkles, Trophy } from 'lucide-react'
import type { ProductConcept } from '../../shared/types'
import { ErrorState, LoadingState } from '../components/ApiState'
import { DemoDataBanner } from '../components/DemoDataBanner'
import { EmptyState } from '../components/EmptyState'
import { PageTitle } from '../components/PageTitle'
import { StatusBadge } from '../components/StatusBadge'
import { useApiResource } from '../hooks/useApiResource'
import { api } from '../services/api'
import { productThemeStyle, resolveProductTheme } from '../themes/productThemes'

function ConceptDetail({ product, onChanged }: { product: ProductConcept; onChanged: () => Promise<void> }) {
  const [score, setScore] = useState(product.humanScore?.toString() ?? '')
  const [saving, setSaving] = useState(false)

  const update = async (patch: { humanScore?: number; status?: 'selected' }) => {
    setSaving(true)
    try {
      await api.updateProductConcept(product.id, patch)
      await onChanged()
    } finally {
      setSaving(false)
    }
  }

  return <aside className="concept-detail product-theme-scope" style={productThemeStyle(resolveProductTheme(product))}>
    <div className="concept-detail__accent" />
    <div className="concept-detail__header">
      <div><span>候选概念详情</span><h2>{product.productName}</h2></div>
      <StatusBadge tone={product.status === 'selected' ? 'success' : 'accent'}>{product.status}</StatusBadge>
    </div>
    <p className="concept-detail__proposition">{product.valueProposition}</p>

    <div className="concept-score-line">
      <div><span>模型评分</span><strong>{product.aiScore}</strong></div>
      <label><span>人工评分</span><input type="number" min="0" max="100" value={score} onChange={(event) => setScore(event.target.value)} /></label>
      <button disabled={saving || score === ''} onClick={() => void update({ humanScore: Number(score) })}>保存评分</button>
    </div>

    <dl className="concept-detail-list">
      <div><dt>风味组合</dt><dd>{product.flavorCombination.join(' × ')}</dd></div>
      <div><dt>目标人群</dt><dd>{product.targetAudience}</dd></div>
      <div><dt>使用场景</dt><dd>{product.scenes.join(' / ')}</dd></div>
      <div><dt>核心卖点</dt><dd>{product.sellingPoints.map((item) => <span key={item}>{item}</span>)}</dd></div>
      <div><dt>主要风险</dt><dd>{product.risks.map((item) => <span key={item}>{item}</span>)}</dd></div>
      <div><dt>支持趋势</dt><dd>{product.sourceSignalIds.map((item) => <code key={item}>{item}</code>)}</dd></div>
    </dl>

    <div className="concept-detail__gate">
      <p>未经人工选择，不会进入视频配置阶段。</p>
      <button disabled={saving || product.status === 'selected'} onClick={() => void update({ status: 'selected' })}>
        {product.status === 'selected' ? <><Check size={14} />已入围</> : <><Trophy size={14} />选择入围</>}
      </button>
    </div>
  </aside>
}

export function ConceptsPage() {
  const loader = useCallback(() => api.getProductConcepts(), [])
  const { data, loading, error, reload } = useApiResource(loader)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [generating, setGenerating] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)

  const activeProduct = data?.find((product) => product.id === activeId)
    ?? data?.find((product) => product.status === 'selected')
    ?? data?.[0]

  const generate = async () => {
    setGenerating(true)
    setNotice(null)
    try {
      const { run } = await api.runDemoJob('generate-products')
      setNotice(`生成任务完成：新增 ${run.newCount} 款，重复 ${run.duplicateCount} 款。`)
      await reload()
    } catch (cause) {
      setNotice(cause instanceof Error ? cause.message : '产品生成失败。')
      await reload()
    } finally {
      setGenerating(false)
    }
  }

  return <div className="page-container workspace-page concepts-page">
    <PageTitle
      eyebrow="PRODUCT CONCEPTS / 候选比较"
      title="产品概念"
      description="比较模型候选、人工评分、证据范围与产品风险。"
      actions={<><button className="secondary-button" onClick={() => void reload()}><RefreshCw size={14} />刷新</button><button disabled={generating} onClick={() => void generate()}><Sparkles size={14} />{generating ? '生成中…' : '生成 3 款候选'}</button></>}
    />
    <DemoDataBanner>候选概念来自 MockAIProvider，不是配方研发结果，也没有完成市场验证。</DemoDataBanner>
    {notice && <div className="inline-notice">{notice}</div>}
    {loading && <LoadingState />}
    {error && <ErrorState message={error} onRetry={() => void reload()} />}
    {data?.length === 0 && <EmptyState title="暂无候选产品" description="确认至少一条趋势后，再生成候选概念。" />}

    {data && data.length > 0 && <div className="concept-workspace">
      <section className="workspace-panel concept-comparison">
        <div className="workspace-panel__header"><div className="workspace-panel__title"><h2>候选概念比较</h2><span>{data.length} 款</span></div><small>选择行查看完整定义</small></div>
        <table className="workspace-table concept-table">
          <thead><tr><th>产品名称</th><th>风味组合</th><th>目标人群</th><th>模型</th><th>人工</th><th>状态</th></tr></thead>
          <tbody>{data.map((product) => <tr key={product.id} className={product.id === activeProduct?.id ? 'is-active' : ''}>
            <td><button className="concept-name-button" onClick={() => setActiveId(product.id)}><strong>{product.productName}</strong><span>{product.scenes.slice(0, 2).join(' / ')}</span></button></td>
            <td className="cell-clip">{product.flavorCombination.join(' × ')}</td>
            <td className="cell-clip cell-muted">{product.targetAudience}</td>
            <td><strong>{product.aiScore}</strong></td>
            <td>{product.humanScore ?? '—'}</td>
            <td><StatusBadge tone={product.status === 'selected' ? 'success' : 'accent'}>{product.status}</StatusBadge></td>
          </tr>)}</tbody>
        </table>
        <div className="comparison-notes">
          <div><span>比较口径</span><strong>趋势证据、风险、场景、人工评分</strong></div>
          <div><span>入围规则</span><strong>必须经过人工选择</strong></div>
          <div><span>下一节点</span><strong>产品定义审核</strong></div>
        </div>
        <div className="concept-matrix">
          <div className="concept-matrix__heading"><strong>概念差异矩阵</strong><span>只比较现有 ProductConcept 字段</span></div>
          <table className="workspace-table">
            <thead><tr><th>比较维度</th>{data.map((product) => <th key={product.id}>{product.productName}</th>)}</tr></thead>
            <tbody>
              <tr><td className="cell-muted">核心场景</td>{data.map((product) => <td key={product.id}>{product.scenes.slice(0, 2).join(' / ')}</td>)}</tr>
              <tr><td className="cell-muted">卖点数量</td>{data.map((product) => <td key={product.id}>{product.sellingPoints.length} 项</td>)}</tr>
              <tr><td className="cell-muted">风险数量</td>{data.map((product) => <td key={product.id}>{product.risks.length} 项</td>)}</tr>
              <tr><td className="cell-muted">证据来源</td>{data.map((product) => <td key={product.id}>{product.sourceSignalIds.length} 条趋势</td>)}</tr>
            </tbody>
          </table>
        </div>
      </section>
      {activeProduct && <ConceptDetail key={activeProduct.id} product={activeProduct} onChanged={reload} />}
    </div>}
  </div>
}
