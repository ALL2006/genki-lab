import { FlaskConical } from 'lucide-react'

export function DemoDataBanner({ children = '当前页面展示模拟任务与模拟分析结果，不代表真实采集、市场结论或产品验证。' }: { children?: string }) {
  return <div className="demo-data-banner"><FlaskConical size={18} /><strong>DEMO DATA</strong><span>{children}</span></div>
}
