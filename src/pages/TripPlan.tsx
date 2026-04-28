import { useMemo, useState, useEffect, useRef, useCallback } from 'react'
import { spots } from '../data/places'
import { useTripStore } from '../store/tripStore'
import { haversineDist, estDriveTime, estTaxiFare, estWalkTime, estRideTime, estTransitTime, decodeDirectionPolyline, generateCurvedPath } from '../utils/geo'
import { loadTMap, getUserLocation, watchUserLocation } from '../services/api'
import { pageIntros } from '../data/pageIntros'
import PageIntro from '../components/PageIntro'
import { getHouseIcon } from '../utils/icons'
import type { TravelMode } from '../types'

const defaultTimes: Record<string, string> = {
  bdh_stn: '09:00', geziwo: '10:00', yecunli: '12:30', laohushi: '14:00',
  biluota: '17:00', safari: '09:00', qhd_alley: '12:00', xigang: '14:30',
  qhd_stn: '18:00', jinmeng: '15:00', qianshui: '10:00', botanical: '11:00',
  tanghe: '16:00', liuzhuang: '19:00', yanshan: '18:00', yuanfu: '12:00',
  hongqin_qhx: '15:00', hongqin_lhs: '15:00', kailuan: '19:00',
  qhd_museum: '14:00', glass_museum: '14:00',
}

const dayPresets = [
  { label: '第1天 · 北戴河段', ids: ['bdh_stn', 'geziwo', 'yecunli', 'laohushi', 'biluota'] },
  { label: '第2天 · 秦皇岛段', ids: ['safari', 'qhd_alley', 'xigang', 'qhd_stn'] },
]

const tripModes: Array<{ key: TravelMode; label: string }> = [
  { key: 'driving', label: '🚗 驾车' },
  { key: 'bicycling', label: '🚲 骑行' },
  { key: 'transit', label: '🚌 公交' },
  { key: 'walking', label: '🚶 步行' },
]

const modeLabel: Record<string, string> = {
  driving: '驾车', bicycling: '骑行', transit: '公交', walking: '步行',
}

interface SegmentRoute {
  fromId: string
  toId: string
  distanceKm: number
  durationMin: number
  polyline: Array<{ lat: number; lng: number }>
}

// 最近邻 TSP 优化
function optimizeRoute(ids: string[]): string[] {
  if (ids.length <= 2) return ids
  const spotsMap = new Map(spots.map((s) => [s.id, s]))
  const unvisited = new Set(ids.slice(1))
  const result = [ids[0]]
  let current = spotsMap.get(ids[0])!
  while (unvisited.size > 0) {
    let best: string | null = null
    let bestDist = Infinity
    for (const id of unvisited) {
      const s = spotsMap.get(id)!
      const d = haversineDist(current.lat, current.lng, s.lat, s.lng)
      if (d < bestDist) { bestDist = d; best = id }
    }
    if (!best) break
    result.push(best)
    unvisited.delete(best)
    current = spotsMap.get(best)!
  }
  return result
}

