import { Outlet } from 'react-router-dom'
import { AppHeader } from '../components/AppHeader'

export function AppLayout() {
  return (
    <div className="app-shell">
      <AppHeader />
      <main className="app-main"><Outlet /></main>
      <footer className="app-footer">
        <div><strong>GENKI LAB</strong><span>元气创新引擎 · 2026 AI先锋未来人才大赛</span></div>
        <small>当前版本为开题阶段前端框架，不代表完整市场研究和真实产品研发结果。</small>
      </footer>
    </div>
  )
}
