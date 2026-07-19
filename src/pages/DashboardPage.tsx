import { ArrowDown, BarChart3, Beaker, CheckCircle2, FileStack, Megaphone, Radar, ShieldCheck, Sparkles, Users } from 'lucide-react'
import { FlowDiagram } from '../components/FlowDiagram'
import { ModuleCard } from '../components/ModuleCard'
import { PageTitle } from '../components/PageTitle'
import { SectionCard } from '../components/SectionCard'
import { StatusBadge } from '../components/StatusBadge'

const systemFlow = [
  { label: '外部资料', note: '待研究资料接入' },
  { label: '趋势洞察', note: '识别机会方向' },
  { label: '产品定义', note: '形成候选概念' },
  { label: '营销内容', note: '建立表达体系' },
  { label: '用户验证', note: '收集真实反馈' },
  { label: '数据回流', note: '支持持续迭代' },
]

const modules = [
  { index: '01', title: '趋势雷达', description: '承接评论与研究资料，预留趋势分析和机会识别框架。', to: '/trends', icon: Radar, accent: 'green' as const },
  { index: '02', title: '产品概念工坊', description: '将趋势机会转化为候选产品概念，并支持多维对比。', to: '/concepts', icon: Beaker, accent: 'mint' as const },
  { index: '03', title: '产品评审台', description: '汇总评审维度与状态，帮助团队推进概念筛选。', to: '/concepts', icon: CheckCircle2, accent: 'green' as const },
  { index: '04', title: '营销内容工厂', description: '预留文案、海报、脚本、分镜与平台适配生产链路。', to: '/content', icon: Megaphone, accent: 'red' as const },
  { index: '05', title: '用户验证中心', description: '承接真实用户测试，并为结果回流预留数据面板。', to: '/validation', icon: Users, accent: 'mint' as const },
]

export function DashboardPage() {
  return (
    <div className="page-container dashboard-page">
      <section className="dashboard-hero">
        <div className="dashboard-hero__orb dashboard-hero__orb--one" />
        <div className="dashboard-hero__orb dashboard-hero__orb--two" />
        <div className="dashboard-hero__copy">
          <div className="hero-kicker"><Sparkles size={16} /> 2026 AI先锋未来人才大赛 · 元气森林命题</div>
          <h1><span>GENKI LAB</span><br />元气创新引擎</h1>
          <p>AI驱动的饮品创新全链路原型</p>
          <div className="hero-meta">
            <span><ShieldCheck size={16} /> 框架已建立</span>
            <span><FileStack size={16} /> 内容待研究接入</span>
          </div>
        </div>
        <div className="dashboard-hero__visual" aria-hidden="true">
          <div className="system-orbit system-orbit--outer" />
          <div className="system-orbit system-orbit--inner" />
          <div className="system-core"><BarChart3 size={29} /><strong>AI</strong><small>INNOVATION</small></div>
          <span className="bubble bubble--a" /><span className="bubble bubble--b" /><span className="bubble bubble--c" />
        </div>
        <div className="hero-scroll"><span>系统全景</span><ArrowDown size={16} /></div>
      </section>

      <div className="prototype-notice">
        <span className="prototype-notice__dot" />
        <p><strong>开题阶段提示</strong> 当前为开题阶段系统框架，数据与内容将在后续研究中逐步接入。</p>
        <StatusBadge tone="warning">DEMO PLACEHOLDER / 待补充</StatusBadge>
      </div>

      <section className="dashboard-section">
        <PageTitle eyebrow="SYSTEM BLUEPRINT" title="从资料到验证的完整闭环" description="六个环节共享统一的数据结构，为后续研究、生成和验证保留清晰接口。" />
        <SectionCard tone="soft"><FlowDiagram steps={systemFlow} /></SectionCard>
      </section>

      <section className="dashboard-section">
        <PageTitle eyebrow="CORE MODULES" title="五个核心工作模块" description="从趋势发现到真实用户反馈，每个模块都可以独立填充并持续迭代。" />
        <div className="module-grid">{modules.map((module) => <ModuleCard key={module.index} {...module} />)}</div>
      </section>
    </div>
  )
}
