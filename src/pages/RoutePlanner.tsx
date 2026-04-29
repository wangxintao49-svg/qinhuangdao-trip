import { useEffect, useRef, useState, useCallback } from 'react'
import { useLocation } from 'react-router-dom'
import { useTripStore } from '../store/tripStore'
import { loadTMap, getUserLocation, watchUserLocation, fetchDirection } from '../services/api'
import { haversineDist, estDriveTime, estTaxiFare, decodeDirectionPolyline, generateCurvedPath } from '../utils/geo'
import { pageIntros } from '../data/pageIntros'
import PageIntro from '../components/PageIntro'
import { getHouseIcon } from '../utils/icons'
import type { TravelMode } from '../types'

const modes: Array<{ key: TravelMode; label: string }> = [
  { key: 'driving', label: '🚗 驾车' },
  { key: 'bicycling', label: '🚲 骑行' },
  { key: 'transit', label: '🚌 公交' },
  { key: 'walking', label: '🚶 步行' },
]

const quickRoutes = [
  { from: 'bdh_stn', to: 'geziwo', label: '北戴河站 → 鸽子窝' },
  { from: 'bdh_stn', to: 'laohushi', label: '北戴河站 → 老虎石' },
  { from: 'qhd_alley', to: 'qhd_stn', label: '秦皇小巷 → 秦皇岛站' },
]

const modeLabel: Record<string, string> = {
  driving: '驾车', bicycling: '骑行', transit: '公交', walking: '步行',
}

interface TransitStep {
  mode: 'WALKING' | 'TRANSIT'
  distance: number
  duration: number
  polyline: Array<{ lat: number; lng: number }>
  direction?: string
  lineName?: string
  stationCount?: number
  getonName?: string
  getoffName?: string
  stations?: Array<{ title: string }>
  subSteps?: Array<{ instruction: string; distance: number }>
}

