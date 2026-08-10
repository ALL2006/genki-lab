import { useEffect, useState } from 'react'
import {
  BarChart3,
  Box,
  ChevronDown,
  CircleGauge,
  Database,
  FileText,
  Inbox,
  ListFilter,
  Layers3,
  Menu,
  PanelsTopLeft,
  Search,
  Settings2,
  UsersRound,
} from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { MobileNavigation } from './MobileNavigation'
import type { NavigationItem } from './MobileNavigation'

const navigationItems: NavigationItem[] = [
  { label: '运行', to: '/dashboard' },
  { label: '数据源', to: '/data-sources' },
  { label: '趋势', to: '/trends' },
  { label: '产品概念', to: '/concepts' },
  { label: '用户验证', to: '/validation' },
  { label: '分析批次', to: '/analysis-batches' },
  { label: '模型评测', to: '/evaluation' },
]

const sidebarGroups = [
  {
    label: '工作台',
    items: [
      { label: '收件箱', to: '/dashboard?view=inbox', icon: Inbox },
      { label: '运行', to: '/dashboard', icon: CircleGauge },
      { label: '数据源', to: '/data-sources', icon: Database },
      { label: '原始资料', to: '/data-sources?view=raw', icon: FileText },
    ],
  },
  {
    label: '研究',
    items: [
      { label: '趋势', to: '/trends', icon: ListFilter },
      { label: '产品概念', to: '/concepts', icon: Box },
      { label: '用户验证', to: '/validation', icon: UsersRound },
    ],
  },
  {
    label: '系统',
    items: [
      { label: '分析批次', to: '/analysis-batches', icon: Layers3 },
      { label: '模型评测', to: '/evaluation', icon: BarChart3 },
    ],
  },
]

export function AppHeader() {
  const [menuOpen, setMenuOpen] = useState(false)
  const location = useLocation()

  useEffect(() => setMenuOpen(false), [location.pathname])
  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [menuOpen])

  return (
    <>
      <aside className="app-sidebar">
        <Link to="/dashboard" className="sidebar-brand" aria-label="GENKI LAB 首页">
          <span className="sidebar-brand__mark"><PanelsTopLeft size={16} /></span>
          <span><strong>GENKI LAB</strong><small>研究与产品决策</small></span>
        </Link>

        <button type="button" className="sidebar-workspace-switcher"><span>复赛工作区</span><ChevronDown size={13} /></button>

        <nav className="sidebar-navigation" aria-label="主导航">
          {sidebarGroups.map((group) => <div className="sidebar-navigation__group" key={group.label}>
            <span className="sidebar-navigation__label">{group.label}</span>
            {group.items.map((item) => {
              const isActive = `${location.pathname}${location.search}` === item.to
              return <Link className={isActive ? 'active' : ''} key={item.to} to={item.to}><item.icon size={14} /><span>{item.label}</span></Link>
            })}
          </div>)}
        </nav>

        <Link className="sidebar-system-status" to="/evaluation"><span><i />系统状态</span><Settings2 size={14} /></Link>
      </aside>

      <header className="workspace-toolbar">
        <div className="toolbar-search" role="search" aria-label="Command Search（静态原型）"><Search size={14} /><span>Command Search</span><kbd>/</kbd></div>
        <div className="toolbar-state"><i /><span>API 已连接</span></div>
        <button type="button" className="toolbar-user-menu" aria-label="打开用户菜单"><span>GL</span><ChevronDown size={12} /></button>
        <button type="button" className="menu-button" onClick={() => setMenuOpen(true)} aria-label="打开菜单"><Menu size={18} /></button>
      </header>
      <MobileNavigation items={navigationItems} open={menuOpen} onClose={() => setMenuOpen(false)} />
    </>
  )
}
