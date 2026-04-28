import { useState } from 'react'
import { useTripStore } from '../store/tripStore'
import { pageIntros } from '../data/pageIntros'
import PageIntro from '../components/PageIntro'

const riskColors: Record<string, string> = {
  '闭园风险': 'chip-red',
  '评价分歧': 'chip-yellow',
  '性价比低': 'chip-yellow',
  '偏离主线': 'chip-blue',
  '体验风险': 'chip-red',
  '定位重复': 'chip-blue',
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
    <div className="min-h-[80vh]">
      <div className="flex items-center gap-4 mb-6">
        <div>
          <PageIntro {...pageIntros.archive} />
          <h2 className="text-2xl font-bold text-gray-800">⚠️ 避坑档案</h2>
          <p className="text-sm text-gray-500">被剔除出本次行程的地点</p>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <div className="text-4xl font-bold text-red-400">{pitfalls.length}</div>
          <div className="w-14 h-14 bg-red-100 rounded-xl flex items-center justify-center text-2xl">📜</div>
        </div>
      </div>

      <div className="card p-5 mb-6">
        <div className="flex flex-wrap gap-2">
          {filters.map((f) => (
            <button key={f.key ?? 'all'} onClick={() => setTag(f.key)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                tag === f.key ? 'bg-gray-800 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-100'
              }`}>
              {f.label} <span className="text-xs opacity-60">{f.count}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {list.map((p, i) => (
          <div key={p.id} className="bg-gray-800/70 backdrop-blur border border-gray-700 rounded-2xl p-5 hover:border-gray-500 transition-colors">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-gray-500 text-sm">#{i + 1}</span>
                <h3 className="font-bold text-white">{p.name}</h3>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-bold ${p.status === '已删除' ? 'bg-red-500/20 text-red-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                {p.status}
              </span>
            </div>
            <p className="text-gray-300 text-sm mb-4 leading-relaxed">{p.reason}</p>
            <div className="flex flex-wrap gap-1.5 mb-3">
              {p.risks.map((r) => (
                <span key={r} className={riskColors[r] || 'chip'}>{r}</span>
              ))}
            </div>
            {p.canRetry && (
              <div className="pt-3 border-t border-gray-700 text-xs text-gray-500">🔄 未来可考虑</div>
            )}
          </div>
        ))}
      </div>

      {list.length === 0 && (
        <div className="card p-12 text-center text-gray-500">
          <div className="text-4xl mb-2">📭</div>
          <p>没有符合条件的记录</p>
        </div>
      )}

      <p className="text-center text-gray-500 text-sm mt-12">档案持续更新 · 让每一次旅行更值得</p>
    </div>
  )
}
