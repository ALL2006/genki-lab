import { Columns3, Filter, Gauge, LayoutList, SlidersHorizontal } from 'lucide-react'
import { EmptyState } from '../components/EmptyState'
import { PageTitle } from '../components/PageTitle'
import { PlaceholderChart } from '../components/PlaceholderChart'
import { ProductConceptCard } from '../components/ProductConceptCard'
import { SectionCard } from '../components/SectionCard'
import { StatusBadge } from '../components/StatusBadge'

const detailFields = ['产品名称', '产品类别', '目标人群', '核心场景', '主口味', '辅助口味', '核心卖点', '包装方向', '建议价格', '传播文案']

export function ConceptsPage() {
  return (
    <div className="page-container">
      <PageTitle eyebrow="CONCEPT STUDIO" title="产品概念工坊" description="承接趋势机会，形成可比较、可评审、可验证的候选新品概念。" />
      <div className="filter-bar">
        <div><Filter size={17} /><strong>产品状态</strong></div>
        <div className="filter-chips"><button className="is-active">全部</button><button disabled>待评审</button><button disabled>验证中</button><button disabled>已归档</button></div>
        <span>0 个真实概念</span>
      </div>

      <div className="concept-layout">
        <SectionCard className="concept-list" title="新品概念列表" description="候选新品将在趋势分析完成后生成。" icon={LayoutList}>
          <ProductConceptCard />
        </SectionCard>
        <SectionCard className="concept-detail" title="产品概念详情" description="选择候选概念后查看完整产品定义。" icon={SlidersHorizontal} action={<StatusBadge tone="neutral">结构预览</StatusBadge>}>
          <div className="detail-field-grid">
            {detailFields.map((field) => <div key={field}><span>{field}</span><strong>待补充</strong></div>)}
          </div>
          <small className="placeholder-caption">DEMO PLACEHOLDER / 待补充</small>
        </SectionCard>
      </div>

      <div className="concept-bottom-grid">
        <SectionCard title="多产品对比区" description="支持候选概念横向比较，当前尚无可比较产品。" icon={Columns3}><EmptyState compact title="等待至少两个候选新品" /></SectionCard>
        <SectionCard title="产品评分雷达图" description="趋势潜力、品牌适配度、差异化、视觉传播力与用户意愿。" icon={Gauge}><PlaceholderChart title="五维评分" variant="radar" message="评分维度已预留，等待真实评审结果。" /></SectionCard>
      </div>
    </div>
  )
}
