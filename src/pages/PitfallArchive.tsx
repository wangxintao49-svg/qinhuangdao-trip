import { useState } from 'react'
import { useTripStore } from '../store/tripStore'
import { pageIntros } from '../data/pageIntros'
import PageIntro from '../components/PageIntro'
import { AlertTriangle, Archive, ShieldAlert, RotateCcw } from 'lucide-react'

const riskColors: Record<string, { bg: string; text: string; border: string }> = {
  '闭园风险': { bg: 'rgba(220,38,38,.18)', text: '#FB7185', border: 'rgba(220,38,38,.3)' },
  '评价分歧': { bg: 'rgba(245,158,11,.15)', text: '#FBBF24', border: 'rgba(245,158,11,.25)' },
  '性价比低': { bg: 'rgba(245,158,11,.15)', text: '#FBBF24', border: 'rgba(245,158,11,.25)' },
  '偏离主线': { bg: 'rgba(59,130,246,.15)', text: '#60A5FA', border: 'rgba(59,130,246,.25)' },
  '体验风险': { bg: 'rgba(220,38,38,.18)', text: '#FB7185', border: 'rgba(220,38,38,.3)' },
  '定位重复': { bg: 'rgba(139,92,246,.15)', text: '#A78BFA', border: 'rgba(139,92,246,.25)' },
}

export default function PitfallArchive() {
  const pitfalls = useTripStore((s) => s.pitfalls)
  const [tag, setTag] = useState<string | null>(null)

  const filters = [
    { key: null, label: '全部', count: pitfalls.length },
    { key: '闭园风险', label: '闭园', count: pitfalls.filter((p) => p.risks.includes('闭园风险')).length },
    { key: '评价分歧', label: '评价分歧', count: pitfalls.filter((p) => p.risks.includes('评价分歧')).length },
    { key: '偏离主线', label: '偏离主线', count: pitfalls.filter((p) => p.risks.includes('偏离主线')).length },
  ]

  const list = tag ? pitfalls.filter((p) => p.risks.includes(tag as any)) : pitfalls

  return (
    <div className="min-h-screen" style={{
      background: 'radial-gradient(circle at 70% 20%, rgba(242,196,109,.08), transparent 30%), linear-gradient(180deg, #040D18 0%, #0A1A2E 50%, #061525 100%)',
      color: '#E8D5A3',
    }}>
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-start gap-4 mb-8">
          <div className="flex-1">
            <PageIntro {...pageIntros.archive} />
            <h2 className="text-3xl font-bold flex items-center gap-3" style={{ color: '#F2C46D' }}>
              <Archive size="28" />
              避坑档案
            </h2>
            <p className="text-sm mt-1" style={{ color: 'rgba(232,213,163,.5)' }}>被剔除出本次行程的地点 · 谨慎参考</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-4xl font-bold" style={{ color: 'rgba(242,196,109,.6)' }}>{pitfalls.length}</div>
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl"
              style={{ background: 'rgba(242,196,109,.12)', border: '1px solid rgba(242,196,109,.2)' }}>
              <ShieldAlert size="24" style={{ color: '#F2C46D' }} />
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 mb-6 p-4 rounded-2xl" style={{ background: 'rgba(13,31,49,.6)', border: '1px solid rgba(242,196,109,.1)' }}>
          {filters.map((f) => (
            <button key={f.key ?? 'all'} onClick={() => setTag(f.key)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                tag === f.key
                  ? 'shadow-sm'
                  : 'hover:bg-white/5'
              }`}
              style={{
                background: tag === f.key ? 'rgba(242,196,109,.15)' : 'transparent',
                color: tag === f.key ? '#F2C46D' : 'rgba(232,213,163,.5)',
                border: tag === f.key ? '1px solid rgba(242,196,109,.3)' : '1px solid transparent',
              }}>
              {f.label} <span className="text-xs opacity-60">{f.count}</span>
            </button>
          ))}
        </div>

        {/* Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {list.map((p, i) => (
            <div key={p.id} className="rounded-[22px] p-5 transition-all hover:translate-y-[-2px]"
              style={{
                background: 'rgba(13,31,49,.82)',
                border: '1px solid rgba(242,196,109,.15)',
                boxShadow: '0 18px 44px rgba(0,0,0,.35)',
                backdropFilter: 'blur(8px)',
              }}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs" style={{ color: 'rgba(232,213,163,.3)' }}>#{i + 1}</span>
                  <h3 className="font-bold" style={{ color: '#F8E7C5' }}>{p.name}</h3>
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-bold"
                  style={{
                    background: p.status === '已删除' ? 'rgba(220,38,38,.2)' : 'rgba(245,158,11,.2)',
                    color: p.status === '已删除' ? '#FB7185' : '#FBBF24',
                    border: p.status === '已删除' ? '1px solid rgba(220,38,38,.3)' : '1px solid rgba(245,158,11,.3)',
                  }}>
                  {p.status}
                </span>
              </div>
              <p className="text-sm mb-4 leading-relaxed" style={{ color: 'rgba(248,231,197,.75)' }}>{p.reason}</p>
              <div className="flex flex-wrap gap-1.5 mb-3">
                {p.risks.map((r) => {
                  const rc = riskColors[r] || { bg: 'rgba(100,100,100,.15)', text: '#aaa', border: 'rgba(100,100,100,.25)' }
                  return (
                    <span key={r} className="px-2.5 py-1 rounded-full text-xs font-medium"
                      style={{ background: rc.bg, color: rc.text, border: `1px solid ${rc.border}` }}>
                      {r}
                    </span>
                  )
                })}
              </div>
              {p.canRetry && (
                <div className="pt-3 flex items-center gap-1.5 text-xs" style={{ borderTop: '1px solid rgba(242,196,109,.1)', color: 'rgba(232,213,163,.4)' }}>
                  <RotateCcw size="12" /> 未来可考虑
                </div>
              )}
            </div>
          ))}
        </div>

        {list.length === 0 && (
          <div className="text-center py-16 rounded-[22px]" style={{ background: 'rgba(13,31,49,.5)' }}>
            <AlertTriangle size="48" className="mx-auto mb-3" style={{ color: 'rgba(242,196,109,.3)' }} />
            <p style={{ color: 'rgba(232,213,163,.5)' }}>没有符合条件的记录</p>
          </div>
        )}

        <p className="text-center text-sm mt-12" style={{ color: 'rgba(232,213,163,.3)' }}>档案持续更新 · 让每一次旅行更值得</p>
      </div>
    </div>
  )
}
