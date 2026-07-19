import { NavLink } from 'react-router-dom'
import { X } from 'lucide-react'

export interface NavigationItem {
  label: string
  to: string
}

interface MobileNavigationProps {
  items: NavigationItem[]
  open: boolean
  onClose: () => void
}

export function MobileNavigation({ items, open, onClose }: MobileNavigationProps) {
  return (
    <div className={`mobile-navigation${open ? ' is-open' : ''}`} aria-hidden={!open}>
      <button className="mobile-navigation__backdrop" onClick={onClose} tabIndex={open ? 0 : -1} aria-label="关闭导航" />
      <aside className="mobile-navigation__panel" aria-label="移动端导航">
        <div className="mobile-navigation__top">
          <div><small>GENKI LAB</small><strong>创新工作台</strong></div>
          <button type="button" onClick={onClose} aria-label="关闭菜单"><X size={21} /></button>
        </div>
        <nav>
          {items.map((item, index) => (
            <NavLink key={item.to} to={item.to} onClick={onClose} tabIndex={open ? 0 : -1}>
              <span>{String(index + 1).padStart(2, '0')}</span>{item.label}
            </NavLink>
          ))}
        </nav>
        <div className="mobile-navigation__footer">开题原型 · DEMO</div>
      </aside>
    </div>
  )
}
