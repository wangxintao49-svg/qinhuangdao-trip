import { Link, useLocation } from 'react-router-dom'
import type { ReactNode } from 'react'

const tabs = [
  { path: '/map', label: '地图', icon: '🗺️' },
  { path: '/route', label: '路线', icon: '🛣️' },
  { path: '/places', label: '地点', icon: '📍' },
  { path: '/ai', label: 'AI', icon: '🤖' },
  { path: '/plan', label: '行程', icon: '📋' },
  { path: '/pitfalls', label: '避坑', icon: '⚠️' },
]

export default function MainLayout({ children }: { children: ReactNode }) {
  const { pathname } = useLocation()

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-ocean-50 via-white to-ocean-50">
      {/* 顶部栏 */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-ocean-100">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 shrink-0">
            <span className="text-xl">🏖️</span>
            <span className="font-bold text-ocean-800 hidden sm:inline">秦皇岛之旅</span>
          </Link>
          <nav className="flex items-center gap-1 overflow-x-auto">
            {tabs.map((t) => (
              <Link
                key={t.path}
                to={t.path}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  pathname === t.path ? 'bg-ocean-500 text-white' : 'text-gray-600 hover:bg-ocean-50'
                }`}
              >
                <span>{t.icon}</span>
                <span className="hidden sm:inline">{t.label}</span>
              </Link>
            ))}
          </nav>
          <Link to="/settings" className="text-lg text-gray-500 hover:text-ocean-600">⚙️</Link>
        </div>
      </header>

      {/* 内容 */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-6">{children}</main>

      {/* 移动端底栏 */}
      <nav className="sticky bottom-0 z-40 bg-white/90 backdrop-blur-xl border-t border-ocean-100 md:hidden">
        <div className="flex justify-around py-2">
          {tabs.map((t) => (
            <Link key={t.path} to={t.path}
              className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg text-xs font-medium transition-colors ${
                pathname === t.path ? 'text-ocean-600' : 'text-gray-500'
              }`}>
              <span className="text-lg">{t.icon}</span>
              <span>{t.label}</span>
            </Link>
          ))}
        </div>
      </nav>
    </div>
  )
}
