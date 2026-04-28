import { useEffect, useRef, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useTripStore } from '../store/tripStore'
import { loadTMap, suggestPlaces, searchNearby, getUserLocation, watchUserLocation } from '../services/api'
import { pageIntros } from '../data/pageIntros'
import PageIntro from '../components/PageIntro'
import { getMarkerIcon, getHouseIcon, getMarkerColor } from '../utils/icons'

const categories = [
  { key: 'all', label: '全部', icon: '📋' },
  { key: 'play', label: '玩乐', icon: '🎯' },
  { key: 'food', label: '吃喝', icon: '🍽️' },
  { key: 'station', label: '车站', icon: '🚉' },
  { key: 'rainy', label: '雨天', icon: '🏛️' },
] as const

const iconMap: Record<string, string> = { station: '🚉', play: '🎯', food: '🍽️', rainy: '🏛️' }

export default function MapView() {
  const { filter, setFilter, selected, setSelected, toggleWish, wishlist, spots } = useTripStore()
  const [ready, setReady] = useState(false)
  const [mapErr, setMapErr] = useState(false)
  const [q, setQ] = useState('')
  const [suggestions, setSuggestions] = useState<Array<{ title: string; address: string; category: string }>>([])
  const [showTraffic, setShowTraffic] = useState(false)
  const [userLoc, setUserLoc] = useState<{ lat: number; lng: number; accuracy?: number } | null>(null)
  const [followMode, setFollowMode] = useState(false)
  const [showPermAlert, setShowPermAlert] = useState(false)
  const userLocRef = useRef<{ lat: number; lng: number; accuracy?: number } | null>(null)
  const [nearby, setNearby] = useState<Array<{ title: string; address: string; distance: number }>>([])
  const [nearbyLoading, setNearbyLoading] = useState(false)
  const suggestTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const container = useRef<HTMLDivElement>(null)
  const mapRef = useRef<any>(null)
  const markerRef = useRef<any>(null)
  const userMarkerRef = useRef<any>(null)
  const trafficRef = useRef<any>(null)
  const initCalled = useRef(false)

  const list = spots
    .filter((s) => filter === 'all' || s.category === filter)
    .filter((s) => !q || s.name.includes(q) || s.tags.some((t) => t.includes(q)))

  // 初始化地图 + IP 定位
  useEffect(() => {
    if (initCalled.current) return
    initCalled.current = true
    Promise.all([
      loadTMap(),
      getUserLocation().then((loc) => { if (loc) { setUserLoc(loc); userLocRef.current = loc } }),
    ]).then(() => setReady(true)).catch(() => setMapErr(true))
  }, [])

  useEffect(() => {
    if (!ready || !container.current || mapRef.current) return
    try {
      const c = userLoc ?? { lat: 39.88, lng: 119.5 }
      const opts: any = { center: new window.TMap.LatLng(c.lat, c.lng), zoom: userLoc ? 12 : 11 }
      mapRef.current = new window.TMap.Map(container.current, opts)
    } catch { setMapErr(true) }
  }, [ready, userLoc])

  // 用户位置蓝点标记 + 精度圈（只创建一次，不随 userLoc 重建）
  const accuracyCircleRef = useRef<any>(null)
  useEffect(() => {
    const map = mapRef.current
    if (!map || !userLocRef.current) return
    if (userMarkerRef.current) { userMarkerRef.current.setMap(null); userMarkerRef.current = null }
    if (accuracyCircleRef.current) { accuracyCircleRef.current.setMap(null); accuracyCircleRef.current = null }
    try {
      const houseIcon = getHouseIcon()
      const style = new window.TMap.MarkerStyle({
        width: 28, height: 28, anchor: { x: 14, y: 14 },
        color: '#3B82F6',
        ...(houseIcon ? { icon: houseIcon } : {}),
      })
      userMarkerRef.current = new window.TMap.MultiMarker({
        map, styles: { m: style },
        geometries: [{ id: 'user', styleId: 'm', position: new window.TMap.LatLng(userLocRef.current.lat, userLocRef.current.lng), properties: { title: '我的位置' } }],
      })
    } catch {}
    // 精度圈
    if (userLocRef.current.accuracy && userLocRef.current.accuracy > 0 && userLocRef.current.accuracy < 1000) {
      try {
        accuracyCircleRef.current = new (window.TMap as any).MultiCircle({
          map,
          styles: { a: new (window.TMap as any).CircleStyle({ color: '#3B82F6', strokeColor: '#3B82F6', strokeWidth: 1, opacity: 0.12 }) },
          geometries: [{ styleId: 'a', center: new window.TMap.LatLng(userLocRef.current.lat, userLocRef.current.lng), radius: userLocRef.current.accuracy }],
        })
      } catch {}
    }
  }, [ready])

  // 实时位置跟踪（通过 ref 更新标记，不触发 React 重渲染）
  useEffect(() => {
    const stopped = { current: false }
    const stop = watchUserLocation(
      (loc) => {
        userLocRef.current = loc
        try { userMarkerRef.current?.setGeometries?.([{ id: 'user', styleId: 'm', position: new window.TMap.LatLng(loc.lat, loc.lng), properties: { title: '我的位置' } }]) } catch {}
        try { accuracyCircleRef.current?.setGeometries?.([{ styleId: 'a', center: new window.TMap.LatLng(loc.lat, loc.lng), radius: loc.accuracy || 50 }]) } catch {}
        if (!stopped.current && followMode) {
          try { mapRef.current?.setCenter(new window.TMap.LatLng(loc.lat, loc.lng)) } catch {}
        }
      },
      () => {},
    )
    return () => { stopped.current = true; stop() }
  }, [ready, followMode])

  // 更新标记（使用分类颜色 + 自定义图标）
  const updateMarkers = useCallback(() => {
    const map = mapRef.current
    if (!map || !ready) return
    if (markerRef.current) { markerRef.current.setMap(null); markerRef.current = null }
    const data = list.map((s) => ({
      id: s.id, styleId: s.category,
      position: new window.TMap.LatLng(s.lat, s.lng),
      properties: { title: s.name },
    }))
    if (data.length === 0) return
    const styles: Record<string, any> = {}
    for (const c of ['station', 'play', 'food', 'rainy']) {
      const iconUrl = getMarkerIcon(c)
      styles[c] = new window.TMap.MarkerStyle({
        width: 38, height: 38,
        anchor: { x: 19, y: 19 },
        color: getMarkerColor(c),     // 颜色回退
        ...(iconUrl ? { icon: iconUrl } : {}), // 自定义图标优先
      })
    }
    try {
      const mm = new window.TMap.MultiMarker({ map, styles, geometries: data })
      mm.on('click', (e: any) => { const p = spots.find((s) => s.id === e.geometry?.id); if (p) { setSelected(p); setNearby([]) } })
      markerRef.current = mm
    } catch {}
  }, [list, ready, setSelected])

  useEffect(() => { updateMarkers() }, [updateMarkers])

  // 选中地点居中和加载周边
  useEffect(() => {
    if (selected && mapRef.current) {
      mapRef.current.setCenter(new window.TMap.LatLng(selected.lat, selected.lng))
      mapRef.current.setZoom(14)
      loadNearby(selected.lat, selected.lng)
    }
  }, [selected])

  // 交通图层
  useEffect(() => {
    const map = mapRef.current
    if (!map || !ready) return
    if (showTraffic) {
      try {
        if (!trafficRef.current) trafficRef.current = new (window.TMap as any).TrafficLayer({ map })
        else trafficRef.current.setMap(map)
      } catch {}
    } else {
      if (trafficRef.current) { trafficRef.current.setMap(null) }
    }
  }, [showTraffic, ready])

  // 自动补全
  const handleSearch = (val: string) => {
    setQ(val)
    setSuggestions([])
    clearTimeout(suggestTimer.current)
    if (!val.trim()) return
    // 先匹配本地数据
    const local = spots.filter((s) => s.name.includes(val) || s.tags.some((t) => t.includes(val)))
    if (local.length > 0) return
    // 再请求 API
    suggestTimer.current = setTimeout(async () => {
      const res = await suggestPlaces(val)
      setSuggestions(res)
    }, 300)
  }

  // 加载周边
  const loadNearby = async (lat: number, lng: number) => {
    setNearbyLoading(true)
    const res = await searchNearby(lat, lng)
    setNearby(res.slice(0, 8))
    setNearbyLoading(false)
  }

  // 定位：尝试 GPS → 降级到已有位置 → 放大到 16 级
  const handleLocate = useCallback(() => {
    const jump = (lat: number, lng: number) => {
      const m = mapRef.current
      if (!m) return
      m.setCenter(new window.TMap.LatLng(lat, lng))
      m.setZoom(16)
      setFollowMode(true)
    }
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => { jump(pos.coords.latitude, pos.coords.longitude) },
        (err) => {
          if (err.code === 1) setShowPermAlert(true) // PERMISSION_DENIED
          else if (userLocRef.current) jump(userLocRef.current.lat, userLocRef.current.lng)
        },
        { enableHighAccuracy: true, timeout: 3000, maximumAge: 0 },
      )
    } else if (userLocRef.current) {
      jump(userLocRef.current.lat, userLocRef.current.lng)
    }
  }, [])

  return (
    <div>
      <PageIntro {...pageIntros.map} />
      <h2 className="text-2xl font-bold text-ocean-800 mb-4">🗺️ 总览地图</h2>
      <div className="flex flex-wrap items-center gap-3 mb-4">
        {categories.map((c) => (
          <button key={c.key} onClick={() => setFilter(c.key)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${filter === c.key ? 'bg-ocean-500 text-white' : 'bg-white text-gray-600 border border-ocean-100 hover:bg-ocean-50'}`}>
            {c.icon} {c.label}
          </button>
        ))}
        <div className="relative ml-auto">
          <input value={q} onChange={(e) => handleSearch(e.target.value)} placeholder="搜索地点..."
            className="w-48 px-4 py-2 bg-white rounded-xl border border-ocean-100 text-sm focus:outline-none focus:ring-2 focus:ring-ocean-400" />
          {suggestions.length > 0 && (
            <div className="absolute top-full mt-1 left-0 right-0 bg-white rounded-xl shadow-lg border z-20 max-h-48 overflow-y-auto">
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
        <button onClick={() => setShowTraffic((v) => !v)}
          className={`px-3 py-2 rounded-xl text-sm font-medium transition-colors ${showTraffic ? 'bg-emerald-500 text-white' : 'bg-white border border-ocean-100 text-gray-600'}`}>
          🚦 路况
        </button>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div ref={container} className="lg:col-span-2 h-[520px] card rounded-2xl overflow-hidden relative">
          {mapErr && <div className="absolute inset-0 flex items-center justify-center bg-gray-100 text-gray-500">地图加载失败</div>}
          {!ready && !mapErr && <div className="absolute inset-0 flex items-center justify-center bg-ocean-50 text-ocean-600 font-medium">加载地图中...</div>}
          {ready && list.length === 0 && <div className="absolute top-4 left-4 bg-white/90 px-4 py-2 rounded-xl text-sm text-gray-500 shadow">无匹配地点</div>}
          {userLoc && (
            <div className="absolute bottom-4 right-4 flex flex-col gap-2 z-10">
              <button onClick={() => setFollowMode(v => !v)}
                className={`w-10 h-10 rounded-full flex items-center justify-center shadow-lg text-lg transition-colors ${followMode ? 'bg-ocean-500 text-white' : 'bg-white hover:bg-gray-50'}`}
                title={followMode ? '跟随模式已开启' : '开启跟随模式'}>🎯</button>
              <button onClick={handleLocate}
                className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-lg hover:bg-gray-50 text-lg"
                title={userLoc.accuracy ? `我的位置 ±${userLoc.accuracy}m` : '我的位置'}>📍</button>
            </div>
          )}
        </div>

        <div className="space-y-3 max-h-[520px] overflow-y-auto">
          {list.map((s) => (
            <div key={s.id} onClick={() => setSelected(s)}
              className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${selected?.id === s.id ? 'border-ocean-500 bg-ocean-50' : 'border-transparent bg-white/70 hover:border-ocean-200'}`}>
              <div className="flex items-center gap-2">
                <span className="text-lg">{iconMap[s.category] || '📍'}</span>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-gray-800 text-sm truncate">
                    {s.priority === 'core' && <span className="text-yellow-500 mr-1">⭐</span>}{s.name}
                  </div>
                  <div className="text-xs text-gray-500">{s.type}</div>
                </div>
                <button onClick={(e) => { e.stopPropagation(); toggleWish(s.id) }}
                  className="text-lg">{wishlist.includes(s.id) ? '❤️' : '🤍'}</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {selected && (
        <div className="card p-6 mt-6">
          <div className="flex items-center gap-4 mb-4">
            <span className="text-3xl">{iconMap[selected.category] || '📍'}</span>
            <div>
              <h3 className="text-xl font-bold text-gray-800">{selected.priority === 'core' && '⭐ '}{selected.name}</h3>
              <span className="chip-blue">{selected.type}</span>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-4 text-sm">
            <div><span className="text-gray-500">📍</span> {selected.address}</div>
            <div><span className="text-gray-500">🕐</span> {selected.bestTime}</div>
            <div className="sm:col-span-2"><span className="text-gray-500">📝</span> {selected.note}</div>
            <div className="sm:col-span-2 flex flex-wrap gap-2">
              {selected.tags.map((t, i) => <span key={i} className="chip-blue">{t}</span>)}
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <Link to="/route" state={{ from: selected.id }} className="btn-solid text-sm px-5 py-2">🗺️ 从这里出发</Link>
            <button onClick={() => toggleWish(selected.id)} className="btn-outline text-sm px-5 py-2">
              {wishlist.includes(selected.id) ? '❤️ 已收藏' : '🤍 加入行程'}
            </button>
          </div>

          {/* 周边探索 */}
          <div className="mt-6 pt-4 border-t border-gray-100">
            <h4 className="font-semibold text-gray-700 mb-3">🔍 附近有什么</h4>
            {nearbyLoading ? (
              <p className="text-sm text-gray-400">搜索周边中...</p>
            ) : nearby.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {nearby.map((n, i) => (
                  <div key={i} className="px-3 py-2 bg-gray-50 rounded-xl text-sm">
                    <span className="text-gray-800">{n.title}</span>
                    <span className="text-gray-400 text-xs ml-2">{n.distance}m</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400">未找到附近 POI</p>
            )}
          </div>
        </div>
      )}

      {showPermAlert && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setShowPermAlert(false)}>
          <div className="bg-white rounded-2xl p-6 max-w-sm mx-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-bold text-lg text-gray-800 mb-2">📍 需要定位权限</h3>
            <p className="text-gray-600 text-sm mb-4">请允许浏览器获取您的位置信息，以便使用定位功能。您可以在浏览器地址栏左侧的锁图标中修改权限设置。</p>
            <button onClick={() => setShowPermAlert(false)} className="btn-solid w-full">知道了</button>
          </div>
        </div>
      )}
    </div>
  )
}
