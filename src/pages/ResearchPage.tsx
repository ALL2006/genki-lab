import { BookOpen, Boxes, Lightbulb, MessageCircle, Upload } from 'lucide-react'
import { PageTitle } from '../components/PageTitle'
import { SectionCard } from '../components/SectionCard'
import { SourceCard } from '../components/SourceCard'
import { StatusBadge } from '../components/StatusBadge'

const researchSections = [
  { key: 'A', title: '行业报告区', description: '用于归档行业资料、报告摘要与来源信息。', icon: BookOpen, placeholder: '等待研究资料接入' },
  { key: 'B', title: '竞品案例区', description: '用于整理公开案例、产品信息与对比维度。', icon: Boxes, placeholder: '等待组员补充行业数据' },
  { key: 'C', title: '用户评论区', description: '仅接入经过来源核验与匿名化处理的真实样本。', icon: MessageCircle, placeholder: '等待真实用户评论样本' },
  { key: 'D', title: '核心洞察区', description: '用于沉淀由研究证据支持的阶段性判断。', icon: Lightbulb, placeholder: '等待形成研究结论' },
]

export function ResearchPage() {
  return (
    <div className="page-container">
      <PageTitle eyebrow="RESEARCH HUB" title="资料与洞察" description="统一承接行业报告、竞品案例、真实用户反馈与研究结论，为趋势分析提供可追溯资料。" actions={<button className="secondary-button" disabled><Upload size={16} /> 接入资料</button>} />
      <div className="context-strip"><StatusBadge tone="warning">当前为空</StatusBadge><span>本页不展示虚构报告、评论或研究结论。</span></div>
      <div className="research-grid">
        {researchSections.map((section) => (
          <SectionCard key={section.key} title={`${section.key}. ${section.title}`} description={section.description} icon={section.icon} action={<span className="section-count">0 项资料</span>}>
            <SourceCard placeholderText={section.placeholder} />
          </SectionCard>
        ))}
      </div>
    </div>
  )
}
