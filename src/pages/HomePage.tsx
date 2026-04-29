import { Link } from 'react-router-dom'
import { Map, Route, Bot, ArrowRight } from 'lucide-react'

export default function HomePage() {
  return (
    <section className="home-hero">
      {/* 透明导航 */}
      <header className="absolute top-0 left-0 right-0 z-20" style={{ background: 'rgba(255,255,255,.08)', backdropFilter: 'blur(8px)', borderBottom: '1px solid rgba(255,255,255,.08)' }}>
        <div className="max-w-[1280px] mx-auto px-6 h-[76px] flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-white/20 flex items-center justify-center text-white text-lg shadow-md border border-white/20">
              <Map size={18} />
            </div>
            <div>
              <div className="font-bold text-sm text-white">秦皇岛双站旅行地图</div>
              <div className="text-[10px] text-white/60">北戴河站 → 秦皇岛站</div>
            </div>
          </Link>
          <nav className="flex items-center gap-2">
            <Link to="/map" className="px-4 py-2 rounded-xl text-sm font-medium text-white/80 hover:text-white hover:bg-white/10 transition-colors">🗺️ 地图</Link>
            <Link to="/route" className="px-4 py-2 rounded-xl text-sm font-medium text-white/80 hover:text-white hover:bg-white/10 transition-colors">🛣️ 路线</Link>
            <Link to="/places" className="px-4 py-2 rounded-xl text-sm font-medium text-white/80 hover:text-white hover:bg-white/10 transition-colors">📍 地点</Link>
          </nav>
        </div>
      </header>

      <div className="relative z-10 max-w-[1280px] mx-auto px-6 pt-[220px]">
        {/* 上标 */}
        <p className="text-sm font-medium tracking-widest mb-4" style={{ color: 'rgba(255,255,255,.6)' }}>北戴河站 → 秦皇岛站</p>

        {/* 主标题 */}
        <h1 className="text-6xl sm:text-7xl font-extrabold text-white mb-4 leading-tight drop-shadow-2xl">
          秦皇岛双站旅行地图
        </h1>
        <p className="text-xl text-white/80 mb-2 font-light">只看这次旅行真正值得去的地方</p>
        <p className="text-sm text-white/40 mb-12">21个精选吃喝玩乐点 · AI 智能规划 · 真实路线导航</p>

        {/* CTA */}
        <div className="flex gap-4 mb-20">
          <Link to="/map" className="btn-primary text-white text-base no-underline">
            立即进入 <ArrowRight size={20} />
          </Link>
          <Link to="/route" className="btn-glass no-underline text-base">
            查看路线
          </Link>
        </div>

        {/* 功能卡 */}
        <div className="grid sm:grid-cols-3 gap-5 max-w-3xl">
          {[
            { to: '/map', icon: Map, label: '探索地图', desc: '查看所有地点分布与详情' },
            { to: '/route', icon: Route, label: '路线规划', desc: '真实路线距离与耗时估算' },
            { to: '/ai', icon: Bot, label: 'AI 规划', desc: '智能生成专属行程方案' },
          ].map((c) => (
            <Link key={c.to} to={c.to}
              className="group rounded-2xl p-5 backdrop-blur-xl transition-all hover:-translate-y-1"
              style={{ background: 'rgba(255,255,255,.12)', border: '1px solid rgba(255,255,255,.15)' }}>
              <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center mb-3 group-hover:bg-white/25 transition-colors">
                <c.icon size={20} className="text-white" />
              </div>
              <div className="text-white font-bold text-sm mb-1">{c.label}</div>
              <div className="text-white/60 text-xs">{c.desc}</div>
            </Link>
          ))}
        </div>
      </div>

      {/* 署名 */}
      <div className="absolute bottom-6 left-0 right-0 text-center z-10">
        <span className="text-xs" style={{ color: 'rgba(255,255,255,.3)' }}>小光出品 / 设计制作：小光</span>
      </div>
    </section>
  )
}