export default function TripPlan() {
  const { wishlist, setWishlist, removeWish, clearWish } = useTripStore()
  const [dragIdx, setDragIdx] = useState<number | null>(null)
  const [showMap, setShowMap] = useState(false)
  const [mapReady, setMapReady] = useState(false)
  const [segmentRoutes, setSegmentRoutes] = useState<SegmentRoute[]>([])
  const [tripMode, setTripMode] = useState<TravelMode>('driving')
  const [routeLoading, setRouteLoading] = useState(false)
  const [tripUserLoc, setTripUserLoc] = useState<{ lat: number; lng: number; accuracy?: number } | null>(null)
  const [tripFollowMode, setTripFollowMode] = useState(false)
  const [showPermAlert, setShowPermAlert] = useState(false)
  const userLocRef = useRef<{ lat: number; lng: number; accuracy?: number } | null>(null)
  const mapContainer = useRef<HTMLDivElement>(null)
  const mapRef = useRef<any>(null)
  const overRef = useRef<any[]>([])
  const userMarkerRef = useRef<any>(null)
  const accuracyCircleRef = useRef<any>(null)

  const byId = (id: string) => spots.find((s) => s.id === id)

  // 当前顺序
  const [order, setOrder] = useState<string[]>(wishlist)
  // 同步 wishlist → order
  useEffect(() => { setOrder(wishlist) }, [wishlist])

  const items = order.map((id) => byId(id)).filter(Boolean) as typeof spots

  // 总览统计
  const stats = useMemo(() => {
    if (items.length < 2) return { dist: 0, time: 0, fare: 0 }
    let total = 0
    for (let i = 0; i < items.length - 1; i++) {
      total += haversineDist(items[i].lat, items[i].lng, items[i + 1].lat, items[i + 1].lng)
    }
    const roadDist = Math.round(total * 1.3 * 10) / 10
    const time = Math.round(roadDist / 30 * 60)
    const fare = estTaxiFare(roadDist)
    return { dist: roadDist, time, fare }
  }, [items])

  const timeStr = stats.time > 60 ? `${Math.floor(stats.time / 60)}h${stats.time % 60}m` : `${stats.time}m`

  const getSegDist = (i: number): string => {
    if (i >= items.length - 1) return ''
    const seg = segmentRoutes.find(r => r.fromId === items[i].id && r.toId === items[i + 1].id)
    if (seg) {
      const icon = tripMode === 'driving' ? '🚗' : tripMode === 'transit' ? '🚌' : tripMode === 'bicycling' ? '🚲' : '🚶'
      return `${icon} ${modeLabel[tripMode]} · ${seg.distanceKm}km · ${seg.durationMin}分钟`
    }
    return '⏳ 获取路线中...'
  }

  // 智能优化
  const handleOptimize = () => {
    const optimized = optimizeRoute(order)
    setOrder(optimized)
    setWishlist(optimized)
  }

  const lastItem = items[items.length - 1]
  const showTrainAlert = lastItem?.id === 'qhd_stn'
  const fillDay = (ids: string[]) => { setWishlist(ids); setOrder(ids) }

  // 加载地图 SDK
  useEffect(() => {
    if (!showMap) return
    loadTMap().then(() => setMapReady(true)).catch(() => {})
  }, [showMap])

  // 获取各段真实路线
  const fetchSegmentRoutes = useCallback(async (ids: string[], travelMode: TravelMode) => {
    if (ids.length < 2) { setSegmentRoutes([]); return }
    setRouteLoading(true)
    const key = import.meta.env.VITE_TENCENT_KEY
    if (!key) { setRouteLoading(false); return }

    const modePath = travelMode === 'walking' ? 'walking' : travelMode === 'bicycling' ? 'bicycling' : travelMode === 'transit' ? 'transit' : 'driving'
    const results: SegmentRoute[] = []

    for (let i = 0; i < ids.length - 1; i++) {
      const fromSpot = byId(ids[i])
      const toSpot = byId(ids[i + 1])
      if (!fromSpot || !toSpot) continue

      const fallbackRoute = () => {
        const d = haversineDist(fromSpot.lat, fromSpot.lng, toSpot.lat, toSpot.lng)
        const roadDist = Math.round(d * 1.3 * 10) / 10
        let durationMin: number
        if (travelMode === 'walking') durationMin = estWalkTime(roadDist)
        else if (travelMode === 'bicycling') durationMin = estRideTime(roadDist)
        else if (travelMode === 'transit') durationMin = estTransitTime(roadDist)
        else durationMin = estDriveTime(roadDist)
        return { distanceKm: roadDist, durationMin, polyline: [] as Array<{ lat: number; lng: number }> }
      }

      try {
        const res = await fetch(`/tencent-api/ws/direction/v1/${modePath}/?from=${fromSpot.lat},${fromSpot.lng}&to=${toSpot.lat},${toSpot.lng}&key=${key}`)
        const data = await res.json()
        if (data.status === 0 && data.result?.routes?.length) {
          const route = data.result.routes[0]
          let pl: Array<{ lat: number; lng: number }> = []
          if (travelMode === 'transit' && route.steps) {
            for (const step of route.steps) {
              if (step.polyline) pl = pl.concat(decodeDirectionPolyline(step.polyline))
            }
          } else if (route.polyline) {
            pl = decodeDirectionPolyline(route.polyline)
          }
          results.push({ fromId: ids[i], toId: ids[i + 1], distanceKm: Math.round(route.distance / 1000 * 10) / 10, durationMin: Math.round(route.duration), polyline: pl })
        } else {
          const fb = fallbackRoute()
          results.push({ fromId: ids[i], toId: ids[i + 1], ...fb })
        }
      } catch {
        const fb = fallbackRoute()
        results.push({ fromId: ids[i], toId: ids[i + 1], ...fb })
      }
    }
    setSegmentRoutes(results)
    setRouteLoading(false)
  }, [])

  // 当顺序或出行方式变化时重新获取路线
  useEffect(() => {
    setSegmentRoutes([])
    fetchSegmentRoutes(order, tripMode)
  }, [order, tripMode, fetchSegmentRoutes])

  // 用户位置 + 实时跟踪
  useEffect(() => {
    getUserLocation().then((loc) => { if (loc) { setTripUserLoc(loc); userLocRef.current = loc } })
  }, [])

  useEffect(() => {
    const stopped = { current: false }
    return watchUserLocation(
      (loc) => {
        userLocRef.current = loc
        try { userMarkerRef.current?.setGeometries?.([{ id: 'user', styleId: 'm', position: new window.TMap.LatLng(loc.lat, loc.lng), properties: { title: '我的位置' } }]) } catch {}
        try { accuracyCircleRef.current?.setGeometries?.([{ styleId: 'a', center: new window.TMap.LatLng(loc.lat, loc.lng), radius: loc.accuracy || 50 }]) } catch {}
        if (!stopped.current && tripFollowMode) {
          try { mapRef.current?.setCenter(new window.TMap.LatLng(loc.lat, loc.lng)) } catch {}
        }
      },
      () => {},
    )
  }, [mapReady, tripFollowMode])

  // 地图初始化 + 标记 + 真实轨迹线
  useEffect(() => {
    if (!mapReady || !mapContainer.current || items.length < 2) return

    // 清理旧覆盖物
    overRef.current.forEach(o => o.setMap?.(null))
    overRef.current = []
    if (mapRef.current) { mapRef.current = null }

    const map = new window.TMap.Map(mapContainer.current, {
      center: new window.TMap.LatLng(39.88, 119.5), zoom: 11,
    })
    mapRef.current = map

    // 用户位置蓝点 + 精度圈
    if (tripUserLoc) {
      try {
        const houseIcon = getHouseIcon()
        const us = new window.TMap.MarkerStyle({
          width: 28, height: 28, anchor: { x: 14, y: 14 },
          color: '#3B82F6',
          ...(houseIcon ? { icon: houseIcon } : {}),
        })
        userMarkerRef.current = new window.TMap.MultiMarker({
          map, styles: { m: us },
          geometries: [{ id: 'user', styleId: 'm', position: new window.TMap.LatLng(tripUserLoc.lat, tripUserLoc.lng), properties: { title: '我的位置' } }],
        })
        overRef.current.push(userMarkerRef.current)
      } catch {}
      if (tripUserLoc.accuracy && tripUserLoc.accuracy > 0 && tripUserLoc.accuracy < 1000) {
        try {
          accuracyCircleRef.current = new (window.TMap as any).MultiCircle({
            map,
            styles: { a: new (window.TMap as any).CircleStyle({ color: '#3B82F6', strokeColor: '#3B82F6', strokeWidth: 1, opacity: 0.12 }) },
            geometries: [{ styleId: 'a', center: new window.TMap.LatLng(tripUserLoc.lat, tripUserLoc.lng), radius: tripUserLoc.accuracy }],
          })
          overRef.current.push(accuracyCircleRef.current)
        } catch {}
      }
    }

    // 标记各地点
    const data = items.map((p, i) => ({
      id: p.id, styleId: 'm',
      position: new window.TMap.LatLng(p.lat, p.lng),
      properties: { title: `${i + 1}. ${p.name}` },
    }))
    const style = new window.TMap.MarkerStyle({ width: 24, height: 32, anchor: { x: 12, y: 32 }, color: '#0891B2' })
    const mm = new window.TMap.MultiMarker({ map, styles: { m: style }, geometries: data })
    overRef.current.push(mm)

    // 真实轨迹线
    for (let i = 0; i < items.length - 1; i++) {
      const seg = segmentRoutes.find(r => r.fromId === items[i].id && r.toId === items[i + 1].id)
      let pts: Array<any>
      if (seg && seg.polyline.length >= 2) {
        pts = seg.polyline.map(p => new window.TMap.LatLng(p.lat, p.lng))
      } else {
        pts = generateCurvedPath(items[i].lat, items[i].lng, items[i + 1].lat, items[i + 1].lng)
          .map(p => new window.TMap.LatLng(p.lat, p.lng))
      }
      try {
        const pl = new (window.TMap as any).MultiPolyline({
          map,
          styles: { r: new (window.TMap as any).PolylineStyle({ color: '#0891B2', width: 3, borderWidth: 1, borderColor: '#FFFFFF' }) },
          geometries: [{ styleId: 'r', paths: [pts] }],
        })
        overRef.current.push(pl)
      } catch {}
    }

    // 视野
    try {
      const b = new (window.TMap as any).LatLngBounds()
      items.forEach((p) => b.extend(new window.TMap.LatLng(p.lat, p.lng)))
      map.fitBounds(b)
    } catch {}
  }, [mapReady, items, segmentRoutes, tripUserLoc])

  return (
    <div>
      <div className="flex flex-wrap items-center gap-4 mb-6">
        <div>
          <PageIntro {...pageIntros.trip} />
          <h2 className="text-2xl font-bold text-ocean-800">📋 我的行程</h2>
          <p className="text-sm text-gray-500">从地点库收藏地点即可添加到行程</p>
        </div>
        <div className="ml-auto flex flex-wrap gap-2">
          {dayPresets.map((d) => (
            <button key={d.label} onClick={() => fillDay(d.ids)}
              className="px-3 py-1.5 text-xs rounded-xl bg-white border border-ocean-200 text-ocean-700 hover:bg-ocean-50">
              📥 {d.label}
            </button>
          ))}
          {items.length >= 2 && (
            <>
              <div className="flex gap-0.5 bg-gray-100 rounded-lg p-0.5">
                {tripModes.map((m) => (
                  <button key={m.key} onClick={() => setTripMode(m.key)}
                    className={`px-2 py-1 rounded-md text-xs font-medium transition-colors ${tripMode === m.key ? 'bg-white text-ocean-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                    {m.label}
                  </button>
                ))}
              </div>
              <button onClick={handleOptimize}
                className="px-3 py-1.5 text-xs rounded-xl bg-ocean-500 text-white hover:bg-ocean-600">
                🧠 智能优化顺序
              </button>
              <button onClick={() => setShowMap((v) => !v)}
                className={`px-3 py-1.5 text-xs rounded-xl border ${showMap ? 'bg-ocean-500 text-white border-ocean-500' : 'bg-white border-ocean-200 text-ocean-700'}`}>
                🗺️ 路线图
              </button>
            </>
          )}
        </div>
      </div>

      {showMap && items.length >= 2 && (
        <div ref={mapContainer} className="h-[250px] card rounded-2xl overflow-hidden mb-6 relative">
          {routeLoading && <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-20 text-sm text-gray-500">⏳ 加载路线中...</div>}
          {tripUserLoc && (
            <div className="absolute bottom-3 right-3 flex flex-col gap-1.5 z-10">
              <button onClick={() => setTripFollowMode(v => !v)}
                className={`w-9 h-9 rounded-full flex items-center justify-center shadow-lg text-base transition-colors ${tripFollowMode ? 'bg-ocean-500 text-white' : 'bg-white hover:bg-gray-50'}`}
                title={tripFollowMode ? '跟随模式已开启' : '开启跟随模式'}>🎯</button>
              <button onClick={() => {
                const jump = (lat: number, lng: number) => { const m = mapRef.current; m?.setCenter(new window.TMap.LatLng(lat, lng)); m?.setZoom(16); setTripFollowMode(true) }
                if (navigator.geolocation) {
                  navigator.geolocation.getCurrentPosition(
                    (pos) => jump(pos.coords.latitude, pos.coords.longitude),
                    (err) => { if (err.code === 1) setShowPermAlert(true); else if (userLocRef.current) jump(userLocRef.current.lat, userLocRef.current.lng) },
                    { enableHighAccuracy: true, timeout: 3000, maximumAge: 0 },
                  )
                } else if (userLocRef.current) jump(userLocRef.current.lat, userLocRef.current.lng)
              }}
                className="w-9 h-9 rounded-full bg-white flex items-center justify-center shadow-lg hover:bg-gray-50 text-base"
                title={tripUserLoc.accuracy ? `我的位置 ±${tripUserLoc.accuracy}m` : '我的位置'}>📍</button>
            </div>
          )}
        </div>
      )}

      {items.length === 0 ? (
        <div className="card p-12 text-center text-gray-500">
          <div className="text-5xl mb-4">📭</div>
          <p className="text-lg font-medium text-gray-600 mb-2">行程为空</p>
          <p className="text-sm mb-6">前往「地点库」收藏地点，或点击上方按钮一键填充推荐行程</p>
          <div className="flex justify-center gap-3">
            {dayPresets.map((d) => (
              <button key={d.label} onClick={() => fillDay(d.ids)} className="btn-solid text-sm px-5 py-2.5">📥 {d.label}</button>
            ))}
          </div>
        </div>
      ) : (
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 card p-6">
            <div className="relative">
              <div className="absolute left-5 top-8 bottom-8 w-0.5 bg-gradient-to-b from-ocean-400 to-ocean-200" />
              <div className="space-y-1">
                {items.map((p, i) => (
                  <div key={p.id}>
                    <div draggable
                      onDragStart={() => setDragIdx(i)}
                      onDragOver={(e) => { e.preventDefault(); if (dragIdx !== null && dragIdx !== i) setDragIdx(i) }}
                      onDragEnd={() => setDragIdx(null)}
                      className={`relative pl-14 pr-4 py-4 rounded-xl transition-colors ${dragIdx === i ? 'bg-ocean-100' : 'bg-white/60 hover:bg-white'}`}>
                      <div className="absolute left-3 top-5 w-4 h-4 rounded-full bg-ocean-500 border-4 border-white shadow" />
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-ocean-600 w-12">{defaultTimes[p.id] || '--:--'}</span>
                        <span className="text-xs text-gray-400">#{i + 1}</span>
                        <span className="font-bold text-gray-800">{p.name}</span>
                        <span className="chip-blue">{p.type}</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1 ml-14">{p.address}</p>
                      <button onClick={() => removeWish(p.id)}
                        className="absolute top-4 right-2 text-gray-400 hover:text-red-500 text-sm">✕</button>
                    </div>
                    {i < items.length - 1 && (
                      <div className="flex items-center gap-2 pl-14 py-1.5">
                        <div className="w-px h-4 bg-gray-200 ml-0.5" />
                        <span className="text-xs text-gray-400">{getSegDist(i)}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="card p-5">
              <h3 className="font-semibold text-gray-700 mb-3">📊 行程概览</h3>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { val: timeStr, label: '总耗时', color: 'bg-ocean-50 text-ocean-600', unit: '' },
                  { val: `${stats.dist}`, label: '总路程', color: 'bg-blue-50 text-blue-600', unit: 'km' },
                  { val: `¥${stats.fare}`, label: '打车预算', color: 'bg-orange-50 text-orange-600', unit: '预估' },
                  { val: `${items.length}`, label: '已选地点', color: 'bg-purple-50 text-purple-600', unit: '个' },
                ].map((d, i) => (
                  <div key={i} className={`${d.color} rounded-xl p-4 text-center`}>
                    <div className="text-xl font-bold">{d.val}</div>
                    <div className="text-xs mt-0.5">{d.label}{d.unit ? ` · ${d.unit}` : ''}</div>
                  </div>
                ))}
              </div>
            </div>

            {showTrainAlert && (
              <div className="card p-5 bg-gradient-to-r from-orange-50 to-yellow-50 border-orange-100">
                <div className="flex gap-3">
                  <span className="text-2xl">⏰</span>
                  <div>
                    <h4 className="font-semibold text-orange-700">赶车提醒</h4>
                    <p className="text-sm text-orange-600 mt-1">终点为秦皇岛站，请注意返程车次时间</p>
                  </div>
                </div>
              </div>
            )}

            <button onClick={clearWish}
              className="w-full py-3 text-sm text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors">
              🗑️ 清空行程
            </button>
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
