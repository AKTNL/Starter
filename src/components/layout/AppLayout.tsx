import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'

export function AppLayout() {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="min-h-full bg-[#0b0d12]">
      <Sidebar
        collapsed={collapsed}
        onToggleCollapsed={() => setCollapsed((value) => !value)}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />

      {mobileOpen ? (
        <div
          role="presentation"
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
        />
      ) : null}

      <div
        className={cn(
          'flex min-h-screen flex-col transition-[padding] duration-200 ease-out',
          collapsed ? 'lg:pl-16' : 'lg:pl-60',
        )}
      >
        <Topbar onOpenMobileMenu={() => setMobileOpen(true)} />
        <main className="flex-1 p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
