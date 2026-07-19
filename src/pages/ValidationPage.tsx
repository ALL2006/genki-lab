import { BarChart3, CircleDollarSign, ClipboardList, Heart, Lightbulb, MessageSquareText, PackageCheck, ShoppingBag, Users } from 'lucide-react'
import { MetricCard } from '../components/MetricCard'
import { PageTitle } from '../components/PageTitle'
import { ResultChartCard } from '../components/ResultChartCard'
import { SectionCard } from '../components/SectionCard'
import { StatusBadge } from '../components/StatusBadge'
import { ValidationForm } from '../components/ValidationForm'

export function ValidationPage() {
  return (
    <div className="page-container">
      <PageTitle eyebrow="USER VALIDATION" title="新品概念用户验证" description="产品概念确定后，将在此开展真实用户测试。" actions={<StatusBadge tone="warning">尚未开放</StatusBadge>} />
      <SectionCard title="用户测试表单" description="表单字段已建立，当前不绑定具体产品，也不收集数据。" icon={ClipboardList}>
        <ValidationForm />
      </SectionCard>

      <div className="results-heading">
        <div><span className="eyebrow">RESULTS PANEL</span><h2>验证结果面板</h2><p>仅展示结果结构，完成真实用户测试后再接入统计结果。</p></div>
        <span className="results-heading__status"><i />等待数据回流</span>
      </div>

      <div className="metric-grid metric-grid--validation">
        <MetricCard label="参与人数" icon={Users} />
        <MetricCard label="产品兴趣" icon={Heart} />
        <MetricCard label="购买意愿" icon={ShoppingBag} />
        <MetricCard label="价格区间" icon={CircleDollarSign} />
      </div>
      <div className="result-grid">
        <ResultChartCard title="包装偏好" icon={PackageCheck} variant="bars" />
        <ResultChartCard title="饮用场景" icon={BarChart3} variant="donut" />
        <ResultChartCard title="高频反馈" icon={MessageSquareText} variant="line" />
        <ResultChartCard title="产品调整建议" icon={Lightbulb} variant="radar" />
      </div>
    </div>
  )
}
