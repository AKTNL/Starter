import { ChevronLeft } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { NAV_ITEMS } from '@/data/navigation'
import { cn } from '@/lib/utils'

interface SidebarProps {
  /** 桌面端是否折叠为仅图标 */
  collapsed: boolean
  onToggleCollapsed: () => void
  /** 移动端抽屉是否展开 */
  mobileOpen: boolean
  onCloseMobile: () => void
}

export function Sidebar({
  collapsed,
  onToggleCollapsed,
  mobileOpen,
  onCloseMobile,
}: SidebarProps) {
  return (
    <aside
      className={cn(
        'fixed inset-y-0 left-0 z-50 flex flex-col border-r border-white/10 bg-[#0f1117]',
        'transition-[width,transform] duration-200 ease-out',
        collapsed ? 'w-16' : 'w-60',
        // 移动端默认移出视口，展开时滑入；lg 以上始终固定显示
        mobileOpen ? 'translate-x-0' : '-translate-x-full',
        'lg:translate-x-0',
      )}
    >
      <div className="flex h-16 shrink-0 items-center gap-3 overflow-hidden border-b border-white/10 px-4">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-brand-500 text-sm font-bold text-white">
          S
        </span>
        <span
          className={cn(
            'truncate text-sm font-semibold text-white',
            collapsed && 'lg:hidden',
          )}
        >
          Starter
        </span>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            onClick={onCloseMobile}
            title={collapsed ? label : undefined}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                isActive
                  ? 'bg-brand-500/15 text-brand-300'
                  : 'text-white/60 hover:bg-white/5 hover:text-white',
              )
            }
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span className={cn('truncate', collapsed && 'lg:hidden')}>
              {label}
            </span>
          </NavLink>
        ))}
      </nav>

      <button
        type="button"
        onClick={onToggleCollapsed}
        className={cn(
          'hidden h-14 shrink-0 items-center gap-3 border-t border-white/10 px-4 text-sm text-white/50',
          'transition-colors hover:bg-white/5 hover:text-white lg:flex',
          collapsed && 'lg:justify-center lg:px-0',
        )}
      >
        <ChevronLeft
          className={cn('h-4 w-4 shrink-0 transition-transform', collapsed && 'rotate-180')}
        />
        <span className={cn(collapsed && 'hidden')}>收起侧边栏</span>
      </button>
    </aside>
  )
}
