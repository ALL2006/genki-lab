import { Activity, BrainCircuit, HeartPulse, Info, MapPin, MessageCircleHeart, Tags } from 'lucide-react'
import { EmptyState } from '../components/EmptyState'
import { PageTitle } from '../components/PageTitle'
import { PlaceholderChart } from '../components/PlaceholderChart'
import { SectionCard } from '../components/SectionCard'
import { TrendCard } from '../components/TrendCard'

export function TrendsPage() {
  return (
    <div className="page-container">
      <PageTitle eyebrow="TREND RADAR" title="趋势雷达" description="将真实评论与研究资料转化为结构化趋势信号，并保留证据来源和品牌适配评估。" />
      <div className="trend-empty-banner"><BrainCircuit size={23} /><div><strong>等待分析输入</strong><p>上传评论数据后，将在此展示趋势分析结果。</p></div><span>DEMO PLACEHOLDER / 待补充</span></div>

      <div className="trend-chart-grid">
        <SectionCard title="趋势关键词" description="关键词聚类与热度分布" icon={Tags}><PlaceholderChart title="关键词图谱" variant="bars" /></SectionCard>
        <SectionCard title="消费场景" description="场景提及与组合关系" icon={MapPin}><PlaceholderChart title="场景分布" variant="radar" /></SectionCard>
        <SectionCard title="用户情绪" description="真实样本的情绪结构" icon={MessageCircleHeart}><PlaceholderChart title="情绪趋势" variant="line" /></SectionCard>
        <SectionCard title="健康诉求" description="健康相关表达的结构化整理" icon={HeartPulse}><PlaceholderChart title="诉求构成" variant="donut" /></SectionCard>
      </div>

      <SectionCard title="趋势机会卡" description="完成分析后，将按统一字段生成可追溯的机会方向。" icon={Activity} action={<span className="section-count">预留 3 个卡位</span>}>
        <div className="trend-card-grid"><TrendCard slot={1} /><TrendCard slot={2} /><TrendCard slot={3} /></div>
      </SectionCard>

      <SectionCard title="趋势评分说明" description="评分规则将在研究方法与样本要求确定后配置。" icon={Info} tone="soft">
        <EmptyState compact title="等待确定评分方法" description="趋势分数、品牌适配度与证据权重均未配置。DEMO PLACEHOLDER / 待补充" />
      </SectionCard>
    </div>
  )
}
