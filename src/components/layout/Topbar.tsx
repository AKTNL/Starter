import { Bell, Menu, Search } from 'lucide-react'

interface TopbarProps {
  onOpenMobileMenu: () => void
}

export function Topbar({ onOpenMobileMenu }: TopbarProps) {
  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-3 border-b border-white/10 bg-[#0b0d12]/80 px-4 backdrop-blur lg:px-6">
      <button
        type="button"
        onClick={onOpenMobileMenu}
        aria-label="打开导航菜单"
        className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-white/60 transition-colors hover:bg-white/5 hover:text-white lg:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>

      <div className="relative ml-auto w-full max-w-xs">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
        <input
          type="search"
          placeholder="搜索订单、客户…"
          aria-label="全局搜索"
          className="w-full rounded-lg border border-white/10 bg-white/5 py-2 pl-9 pr-3 text-sm text-white placeholder:text-white/30 focus:border-brand-500/50 focus:outline-none"
        />
      </div>

      <button
        type="button"
        aria-label="通知"
        className="relative grid h-9 w-9 shrink-0 place-items-center rounded-lg text-white/60 transition-colors hover:bg-white/5 hover:text-white"
      >
        <Bell className="h-5 w-5" />
        <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-red-500" />
      </button>

      <div className="flex shrink-0 items-center gap-2">
        <span className="grid h-8 w-8 place-items-center rounded-full bg-brand-500/20 text-xs font-medium text-brand-300">
          K
        </span>
        <span className="hidden text-sm text-white/70 sm:inline">kev1n</span>
      </div>
    </header>
  )
}
