import { Link } from 'react-router-dom'
import { pageIntros } from '../data/pageIntros'
import PageIntro from '../components/PageIntro'

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-ocean-600 via-ocean-800 to-cyan-900 relative overflow-hidden">
      <PageIntro {...pageIntros.home} />
      {/* 装饰波浪 */}
      <svg className="absolute bottom-0 w-full h-40 opacity-20" viewBox="0 0 1440 320" preserveAspectRatio="none">
        <path fill="white" d="M0,224L48,213.3C96,203,192,181,288,181.3C384,181,480,203,576,213.3C672,224,768,224,864,202.7C960,181,1056,139,1152,138.7C1248,139,1344,181,1392,202.7L1440,224L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z" />
      </svg>

      <div className="relative z-10 text-center px-6 max-w-3xl">
        <div className="text-7xl mb-6 animate-bounce">🏖️</div>
        <h1 className="text-5xl sm:text-7xl font-extrabold text-white mb-4 drop-shadow-lg">
          秦皇岛之旅
        </h1>
        <p className="text-xl text-ocean-200 mb-3 font-light">
          北戴河站 → 秦皇岛站 · 21个精选吃喝玩乐点
        </p>
        <p className="text-ocean-300/70 text-sm mb-12">设计/制作：小光</p>

        <div className="grid sm:grid-cols-3 gap-4 max-w-2xl mx-auto mb-10">
          {[
            { to: '/map', label: '🗺️ 探索地图', desc: '查看所有地点分布' },
            { to: '/places', label: '📍 地点库', desc: '21个精选地点卡片' },
            { to: '/ai', label: '🤖 AI规划', desc: '智能生成行程方案' },
          ].map((c) => (
            <Link key={c.to} to={c.to}
              className="bg-white/15 backdrop-blur-md border border-white/20 rounded-2xl p-6 text-white hover:bg-white/25 transition-all hover:-translate-y-1">
              <div className="text-2xl font-bold mb-1">{c.label}</div>
              <div className="text-white/70 text-sm">{c.desc}</div>
            </Link>
          ))}
        </div>

        <div className="flex gap-4 justify-center">
          <Link to="/map" className="bg-white text-ocean-700 px-10 py-4 rounded-2xl font-bold text-lg shadow-2xl hover:-translate-y-1 transition-all">
            开始探索
          </Link>
          <Link to="/route" className="bg-white/20 backdrop-blur-md text-white px-10 py-4 rounded-2xl font-bold text-lg border-2 border-white/30 hover:bg-white/30 transition-all">
            规划路线
          </Link>
        </div>
      </div>
    </div>
  )
}
