import { useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useTripStore } from '../store/tripStore'
import { suggestPlaces } from '../services/api'
import { pageIntros } from '../data/pageIntros'
import PageIntro from '../components/PageIntro'
import { imgUrl } from '../utils/assets'

const iconMap: Record<string, string> = { station: '🚉', play: '🎯', food: '🍽️', rainy: '🏛️' }

export default function PlaceGallery() {
  const [cat, setCat] = useState<string>('all')
  const [q, setQ] = useState('')
  const [suggestions, setSuggestions] = useState<Array<{ title: string; address: string }>>([])
  const suggestTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const { toggleWish, wishlist, spots } = useTripStore()

  const list = spots
    .filter((s) => cat === 'all' || s.category === cat)
    .filter((s) => !q || s.name.includes(q) || s.tags.some((t) => t.includes(q)))

  const handleSearch = (val: string) => {
    setQ(val)
    setSuggestions([])
    clearTimeout(suggestTimer.current)
    if (!val.trim() || spots.some((s) => s.name.includes(val))) return
    suggestTimer.current = setTimeout(async () => {
      setSuggestions(await suggestPlaces(val))
    }, 300)
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <PageIntro {...pageIntros.gallery} />
        <h2 className="text-2xl font-bold text-ocean-800">📍 地点库</h2>
        <span className="text-sm text-gray-500 bg-white px-3 py-1 rounded-full border">{spots.length} 个地点</span>
        <div className="flex flex-wrap gap-1.5 sm:gap-2 ml-auto">
          {['all', 'play', 'food', 'rainy'].map((k) => (
            <button key={k} onClick={() => setCat(k)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${cat === k ? 'bg-ocean-500 text-white' : 'bg-white border border-ocean-100 text-gray-600'}`}>
              {k === 'all' ? '📋 全部' : k === 'play' ? '🎯 玩乐' : k === 'food' ? '🍽️ 吃喝' : '🏛️ 雨天'}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-6 relative">
        <input value={q} onChange={(e) => handleSearch(e.target.value)} placeholder="搜索地点或标签..."
          className="w-full max-w-md px-4 py-3 rounded-xl border border-ocean-200 text-sm focus:outline-none focus:ring-2 focus:ring-ocean-400" />
        {suggestions.length > 0 && (
          <div className="absolute top-full mt-1 left-0 max-w-md w-full bg-white rounded-xl shadow-lg border z-20 max-h-48 overflow-y-auto">
            {suggestions.map((s, i) => (
              <button key={i} onClick={() => { setQ(s.title); setSuggestions([]) }}
                className="w-full text-left px-4 py-2.5 text-sm hover:bg-ocean-50 border-b last:border-0">
                <span className="text-gray-800">{s.title}</span>
                <span className="text-gray-400 text-xs block truncate">{s.address}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {list.map((s) => (
          <div key={s.id} className="card overflow-hidden hover:shadow-xl transition-shadow">
            {s.imageUrl && (
              <div className="h-40 overflow-hidden bg-gray-100">
                <img src={imgUrl(s.imageUrl)} alt={s.name} className="w-full h-full object-cover" loading="lazy" />
              </div>
            )}
            <div className={s.imageUrl ? 'p-4' : 'p-5'}>
              {!s.imageUrl && (
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-11 h-11 bg-ocean-100 rounded-xl flex items-center justify-center text-xl">{iconMap[s.category] || '📍'}</div>
                  <div>
                    <div className="font-bold text-gray-800">{s.priority === 'core' && <span className="text-yellow-500">⭐ </span>}{s.name}</div>
                    <div className="text-sm text-gray-500">{s.type}</div>
                  </div>
                </div>
              )}
              {s.imageUrl && (
                <h3 className="font-bold text-gray-800 mb-1">{s.priority === 'core' && <span className="text-yellow-500">⭐ </span>}{s.name}</h3>
              )}
              {s.ratingText && <p className="text-xs text-gray-500 mb-2">{s.ratingText}</p>}
              <p className="text-gray-600 text-sm mb-2">📍 {s.address}</p>
              <div className="flex flex-wrap gap-1.5 mb-3">
                {s.tags.slice(0, 4).map((t, i) => <span key={i} className="chip-blue text-xs">{t}</span>)}
              </div>
              <div className="bg-gray-50 rounded-xl p-3 mb-3 flex items-center justify-between text-sm">
                <span className="text-gray-500">🕐 {s.bestTime}</span>
                <span className="text-yellow-500">{'★'.repeat(s.rating)}{'☆'.repeat(5 - s.rating)}</span>
              </div>
              <p className="text-gray-600 text-sm mb-2">{s.intro || s.note}</p>
              {s.caution && (
                <details className="mb-3 text-xs">
                  <summary className="text-amber-600 cursor-pointer hover:text-amber-700 font-medium">⚠️ 避坑提示</summary>
                  <p className="mt-1 text-gray-500 pl-4">{s.caution}</p>
                </details>
              )}
              <div className="flex gap-2">
                <Link to="/map" className="flex-1 text-center py-2.5 rounded-xl bg-ocean-50 text-ocean-700 text-sm font-medium hover:bg-ocean-100">🗺️ 地图</Link>
                <button onClick={() => toggleWish(s.id)}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-50 text-emerald-700 text-sm font-medium hover:bg-emerald-100">
                  {wishlist.includes(s.id) ? '❤️ 已收藏' : '🤍 收藏'}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {list.length === 0 && (
        <div className="card p-12 text-center text-gray-500">
          <div className="text-4xl mb-2">🔍</div>
          <p>没有找到匹配的地点</p>
        </div>
      )}
    </div>
  )
}
