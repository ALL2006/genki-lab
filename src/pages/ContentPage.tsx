import { FileInput, FileText, Image, Layers3, Megaphone, MonitorSmartphone, Sparkles, Video } from 'lucide-react'
import { ContentAssetCard } from '../components/ContentAssetCard'
import { EmptyState } from '../components/EmptyState'
import { FlowDiagram } from '../components/FlowDiagram'
import { PageTitle } from '../components/PageTitle'
import { SectionCard } from '../components/SectionCard'

const contentFlow = [
  { label: '产品定义' },
  { label: '卖点提炼' },
  { label: '文案生成' },
  { label: '视觉生成' },
  { label: '脚本与分镜' },
  { label: '多平台适配' },
]

const assetSections = [
  { title: '核心卖点提取区', description: '等待产品核心信息与研究证据接入。', icon: Sparkles },
  { title: '营销文案区', description: '等待生成并审核品牌传播文案。', icon: FileText },
  { title: '海报素材区', description: '等待视觉方向、素材规范与审批流程接入。', icon: Image },
  { title: '短视频脚本区', description: '仅预留脚本结构，当前不制作或接入视频。', icon: Video },
  { title: '视频分镜区', description: '仅预留分镜字段，当前不创建视频文件。', icon: Layers3 },
  { title: '多平台内容适配区', description: '等待确认目标平台与内容规格。', icon: MonitorSmartphone },
]

export function ContentPage() {
  return (
    <div className="page-container">
      <PageTitle eyebrow="CONTENT ASSETS" title="内容资产" description="把已确认的产品定义转化为可审核、可复用的内容资产。" />
      <SectionCard className="content-flow-card" title="内容生产流程" description="当前仅建立流程节点，不调用真实模型服务。" icon={Megaphone} tone="soft"><FlowDiagram steps={contentFlow} compact /></SectionCard>

      <SectionCard title="产品信息输入区" description="选择已评审产品后，自动带入产品定义字段。" icon={FileInput}>
        <div className="product-input-shell">
          <div className="product-input-shell__preview"><span>01</span><strong>等待选择产品概念</strong><small>DEMO PLACEHOLDER / 待补充</small></div>
          <div className="product-input-shell__fields"><span>产品名称</span><span>目标人群</span><span>核心场景</span><span>核心卖点</span></div>
        </div>
      </SectionCard>

      <div className="asset-grid">
        {assetSections.map((section) => <ContentAssetCard key={section.title} {...section} />)}
      </div>
      <EmptyState title="等待产品概念与内容策略接入" description="当前页面不包含营销结论、海报素材、脚本、分镜或视频。DEMO PLACEHOLDER / 待补充" />
    </div>
  )
}