export default function RoutePlanner() {
  const { state } = useLocation()
  const { mode, setMode, spots } = useTripStore()
  const [from, setFrom] = useState(state?.from ?? '')
  const [to, setTo] = useState('')
  const [ready, setReady] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errMsg, setErrMsg] = useState('')
  const container = useRef<HTMLDivElement>(null)
  const mapRef = useRef<any>(null)
  const overlays = useRef<Array<{ destroy?: () => void; setMap?: (m: any) => void }>>([])
  const polyRef = useRef<any>(null)

  const [result, setResult] = useState<{ dist: number; time: number; fare: number } | null>(null)
  const [transitPlan, setTransitPlan] = useState<TransitStep[] | null>(null)
  const [transitPrice, setTransitPrice] = useState<number | null>(null)
  const [userLoc, setUserLoc] = useState<{ lat: number; lng: number; accuracy?: number } | null>(null)
  const [followMode, setFollowMode] = useState(false)
  const [showPermAlert, setShowPermAlert] = useState(false)
  const userLocRef = useRef<{ lat: number; lng: number; accuracy?: number } | null>(null)
  const userMarkerRef = useRef<any>(null)
  const accuracyCircleRef = useRef<any>(null)
  const watchStopRef = useRef<(() => void) | null>(null)

  const fromSpot = spots.find((s) => s.id === from)
  const toSpot = spots.find((s) => s.id === to)

  // 清除覆盖物
  const clearOverlays = useCallback(() => {
    if (polyRef.current) { polyRef.current.setMap?.(null); polyRef.current = null }
    overlays.current.forEach((o) => o.setMap?.(null))
    overlays.current = []
  }, [])

  // 在地图上画路线和标记
  const drawRoute = useCallback((polyline: Array<{ lat: number; lng: number }> | null) => {
    const map = mapRef.current
    if (!map || !fromSpot || !toSpot) return
    clearOverlays()

    // 起点终点标记
    try {
      const style = new window.TMap.MarkerStyle({ width: 28, height: 36, anchor: { x: 14, y: 36 }, color: '#10B981' })
      const mm = new window.TMap.MultiMarker({
        map, styles: { m: style },
        geometries: [
          { id: 'from', styleId: 'm', position: new window.TMap.LatLng(fromSpot.lat, fromSpot.lng), properties: { title: fromSpot.name } },
          { id: 'to', styleId: 'm', position: new window.TMap.LatLng(toSpot.lat, toSpot.lng), properties: { title: toSpot.name } },
        ],
      })
      overlays.current.push(mm)
    } catch {}

    // 画路线轨迹（API 返回真实路径 / 降级画曲线）
    const pts = polyline?.length
      ? polyline.map((p) => new window.TMap.LatLng(p.lat, p.lng))
      : generateCurvedPath(fromSpot.lat, fromSpot.lng, toSpot.lat, toSpot.lng).map((p) => new window.TMap.LatLng(p.lat, p.lng))

    try {
      const pl = new (window.TMap as any).MultiPolyline({
        map,
        styles: {
          r: new (window.TMap as any).PolylineStyle({ color: '#0891B2', width: 5, borderWidth: 2, borderColor: '#FFFFFF' }),
        },
        geometries: [{ id: 'route', styleId: 'r', paths: [pts] }],
      })
      polyRef.current = pl
    } catch {}

    // 缩放视野
    try {
      const b = new (window.TMap as any).LatLngBounds()
      b.extend(new window.TMap.LatLng(fromSpot.lat, fromSpot.lng))
      b.extend(new window.TMap.LatLng(toSpot.lat, toSpot.lng))
      map.fitBounds(b)
    } catch {
      map.setCenter(new window.TMap.LatLng((fromSpot.lat + toSpot.lat) / 2, (fromSpot.lng + toSpot.lng) / 2))
    }
  }, [fromSpot, toSpot, clearOverlays])

  // 在地图上画公交路线（多段 polyline：步行段 + 公交段）
  const drawTransitRoute = useCallback((plan: TransitStep[]) => {
    const map = mapRef.current
    if (!map || !fromSpot || !toSpot) return
    clearOverlays()

    // 起点终点标记
    try {
      const style = new window.TMap.MarkerStyle({ width: 28, height: 36, anchor: { x: 14, y: 36 }, color: '#10B981' })
      const mm = new window.TMap.MultiMarker({
        map, styles: { m: style },
        geometries: [
          { id: 'from', styleId: 'm', position: new window.TMap.LatLng(fromSpot.lat, fromSpot.lng), properties: { title: fromSpot.name } },
          { id: 'to', styleId: 'm', position: new window.TMap.LatLng(toSpot.lat, toSpot.lng), properties: { title: toSpot.name } },
        ],
      })
      overlays.current.push(mm)
    } catch {}

    // 画每段路线（公交=蓝色实线，步行=灰色虚线）
    for (const step of plan) {
      if (step.polyline.length < 2) continue
      const pts = step.polyline.map((p) => new window.TMap.LatLng(p.lat, p.lng))
      try {
        const isBus = step.mode === 'TRANSIT'
        const pl = new (window.TMap as any).MultiPolyline({
          map,
          styles: {
            r: new (window.TMap as any).PolylineStyle({
              color: isBus ? '#0891B2' : '#94A3B8',
              width: isBus ? 5 : 3,
              borderWidth: isBus ? 2 : 0,
              borderColor: '#FFFFFF',
            }),
          },
          geometries: [{ styleId: 'r', paths: [pts] }],
        })
        overlays.current.push(pl)
      } catch {}
    }

    // 缩放视野
    try {
      const b = new (window.TMap as any).LatLngBounds()
      plan.forEach((s) => {
        if (s.polyline.length) {
          b.extend(new window.TMap.LatLng(s.polyline[0].lat, s.polyline[0].lng))
          b.extend(new window.TMap.LatLng(s.polyline[s.polyline.length - 1].lat, s.polyline[s.polyline.length - 1].lng))
        }
      })
      map.fitBounds(b)
    } catch {
      map.setCenter(new window.TMap.LatLng((fromSpot.lat + toSpot.lat) / 2, (fromSpot.lng + toSpot.lng) / 2))
    }
  }, [fromSpot, toSpot, clearOverlays])

  // 初始化地图
  useEffect(() => {
    loadTMap().then(() => setReady(true)).catch(() => {})
    return () => {
      clearOverlays()
      userMarkerRef.current?.setMap?.(null)
      accuracyCircleRef.current?.setMap?.(null)
    }
  }, [clearOverlays])

  useEffect(() => {
    if (!ready || !container.current || mapRef.current) return
    const opts: any = {
      center: new window.TMap.LatLng(39.88, 119.5),
      zoom: 11,
    }
    mapRef.current = new window.TMap.Map(container.current, opts)
  }, [ready])

  // 获取用户位置并加蓝色标记
  useEffect(() => {
    getUserLocation().then((loc) => { if (loc) { setUserLoc(loc); userLocRef.current = loc } })
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !userLocRef.current) return
    if (userMarkerRef.current) { userMarkerRef.current.setMap(null); userMarkerRef.current = null }
    if (accuracyCircleRef.current) { accuracyCircleRef.current.setMap(null) }
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
    if (userLocRef.current.accuracy && userLocRef.current.accuracy > 0 && userLocRef.current.accuracy < 1000) {
      try {
        accuracyCircleRef.current = new (window.TMap as any).MultiCircle({
          map,
          styles: { a: new (window.TMap as any).CircleStyle({ color: '#3B82F6', strokeColor: '#3B82F6', strokeWidth: 1, opacity: 0.12 }) },
          geometries: [{ styleId: 'a', center: new window.TMap.LatLng(userLocRef.current.lat, userLocRef.current.lng), radius: userLocRef.current.accuracy }],
        })
      } catch {}
    }
  }, [ready, userLoc])

  // 实时位置跟踪（通过 ref 更新标记，不触发 React 重渲染）
  useEffect(() => {
    const stopped = { current: false }
    watchStopRef.current = watchUserLocation(
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
    return () => { stopped.current = true; watchStopRef.current?.() }
  }, [ready, followMode])

  // 调用腾讯地图 Direction API 获取真实路线（带 Haversine 降级）
  const calcRoute = useCallback(() => {
    if (!fromSpot || !toSpot) return
    setLoading(true)
    setResult(null)
    setTransitPlan(null)
    setTransitPrice(null)
    setErrMsg('')
    clearOverlays()

    const apiMode = mode // mode 已是 driving/bicycling/transit/walking

    // 成功处理（distance:米, duration:分钟）
    const onResult = (distMeters: number, durMins: number, polyline: Array<{ lat: number; lng: number }> | null) => {
      const dist = Math.round(distMeters / 1000 * 10) / 10
      const time = Math.round(durMins)
      // 步行/骑行不计打车费
      const fare = (apiMode === 'walking' || apiMode === 'bicycling') ? 0 : estTaxiFare(dist)
      setResult({ dist, time, fare })
      setErrMsg('')
      drawRoute(polyline)
      setLoading(false)
    }

    // 降级：Haversine 估算
    const fallback = (reason = '') => {
      const dist = haversineDist(fromSpot.lat, fromSpot.lng, toSpot.lat, toSpot.lng)
      const roadDist = Math.round(dist * 1.3 * 10) / 10
      const time = estDriveTime(roadDist)
      const fare = (apiMode === 'transit' || apiMode === 'walking' || apiMode === 'bicycling') ? 0 : estTaxiFare(roadDist)
      setResult({ dist: roadDist, time, fare })
      setTransitPlan(null)
      drawRoute(null)
      setErrMsg(reason || '路线获取失败，使用地理估算')
      setLoading(false)
    }

    fetchDirection(
      { lat: fromSpot.lat, lng: fromSpot.lng },
      { lat: toSpot.lat, lng: toSpot.lng },
      apiMode,
    ).then(({ data: dirData, error }) => {
      if (dirData) {
        if (apiMode === "transit" && dirData.steps) {
          const plan = parseTransitRoute({ steps: dirData.steps, distance: dirData.distance, duration: dirData.duration })
          const dist = Math.round(dirData.distance / 1000 * 10) / 10
          const time = dirData.duration
          setResult({ dist, time, fare: 0 })
          setTransitPlan(plan)
          setTransitPrice(typeof dirData.price === "number" ? dirData.price : null)
          setErrMsg("")
          drawTransitRoute(plan)
          setLoading(false)
        } else {
          onResult(dirData.distance, dirData.duration, dirData.polyline)
        }
      } else {
        setTransitPlan(null)
        fallback("路线获取中")
      }
    })  }, [fromSpot, toSpot, mode, clearOverlays, drawRoute, drawTransitRoute])

  useEffect(() => {
    if (!ready || !container.current || mapRef.current) return
    const opts: any = {
      center: new window.TMap.LatLng(39.88, 119.5),
      zoom: 11,
    }
    mapRef.current = new window.TMap.Map(container.current, opts)
  }, [ready])

  // 获取用户位置并加蓝色标记
  useEffect(() => {
    getUserLocation().then((loc) => { if (loc) { setUserLoc(loc); userLocRef.current = loc } })
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !userLocRef.current) return
    if (userMarkerRef.current) { userMarkerRef.current.setMap(null); userMarkerRef.current = null }
    if (accuracyCircleRef.current) { accuracyCircleRef.current.setMap(null) }
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
    if (userLocRef.current.accuracy && userLocRef.current.accuracy > 0 && userLocRef.current.accuracy < 1000) {
      try {
        accuracyCircleRef.current = new (window.TMap as any).MultiCircle({
          map,
          styles: { a: new (window.TMap as any).CircleStyle({ color: '#3B82F6', strokeColor: '#3B82F6', strokeWidth: 1, opacity: 0.12 }) },
          geometries: [{ styleId: 'a', center: new window.TMap.LatLng(userLocRef.current.lat, userLocRef.current.lng), radius: userLocRef.current.accuracy }],
        })
      } catch {}
    }
  }, [ready, userLoc])

  // 实时位置跟踪（通过 ref 更新标记，不触发 React 重渲染）
  useEffect(() => {
    const stopped = { current: false }
    watchStopRef.current = watchUserLocation(
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
    return () => { stopped.current = true; watchStopRef.current?.() }
  }, [ready, followMode])


  // 起止点或交通方式变化自动计算
  useEffect(() => {
    if (from && to) calcRoute()
    else { setResult(null); setTransitPlan(null); setErrMsg(''); clearOverlays() }
  }, [from, to, mode, calcRoute, clearOverlays])

  return (
    <div>
      <PageIntro {...pageIntros.route} />
      <h2 className="text-2xl font-bold text-ocean-800 mb-4">🛣️ 路线规划</h2>
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="space-y-4">
          <div className="card p-5">
            <h3 className="font-semibold text-gray-700 mb-3">📍 起止点</h3>
            <select value={from} onChange={(e) => setFrom(e.target.value)}
              className="w-full mb-2 px-4 py-2.5 rounded-xl border border-ocean-100 text-sm focus:outline-none focus:ring-2 focus:ring-ocean-400">
              <option value="">选择起点</option>
              {spots.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <div className="text-center text-gray-400 text-lg my-1">⇅</div>
            <select value={to} onChange={(e) => setTo(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-ocean-100 text-sm focus:outline-none focus:ring-2 focus:ring-ocean-400">
              <option value="">选择终点</option>
              {spots.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div className="card p-5">
            <h3 className="font-semibold text-gray-700 mb-3">🚗 出行方式</h3>
            <div className="grid grid-cols-2 gap-2">
              {modes.map((m) => (
                <button key={m.key} onClick={() => setMode(m.key)}
                  className={`px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${mode === m.key ? 'bg-ocean-500 text-white' : 'bg-white border border-ocean-100 text-gray-600 hover:bg-ocean-50'}`}>{m.label}</button>
              ))}
            </div>
          </div>
          <button onClick={calcRoute} disabled={!from || !to || loading}
            className="btn-solid w-full text-center disabled:opacity-50">
            {loading ? '⏳ 获取路线中...' : '🗺️ 规划路线'}
          </button>
          {errMsg && <p className="text-xs text-red-500 text-center">{errMsg}</p>}
          <div className="card p-5">
            <h3 className="font-semibold text-gray-700 mb-3">⚡ 快速选择</h3>
            {quickRoutes.map((r, i) => (
              <button key={i} onClick={() => { setFrom(r.from); setTo(r.to) }}
                className="w-full text-left px-4 py-2.5 rounded-xl text-sm border border-ocean-100 hover:bg-ocean-50 mb-2 last:mb-0">{r.label}</button>
            ))}
          </div>
        </div>
        <div className="lg:col-span-2 space-y-4">
          <div ref={container} className="h-[300px] lg:h-[420px] card rounded-2xl overflow-hidden relative">
            {!ready && <div className="absolute inset-0 flex items-center justify-center bg-gray-50 text-gray-400 text-sm">加载地图中...</div>}
            {userLoc && (
              <div className="absolute bottom-4 right-4 flex flex-col gap-2 z-10">
                <button onClick={() => setFollowMode(v => !v)}
                  className={`w-10 h-10 rounded-full flex items-center justify-center shadow-lg text-lg transition-colors ${followMode ? 'bg-ocean-500 text-white' : 'bg-white hover:bg-gray-50'}`}
                  title={followMode ? '跟随模式已开启' : '开启跟随模式'}>🎯</button>
                <button onClick={() => {
                  const jump = (lat: number, lng: number) => { const m = mapRef.current; m?.setCenter(new window.TMap.LatLng(lat, lng)); m?.setZoom(16); setFollowMode(true) }
                  if (navigator.geolocation) {
                    navigator.geolocation.getCurrentPosition(
                      (pos) => jump(pos.coords.latitude, pos.coords.longitude),
                      (err) => { if (err.code === 1) setShowPermAlert(true); else if (userLocRef.current) jump(userLocRef.current.lat, userLocRef.current.lng) },
                      { enableHighAccuracy: true, timeout: 3000, maximumAge: 0 },
                    )
                  } else if (userLocRef.current) jump(userLocRef.current.lat, userLocRef.current.lng)
                }}
                  className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-lg hover:bg-gray-50 text-lg"
                  title={userLoc.accuracy ? `我的位置 ±${userLoc.accuracy}m` : '我的位置'}>📍</button>
              </div>
            )}
          </div>

          {result && mode === 'transit' && transitPlan ? (
            <div className="card p-5">
              <h3 className="font-semibold text-gray-700 mb-4">🚌 公交方案</h3>
              <div className="space-y-3 mb-4">
                {transitPlan.map((step, i) => (
                  <div key={i} className={`p-3 rounded-xl ${step.mode === 'TRANSIT' ? 'bg-cyan-50 border border-cyan-100' : 'bg-gray-50'}`}>
                    <div className="flex items-start gap-3">
                      <span className="text-lg mt-0.5 shrink-0">{step.mode === 'TRANSIT' ? '🚌' : '🚶'}</span>
                      <div className="flex-1 min-w-0">
                        {step.mode === 'TRANSIT' ? (
                          <>
                            <div className="font-semibold text-gray-800">{step.lineName}</div>
                            <div className="text-sm text-gray-600 mt-1">
                              上车 <strong>{step.getonName}</strong> → 乘{step.stationCount}站 → 下车 <strong>{step.getoffName}</strong>
                            </div>
                            {step.stations && step.stations.length > 0 && (
                              <details className="mt-1">
                                <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-600">途经站点列表</summary>
                                <div className="text-xs text-gray-500 mt-1 space-y-0.5">
                                  {step.stations.map((s, j) => (
                                    <div key={j} className="flex items-center gap-1.5">
                                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-300 shrink-0" />
                                      <span>{s.title}</span>
                                    </div>
                                  ))}
                                </div>
                              </details>
                            )}
                            <div className="text-xs text-gray-500 mt-1">
                              {step.distance > 0 ? `${Math.round(step.distance)}m · ` : ''}{step.duration}分钟
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="text-sm font-medium text-gray-700">
                              {step.distance > 0 ? `步行 ${Math.round(step.distance)}m` : '到达目的地'}
                            </div>
                            {step.direction && <div className="text-xs text-gray-400 mt-0.5">方向 {step.direction}</div>}
                            {step.subSteps && step.subSteps.length > 0 && (
                              <div className="text-xs text-gray-400 mt-0.5 truncate" title={step.subSteps.map(s => s.instruction).join(' → ')}>
                                {step.subSteps.map(s => s.instruction).join(' → ')}
                              </div>
                            )}
                            <div className="text-xs text-gray-500 mt-0.5">{step.duration}分钟</div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="text-center p-4 rounded-xl bg-ocean-50 text-ocean-600">
                  <div className="text-2xl font-bold">{result.dist}</div>
                  <div className="text-xs">总距离 (km)</div>
                </div>
                <div className="text-center p-4 rounded-xl bg-emerald-50 text-emerald-600">
                  <div className="text-2xl font-bold">{result.time}</div>
                  <div className="text-xs">总耗时 (分钟)</div>
                </div>
                <div className="text-center p-4 rounded-xl bg-orange-50 text-orange-600">
                  <div className="text-2xl font-bold">{transitPrice !== null ? `¥${transitPrice / 100}` : '--'}</div>
                  <div className="text-xs">公交票价</div>
                </div>
              </div>
              <div className="p-3 bg-gray-50 rounded-xl text-sm text-gray-600 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <strong>{fromSpot?.name}</strong>
                <span className="text-gray-400">→</span>
                <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
                <strong>{toSpot?.name}</strong>
                <span className="text-gray-400">·</span>
                <span>公交</span>
              </div>
            </div>
          ) : result && (
            <div className="card p-5">
              <h3 className="font-semibold text-gray-700 mb-4">📊 路线摘要</h3>
              <div className="grid grid-cols-3 gap-4 mb-4">
                {[
                  { label: mode === 'transit' ? '总距离' : '驾驶距离', val: `${result.dist}`, unit: 'km', color: 'text-ocean-600 bg-ocean-50' },
                  { label: '预计耗时', val: `${result.time}`, unit: `分钟（${modeLabel[mode]}）`, color: 'text-emerald-600 bg-emerald-50' },
                  { label: mode === 'transit' ? '公交票价' : (mode === 'walking' || mode === 'bicycling') ? '运动消耗' : '打车预估', val: (mode === 'walking' || mode === 'bicycling') ? `${result.time * 4}` : `¥${result.fare}`, unit: (mode === 'walking' || mode === 'bicycling') ? '千卡' : '约', color: 'text-orange-600 bg-orange-50' },
                ].map((d, i) => (
                  <div key={i} className={`text-center p-4 rounded-xl ${d.color}`}>
                    <div className="text-2xl font-bold">{d.val}</div>
                    <div className="text-xs">{d.unit}</div>
                  </div>
                ))}
              </div>
              <div className="p-3 bg-gray-50 rounded-xl text-sm text-gray-600 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <strong>{fromSpot?.name}</strong>
                <span className="text-gray-400">→</span>
                <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
                <strong>{toSpot?.name}</strong>
                <span className="text-gray-400">·</span>
                <span>{modeLabel[mode]}</span>
              </div>
            </div>
          )}
        </div>
      </div>

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

// 解析公交路线返回的步骤（步行 + 公交段）
function parseTransitRoute(route: any): TransitStep[] {
  const steps: TransitStep[] = []
  for (const s of route.steps || []) {
    if (s.mode === 'WALKING') {
      steps.push({
        mode: 'WALKING',
        distance: s.distance,
        duration: s.duration,
        polyline: decodeDirectionPolyline(s.polyline),
        direction: s.direction,
        subSteps: (s.steps || []).map((ss: any) => ({
          instruction: ss.instruction,
          distance: ss.distance,
        })),
      })
    } else if (s.mode === 'TRANSIT') {
      for (const line of s.lines || []) {
        steps.push({
          mode: 'TRANSIT',
          distance: line.distance,
          duration: line.duration,
          polyline: decodeDirectionPolyline(line.polyline),
          lineName: line.title,
          stationCount: line.station_count,
          getonName: line.geton?.title,
          getoffName: line.getoff?.title,
          stations: line.stations || [],
        })
      }
    }
  }
  return steps
}

