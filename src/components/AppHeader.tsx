import { useEffect, useState } from 'react'
import { Menu, Sprout } from 'lucide-react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { MobileNavigation } from './MobileNavigation'
import type { NavigationItem } from './MobileNavigation'

const navigationItems: NavigationItem[] = [
  { label: '首页', to: '/dashboard' },
  { label: '资料洞察', to: '/research' },
  { label: '趋势雷达', to: '/trends' },
  { label: '产品工坊', to: '/concepts' },
  { label: '内容工厂', to: '/content' },
  { label: '用户验证', to: '/validation' },
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
      <header className="app-header">
        <div className="app-header__inner">
          <Link to="/dashboard" className="brand" aria-label="GENKI LAB 首页">
            <span className="brand__mark"><Sprout size={20} /></span>
            <span><strong>GENKI LAB</strong><small>元气创新引擎</small></span>
          </Link>
          <nav className="desktop-navigation" aria-label="主导航">
            {navigationItems.map((item) => <NavLink key={item.to} to={item.to}>{item.label}</NavLink>)}
          </nav>
          <div className="app-header__tools">
            <span className="demo-pill"><i />开题原型 DEMO</span>
            <button type="button" className="menu-button" onClick={() => setMenuOpen(true)} aria-label="打开菜单"><Menu size={21} /></button>
          </div>
        </div>
      </header>
      <MobileNavigation items={navigationItems} open={menuOpen} onClose={() => setMenuOpen(false)} />
    </>
  )
}
