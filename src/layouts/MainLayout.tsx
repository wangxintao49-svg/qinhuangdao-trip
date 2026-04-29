import { Link, useLocation } from 'react-router-dom'
import type { ReactNode } from 'react'
import { Map, Route, MapPin, Bot, Calendar, AlertTriangle, Settings } from 'lucide-react'

const tabs = [
  { path: '/map', label: '地图', icon: Map },
  { path: '/route', label: '路线', icon: Route },
  { path: '/places', label: '地点库', icon: MapPin },
  { path: '/ai', label: 'AI 智行', icon: Bot },
  { path: '/plan', label: '行程', icon: Calendar },
  { path: '/pitfalls', label: '避坑', icon: AlertTriangle },
]

export default function MainLayout({ children }: { children: ReactNode }) {
  const { pathname } = useLocation()

  const isActive = (path: string) => pathname === path || (path !== '/map' && pathname.startsWith(path))

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'linear-gradient(180deg,#F6FBFD 0%,#EEF8FB 100%)' }}>
      {/* 顶部导航 */}
      <header className="sticky top-0 z-40" style={{ background: 'rgba(255,255,255,.72)', backdropFilter: 'blur(18px)', borderBottom: '1px solid rgba(6,43,85,.08)' }}>
        <div className="max-w-6xl mx-auto px-4 h-[76px] flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 shrink-0">
            <div className="w-11 h-11 rounded-full bg-gradient-to-br from-ocean-500 to-ocean-700 flex items-center justify-center text-white text-lg shadow-md">
              <MapPin size={18} />
            </div>
            <div className="hidden sm:block">
              <div className="font-bold text-sm" style={{ color: 'var(--qhd-navy)' }}>秦皇岛双站旅行地图</div>
              <div className="text-[10px]" style={{ color: 'var(--qhd-muted)' }}>北戴河站 → 秦皇岛站</div>
            </div>
          </Link>
          <nav className="flex items-center gap-1 overflow-x-auto">
            {tabs.map((t) => {
              const Icon = t.icon
              return (
                <Link key={t.path} to={t.path}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                    isActive(t.path)
                      ? 'text-white shadow-sm' + ' ' + (t.path === '/pitfalls' ? 'bg-red-600' : 'bg-ocean-600')
                      : 'text-gray-600 hover:bg-ocean-50'
                  }`}>
                  <Icon size={16} />
                  <span className="hidden sm:inline">{t.label}</span>
                </Link>
              )
            })}
          </nav>
          <Link to="/settings" className="text-gray-400 hover:text-ocean-600 transition-colors p-2">
            <Settings size={20} />
          </Link>
        </div>
      </header>

      {/* 内容 */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-6 pb-20 lg:pb-6">{children}</main>

      {/* 移动端底栏 */}
      <nav className="sticky bottom-0 z-40 md:hidden" style={{ background: 'rgba(255,255,255,.9)', backdropFilter: 'blur(18px)', borderTop: '1px solid rgba(6,43,85,.08)' }}>
        <div className="flex justify-around py-2">
          {tabs.map((t) => {
            const Icon = t.icon
            return (
              <Link key={t.path} to={t.path}
                className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg text-[10px] font-medium transition-colors ${
                  isActive(t.path) ? 'text-ocean-600' : 'text-gray-500'
                }`}>
                <Icon size={18} />
                <span>{t.label}</span>
              </Link>
            )
          })}
        </div>
      </nav>

      {/* 页脚署名 */}
      <div className="text-center text-[10px] py-3" style={{ color: 'var(--qhd-muted)' }}>小光出品 / 设计制作：小光</div>
    </div>
  )
}
