import { useMemo, useState, useEffect, useRef, useCallback } from 'react'
import { useTripStore } from '../store/tripStore'
import { haversineDist, estDriveTime, estTaxiFare, estWalkTime, estRideTime, estTransitTime, decodeDirectionPolyline, generateCurvedPath } from '../utils/geo'
import { loadTMap, getUserLocation, watchUserLocation } from '../services/api'
import { pageIntros } from '../data/pageIntros'
import PageIntro from '../components/PageIntro'
import { getHouseIcon } from '../utils/icons'
import type { TravelMode, DayPlan, Spot } from '../types'
import html2canvas from 'html2canvas'

const DAYS_KEY = 'qhd_trip_days'

const iconMap: Record<string, string> = { station: '🚉', play: '🎯', food: '🍽️', rainy: '🏛️' }

const tripModes: Array<{ key: TravelMode; label: string }> = [
  { key: 'driving', label: '🚗 驾车' },
  { key: 'bicycling', label: '🚲 骑行' },
  { key: 'transit', label: '🚌 公交' },
  { key: 'walking', label: '🚶 步行' },
]

const modeLabel: Record<string, string> = {
  driving: '驾车', bicycling: '骑行', transit: '公交', walking: '步行',
}

const modeEmoji: Record<string, string> = {
  driving: '🚗', bicycling: '🚲', transit: '🚌', walking: '🚶',
}

interface SegmentRoute {
  fromId: string
  toId: string
  distanceKm: number
  durationMin: number
  polyline: Array<{ lat: number; lng: number }>
}

// 最近邻 TSP 优化
function optimizeRoute(ids: string[], allSpots: Spot[]): string[] {
  if (ids.length <= 2) return ids
  const spotsMap = new Map(allSpots.map((s) => [s.id, s]))
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

function loadDays(): DayPlan[] {
  try {
    const raw = localStorage.getItem(DAYS_KEY)
    if (raw) return JSON.parse(raw)
  } catch {}
  return []
}

function saveDays(days: DayPlan[]) {
  try { localStorage.setItem(DAYS_KEY, JSON.stringify(days)) } catch {}
}

export default function TripPlan() {
  const { wishlist, clearWish, spots } = useTripStore()
  const byId = (id: string) => spots.find((s) => s.id === id)

  // ------ 多日行程状态 ------
  const [days, setDaysState] = useState<DayPlan[]>(() => {
    const saved = loadDays()
    if (saved.length > 0) return saved
    // 首次使用：从 wishlist 创建第一天
    if (wishlist.length > 0) {
      return [{ id: 'day_0', label: '第1天', items: wishlist.map((id) => ({ spotId: id })) }]
    }
    return []
  })
  const setDays = (d: DayPlan[]) => { setDaysState(d); saveDays(d) }

  const [activeDay, setActiveDay] = useState(0)

  // ------ 各段出行方式（key: "fromId>toId" → mode） ------
  const [segmentModes, setSegmentModes] = useState<Record<string, TravelMode>>({})
  const getSegKey = (from: string, to: string) => `${from}>${to}`
  const getSegMode = (from: string, to: string) => segmentModes[getSegKey(from, to)] || 'driving'
  const setSegMode = (from: string, to: string, mode: TravelMode) => {
    setSegmentModes((prev) => ({ ...prev, [getSegKey(from, to)]: mode }))
  }

  const [dragIdx, setDragIdx] = useState<number | null>(null)
  const [showWishDrawer, setShowWishDrawer] = useState(false)
  const [wishSearch, setWishSearch] = useState('')
  // 地图相关
  const [showMap, setShowMap] = useState(false)
  const [mapReady, setMapReady] = useState(false)
  const [segmentRoutes, setSegmentRoutes] = useState<SegmentRoute[]>([])
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
  const exportRef = useRef<HTMLDivElement>(null)

  // 当前天的 items
  const currentDay = days[activeDay]
  const currentItems = (currentDay?.items || []).map((d) => byId(d.spotId)).filter(Boolean) as Spot[]

  // ------ 初始化：从 wishlist 同步新收藏 ------
  // 当 wishlist 新增了未在 days 中的地点时，加入"未分配"
  // 处理方式：保存所有未分配 spotId 的引用；已有 days 不变
  useEffect(() => {
    // 如果 days 为空但 wishlist 有内容，创建第一天
    if (days.length === 0 && wishlist.length > 0) {
      const newDays = [{ id: 'day_0', label: '第1天', items: wishlist.map((id) => ({ spotId: id })) }]
      setDays(newDays)
    }
  }, [wishlist])

  // ------ 统计 ------
  const stats = useMemo(() => {
    if (currentItems.length < 2) return { dist: 0, time: 0, fare: 0 }
    let total = 0
    for (let i = 0; i < currentItems.length - 1; i++) {
      total += haversineDist(currentItems[i].lat, currentItems[i].lng, currentItems[i + 1].lat, currentItems[i + 1].lng)
    }
    const roadDist = Math.round(total * 1.3 * 10) / 10
    const time = Math.round(roadDist / 30 * 60)
    const fare = estTaxiFare(roadDist)
    return { dist: roadDist, time, fare }
  }, [currentItems])

  const timeStr = stats.time > 60 ? `${Math.floor(stats.time / 60)}h${stats.time % 60}m` : `${stats.time}m`

  // ------ Day 管理 ------
  const addDay = () => {
    const newId = `day_${days.length}`
    setDays([...days, { id: newId, label: `第${days.length + 1}天`, items: [] }])
    setActiveDay(days.length)
  }

  const removeDay = (idx: number) => {
    if (days.length <= 1) return
    const next = days.filter((_, i) => i !== idx)
    setDays(next)
    if (activeDay >= next.length) setActiveDay(next.length - 1)
  }

  const updateDayLabel = (idx: number, label: string) => {
    const next = [...days]
    next[idx] = { ...next[idx], label }
    setDays(next)
  }

  // ------ 地点管理 ------
  const addToDay = (spotId: string) => {
    const next = [...days]
    next[activeDay] = { ...next[activeDay], items: [...next[activeDay].items, { spotId }] }
    setDays(next)
  }

  const removeFromDay = (spotId: string) => {
    const next = [...days]
    next[activeDay] = { ...next[activeDay], items: next[activeDay].items.filter((i) => i.spotId !== spotId) }
    setDays(next)
  }

  const updateArrivalTime = (spotId: string, time: string) => {
    const next = [...days]
    next[activeDay] = {
      ...next[activeDay],
      items: next[activeDay].items.map((i) => i.spotId === spotId ? { ...i, arrivalTime: time } : i),
    }
    setDays(next)
  }

  // ------ 时间自动推算 ------
  const autoCalcTimes = () => {
    const items = currentDay?.items
    if (!items || items.length === 0) return
    const now = new Date()
    let h = now.getHours()
    let m = Math.ceil(now.getMinutes() / 15) * 15
    if (m >= 60) { h++; m = 0 }
    const startTime = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
    // 在下一个 tick 推算，确保 state 一致
    setDaysState((prev) => {
      const next = [...prev]
      const day = { ...next[activeDay] }
      const items2 = [...day.items]
      items2[0] = { ...items2[0], arrivalTime: startTime }
      for (let i = 0; i < items2.length - 1; i++) {
        const seg = segmentRoutes.find(r => r.fromId === items2[i].spotId && r.toId === items2[i + 1].spotId)
        const duration = seg?.durationMin || Math.ceil(haversineDist(
          byId(items2[i].spotId)?.lat || 0, byId(items2[i].spotId)?.lng || 0,
          byId(items2[i + 1].spotId)?.lat || 0, byId(items2[i + 1].spotId)?.lng || 0,
        ) * 1.3 / 30 * 60)
        const cur = items2[i].arrivalTime
        if (cur) {
          const [h2, m2] = cur.split(':').map(Number)
          const totalMin = h2 * 60 + m2 + Math.max(duration, 5)
          const nh = Math.floor(totalMin / 60) % 24
          const nm = totalMin % 60
          items2[i + 1] = { ...items2[i + 1], arrivalTime: `${String(nh).padStart(2, '0')}:${String(nm).padStart(2, '0')}` }
        }
      }
      day.items = items2
      next[activeDay] = day
      saveDays(next)
      return next
    })
  }

  // 当 segmentRoutes 更新时，如果有已设置的时间则自动推算后续
  useEffect(() => {
    const items = currentDay?.items
    if (!items || items.length < 2) return
    const firstTime = items[0]?.arrivalTime
    if (!firstTime) return
    // 检查是否有后续未设置时间的项
    const needsPropagation = items.some((item, i) => i > 0 && !item.arrivalTime)
    if (!needsPropagation) return
    setDaysState((prev) => {
      const next = [...prev]
      const day = { ...next[activeDay] }
      const items2 = [...day.items]
      for (let i = 0; i < items2.length - 1; i++) {
        const seg = segmentRoutes.find(r => r.fromId === items2[i].spotId && r.toId === items2[i + 1].spotId)
        const duration = seg?.durationMin || Math.ceil(haversineDist(
          byId(items2[i].spotId)?.lat || 0, byId(items2[i].spotId)?.lng || 0,
          byId(items2[i + 1].spotId)?.lat || 0, byId(items2[i + 1].spotId)?.lng || 0,
        ) * 1.3 / 30 * 60)
        const cur = items2[i].arrivalTime
        if (cur) {
          const [h2, m2] = cur.split(':').map(Number)
          const totalMin = h2 * 60 + m2 + Math.max(duration, 5)
          items2[i + 1] = { ...items2[i + 1], arrivalTime: `${String(Math.floor(totalMin / 60) % 24).padStart(2, '0')}:${String(totalMin % 60).padStart(2, '0')}` }
        }
      }
      day.items = items2
      next[activeDay] = day
      saveDays(next)
      return next
    })
  }, [segmentRoutes])

  // ------ 拖拽排序 ------
  const dragSourceRef = useRef<number | null>(null)

  const onDragStart = (idx: number) => {
    dragSourceRef.current = idx
  }

  const onDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault()
    setDragIdx(idx)
  }

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const from = dragSourceRef.current
    const to = dragIdx
    dragSourceRef.current = null
    setDragIdx(null)
    if (from === null || to === null || from === to) return

    // 跨 day drop: 检查 dataTransfer 是否有跨天标记
    const crossDayId = e.dataTransfer?.getData('text/cross-day-spot')
    if (crossDayId) {
      // 从其他 day 移过来
      const srcDayIdx = parseInt(e.dataTransfer.getData('text/src-day-idx') || '-1')
      if (srcDayIdx >= 0 && srcDayIdx < days.length) {
        const next = [...days]
        const srcDay = { ...next[srcDayIdx] }
        const srcItems = [...srcDay.items]
        const spotIdx = srcItems.findIndex((i) => i.spotId === crossDayId)
        if (spotIdx >= 0) {
          const [moved] = srcItems.splice(spotIdx, 1)
          srcDay.items = srcItems
          next[srcDayIdx] = srcDay
          const dstDay = { ...next[activeDay] }
          const dstItems = [...dstDay.items]
          dstItems.splice(to, 0, moved)
          dstDay.items = dstItems
          next[activeDay] = dstDay
          setDays(next)
        }
      }
      return
    }

    // 同 day 内拖拽
    const next = [...days]
    const day = { ...next[activeDay] }
    const items = [...day.items]
    const [moved] = items.splice(from, 1)
    items.splice(to, 0, moved)
    day.items = items
    next[activeDay] = day
    setDays(next)
  }

  // 跨 day 拖拽开始（从侧边栏或其他 day）
  const onCrossDayDragStart = (e: React.DragEvent, spotId: string, srcDayIdx: number) => {
    e.dataTransfer.setData('text/cross-day-spot', spotId)
    e.dataTransfer.setData('text/src-day-idx', String(srcDayIdx))
  }

  // ------ 路线获取 ------
  const fetchDayRoutes = useCallback(async (dayPlan: DayPlan, modes: Record<string, TravelMode>) => {
    const ids = dayPlan.items.map((i) => i.spotId)
    if (ids.length < 2) { setSegmentRoutes([]); return }
    setRouteLoading(true)
    const key = import.meta.env.VITE_TENCENT_KEY
    if (!key) { setRouteLoading(false); return }

    const results: SegmentRoute[] = []

    for (let i = 0; i < ids.length - 1; i++) {
      const fromSpot = byId(ids[i])
      const toSpot = byId(ids[i + 1])
      if (!fromSpot || !toSpot) continue

      const travelMode = modes[getSegKey(ids[i], ids[i + 1])] || 'driving'
      const modePath = travelMode === 'walking' ? 'walking' : travelMode === 'bicycling' ? 'bicycling' : travelMode === 'transit' ? 'transit' : 'driving'

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
        const res = await fetch(`/api/proxy/ws/direction/v1/${modePath}/?from=${fromSpot.lat},${fromSpot.lng}&to=${toSpot.lat},${toSpot.lng}&key=${key}`)
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

  // 当前天的 items 或 segmentModes 变化时重新获取路线
  useEffect(() => {
    if (!currentDay) return
    setSegmentRoutes([])
    fetchDayRoutes(currentDay, segmentModes)
  }, [currentDay?.items.map((i) => i.spotId).join(','), segmentModes])

  // ------ 用户位置 ------
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

  // ------ 地图初始化 ------
  useEffect(() => {
    if (!showMap) return
    loadTMap().then(() => setMapReady(true)).catch(() => {})
  }, [showMap])

  useEffect(() => {
    if (!mapReady || !mapContainer.current || currentItems.length < 2) return

    overRef.current.forEach((o) => o.setMap?.(null))
    overRef.current = []
    if (mapRef.current) { mapRef.current = null }

    const map = new window.TMap.Map(mapContainer.current, {
      center: new window.TMap.LatLng(39.88, 119.5), zoom: 11,
    })
    mapRef.current = map

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

    const data = currentItems.map((p, i) => ({
      id: p.id, styleId: 'm',
      position: new window.TMap.LatLng(p.lat, p.lng),
      properties: { title: `${i + 1}. ${p.name}` },
    }))
    const style = new window.TMap.MarkerStyle({ width: 24, height: 32, anchor: { x: 12, y: 32 }, color: '#0891B2' })
    const mm = new window.TMap.MultiMarker({ map, styles: { m: style }, geometries: data })
    overRef.current.push(mm)

    for (let i = 0; i < currentItems.length - 1; i++) {
      const seg = segmentRoutes.find(r => r.fromId === currentItems[i].id && r.toId === currentItems[i + 1].id)
      let pts: Array<any>
      if (seg && seg.polyline.length >= 2) {
        pts = seg.polyline.map(p => new window.TMap.LatLng(p.lat, p.lng))
      } else {
        pts = generateCurvedPath(currentItems[i].lat, currentItems[i].lng, currentItems[i + 1].lat, currentItems[i + 1].lng)
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

    try {
      const b = new (window.TMap as any).LatLngBounds()
      currentItems.forEach((p) => b.extend(new window.TMap.LatLng(p.lat, p.lng)))
      map.fitBounds(b)
    } catch {}
  }, [mapReady, currentItems, segmentRoutes, tripUserLoc])


  // ------ 图片导出 ------
  const handleExport = async () => {
    const el = exportRef.current
    if (!el) return
    try {
      // 滚动到导出区域，确保全量渲染
      el.scrollIntoView({ behavior: 'instant', block: 'start' })
      await new Promise((r) => setTimeout(r, 500))
      // 等待图片加载
      await Promise.all(
        Array.from(el.querySelectorAll('img')).map((img) =>
          img.complete ? Promise.resolve() : new Promise((ok) => { img.onload = ok; img.onerror = ok })
        )
      )
      // 强制所有 lazy 图片加载
      el.querySelectorAll('img[loading="lazy"]').forEach((img) => {
        if (!(img as HTMLImageElement).complete) {
          (img as HTMLImageElement).loading = 'eager'
        }
      })
      await new Promise((r) => setTimeout(r, 300))
      const canvas = await html2canvas(el, {
        backgroundColor: '#ffffff',
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: false,
        onclone: (doc) => {
          // 在克隆文档中移除文字截断，确保导出时内容完整
          const cloned = doc.querySelector('[data-export-root]')
          if (cloned) {
            cloned.querySelectorAll('.truncate, .line-clamp-1, .line-clamp-2, .line-clamp-3').forEach((el) => {
              el.classList.remove('truncate', 'line-clamp-1', 'line-clamp-2', 'line-clamp-3')
              ;(el as HTMLElement).style.overflow = 'visible'
            })
            // 确保所有文本行完整显示
            cloned.querySelectorAll('[class*="overflow-hidden"]').forEach((el) => {
              ;(el as HTMLElement).style.overflow = 'visible'
            })
          }
        },
      })
      const link = document.createElement('a')
      link.download = `行程_${currentDay?.label || 'plan'}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
    } catch {}
  }

  // ------ 智能优化（当前天） ------
  const handleOptimize = () => {
    if (!currentDay || currentDay.items.length < 2) return
    const optIds = optimizeRoute(currentDay.items.map((i) => i.spotId), spots)
    const next = [...days]
    next[activeDay] = { ...next[activeDay], items: optIds.map((id) => ({ spotId: id })) }
    setDays(next)
  }

  // 获取段信息显示文本
  const getSegDisplay = (i: number): { text: string; from: string; to: string } | null => {
    if (i >= currentItems.length - 1) return null
    const from = currentItems[i].id
    const to = currentItems[i + 1].id
    const seg = segmentRoutes.find(r => r.fromId === from && r.toId === to)
    const mode = getSegMode(from, to)
    if (seg) {
      return {
        text: `${modeEmoji[mode]} ${modeLabel[mode]} · ${seg.distanceKm}km · ${seg.durationMin}分钟`,
        from, to,
      }
    }
    return { text: '⏳ 获取路线中...', from, to }
  }

  // 未在当前天的 wishlist 地点
  const availableWishSpots = spots.filter(
    (s) => wishlist.includes(s.id) && !currentDay?.items.some((i) => i.spotId === s.id)
  )
  const filteredWishSpots = wishSearch
    ? availableWishSpots.filter((s) => s.name.includes(wishSearch) || s.tags.some((t) => t.includes(wishSearch)))
    : availableWishSpots

  // 空的草稿天不能删除（最少保留一个）
  const canRemoveDay = days.length > 1

  return (
    <div>
      <div className="flex flex-wrap items-start gap-4 mb-4">
        <div className="flex-1 min-w-0">
          <PageIntro {...pageIntros.trip} />
          <h2 className="text-2xl font-bold text-ocean-800">📋 我的行程</h2>
          <p className="text-sm text-gray-500">从地点库收藏地点，然后组织到每一天</p>
        </div>
      </div>

      {/* Day Tabs */}
      {days.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 mb-4">
          {days.map((d, idx) => (
            <button key={d.id} onClick={() => setActiveDay(idx)}
              onDragOver={(e) => { e.preventDefault() }}
              onDrop={(e) => {
                e.preventDefault()
                const crossDayId = e.dataTransfer?.getData('text/cross-day-spot')
                if (crossDayId) {
                  const srcDayIdx = parseInt(e.dataTransfer.getData('text/src-day-idx') || '-1')
                  if (srcDayIdx >= 0 && srcDayIdx < days.length && srcDayIdx !== idx) {
                    const next = [...days]
                    const srcDay = { ...next[srcDayIdx] }
                    const spotIdx = srcDay.items.findIndex((i) => i.spotId === crossDayId)
                    if (spotIdx >= 0) {
                      const [moved] = srcDay.items.splice(spotIdx, 1)
                      srcDay.items = srcDay.items
                      next[srcDayIdx] = srcDay
                      const dstDay = { ...next[idx] }
                      dstDay.items = [...dstDay.items, moved]
                      next[idx] = dstDay
                      setDays(next)
                      setActiveDay(idx)
                    }
                  }
                }
              }}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors relative
                ${idx === activeDay
                  ? 'bg-ocean-500 text-white shadow-md'
                  : 'bg-white text-gray-600 border border-ocean-100 hover:bg-ocean-50'
                }`}>
              {d.label}
              <span className="ml-1.5 text-xs opacity-70">({d.items.length})</span>
            </button>
          ))}
          <button onClick={addDay}
            className="px-3 py-2 rounded-xl text-sm font-medium bg-white border border-dashed border-ocean-300 text-ocean-600 hover:bg-ocean-50">
            + 添加天
          </button>
          {canRemoveDay && (
            <button onClick={() => removeDay(activeDay)}
              className="px-3 py-2 rounded-xl text-sm font-medium text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors">
              🗑️ 删除此天
            </button>
          )}
          {/* 天数标签编辑 */}
          {currentDay && (
            <input value={currentDay.label} onChange={(e) => updateDayLabel(activeDay, e.target.value)}
              className="ml-auto px-3 py-1.5 rounded-lg border border-ocean-100 text-sm text-gray-600 bg-white/80 w-32 focus:outline-none focus:ring-2 focus:ring-ocean-400"
              placeholder="天数名称" />
          )}
        </div>
      )}

      {days.length === 0 ? (
        <div className="card p-12 text-center text-gray-500">
          <div className="text-5xl mb-4">📭</div>
          <p className="text-lg font-medium text-gray-600 mb-2">行程为空</p>
          <p className="text-sm mb-6">前往「地点库」收藏地点，然后在此组织行程</p>
          <button onClick={addDay} className="btn-solid text-sm px-5 py-2.5">📥 创建第一天</button>
        </div>
      ) : (
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            {/* 操作栏 */}
            {currentItems.length >= 2 && (
              <div className="flex flex-wrap gap-2 items-center">
                <button onClick={handleOptimize}
                  className="px-3 py-1.5 text-xs rounded-xl bg-ocean-500 text-white hover:bg-ocean-600">
                  🧠 智能排序
                </button>
                <button onClick={autoCalcTimes}
                  className="px-3 py-1.5 text-xs rounded-xl bg-amber-500 text-white hover:bg-amber-600">
                  ⏰ 推算时间
                </button>
                <button onClick={() => setShowMap((v) => !v)}
                  className={`px-3 py-1.5 text-xs rounded-xl border ${showMap ? 'bg-ocean-500 text-white border-ocean-500' : 'bg-white border-ocean-200 text-ocean-700'}`}>
                  🗺️ 路线图
                </button>
                <button onClick={handleExport}
                  className="px-3 py-1.5 text-xs rounded-xl bg-white border border-ocean-200 text-ocean-700 hover:bg-ocean-50">
                  📷 导出图片
                </button>
                <button onClick={() => setShowWishDrawer(true)}
                  className="px-3 py-1.5 text-xs rounded-xl bg-white border border-ocean-200 text-ocean-700 hover:bg-ocean-50">
                  📥 从收藏添加
                </button>
              </div>
            )}

            {/* 路线图 */}
            {showMap && currentItems.length >= 2 && (
              <div ref={mapContainer} className="h-[250px] card rounded-2xl overflow-hidden relative">
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

            {/* Day Content - 信息卡列表 */}
            <div ref={exportRef} data-export-root className="card p-6">
              {currentItems.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <p className="mb-3">此天还没有地点</p>
                  <button onClick={() => setShowWishDrawer(true)} className="btn-outline text-sm px-4 py-2">
                    📥 从收藏添加
                  </button>
                </div>
              ) : (
                <div>
                  {/* Export day header */}
                  <div className="text-center mb-5 pb-4" style={{ borderBottom: '2px solid #E2E8F0' }}>
                    <div className="text-2xl font-bold text-gray-800">{currentDay?.label}</div>
                    <div className="text-xs text-gray-400 mt-1">秦皇岛双站旅行地图 · 北戴河站 → 秦皇岛站</div>
                  </div>
                  <div className="relative">
                    <div className="absolute left-5 top-8 bottom-8 w-0.5 bg-gradient-to-b from-ocean-400 to-ocean-200" />
                    <div className="space-y-1">
                      {currentItems.map((spot, i) => {
                        const segInfo = getSegDisplay(i)
                        return (
                          <div key={spot.id}>
                            {/* 地点卡片 */}
                            <div draggable
                              onDragStart={() => onDragStart(i)}
                              onDragOver={(e) => onDragOver(e, i)}
                              onDragEnd={() => { dragSourceRef.current = null; setDragIdx(null) }}
                              onDrop={onDrop}
                              className={`relative pl-14 pr-3 py-4 rounded-xl transition-colors cursor-grab active:cursor-grabbing
                                ${dragIdx === i ? 'bg-ocean-100 ring-2 ring-ocean-300' : 'bg-white/60 hover:bg-white hover:shadow-sm'}`}>
                              {/* 时间线圆点 + 序号 */}
                              <div className="absolute left-3 top-5 w-4 h-4 rounded-full bg-ocean-500 border-4 border-white shadow" />
                              <div className="absolute left-3 top-9 text-[10px] font-bold text-ocean-400 w-4 text-center">
                                {i + 1}
                              </div>

                              <div className="flex gap-3">
                                {/* 图片 */}
                                {spot.imageUrl ? (
                                  <div className="w-16 h-16 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0">
                                    <img src={spot.imageUrl} alt={spot.name}
                                      className="w-full h-full object-cover"
                                      loading="lazy" />
                                  </div>
                                ) : (
                                  <div className="w-16 h-16 rounded-xl bg-ocean-50 flex items-center justify-center text-2xl flex-shrink-0">
                                    {iconMap[spot.category] || '📍'}
                                  </div>
                                )}

                                {/* 信息 */}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-bold text-gray-800 text-sm">{spot.name}</span>
                                    <span className="chip-blue text-[10px]">{spot.type}</span>
                                    {/* 到达时间标签 — 让时间一目了然 */}
                                    {currentDay.items[i].arrivalTime && (
                                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-ocean-100 text-ocean-700 border border-ocean-200">
                                        ⏰ {currentDay.items[i].arrivalTime}
                                      </span>
                                    )}
                                  </div>
                                  {spot.intro && (
                                    <p className="text-xs text-gray-500 mt-0.5">{spot.intro}</p>
                                  )}
                                  <p className="text-[11px] text-gray-400 mt-0.5 truncate">{spot.address}</p>
                                  {spot.tags.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mt-1">
                                      {spot.tags.slice(0, 4).map((t) => (
                                        <span key={t} className="text-[10px] px-1.5 py-0.5 bg-gray-100 rounded text-gray-500">{t}</span>
                                      ))}
                                    </div>
                                  )}
                                </div>

                                {/* 到达时间 + 删除 */}
                                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                                  <input type="time" value={currentDay.items[i].arrivalTime || ''}
                                    onChange={(e) => updateArrivalTime(spot.id, e.target.value)}
                                    className="text-xs px-1.5 py-0.5 rounded border border-gray-200 bg-white/80 w-20 text-gray-600 focus:outline-none focus:ring-1 focus:ring-ocean-400"
                                    placeholder="时间" />
                                  <button onClick={() => {
                                    removeFromDay(spot.id)
                                    // cross-day drag data for external drops
                                  }}
                                    className="text-gray-300 hover:text-red-500 text-sm transition-colors"
                                    title="从这天移除">✕</button>
                                </div>
                              </div>
                            </div>

                            {/* Segments between spots */}
                            {segInfo && (
                              <div className="flex items-center gap-2 pl-14 py-2">
                                <div className="w-px h-3 bg-gray-200 ml-0.5" />
                                <div className="flex-1 flex items-center gap-2 flex-wrap">
                                  <span className="text-xs text-gray-400">{segInfo.text}</span>
                                  <div className="flex gap-0.5 bg-gray-50 rounded-md p-0.5">
                                    {tripModes.map((m) => (
                                      <button key={m.key} onClick={() => {
                                        setSegMode(segInfo.from, segInfo.to, m.key)
                                      }}
                                        className={`px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors
                                          ${getSegMode(segInfo.from, segInfo.to) === m.key
                                            ? 'bg-white text-ocean-700 shadow-sm border border-ocean-200'
                                            : 'text-gray-400 hover:text-gray-600'}`}>
                                        {m.key === 'driving' ? '🚗' : m.key === 'transit' ? '🚌' : m.key === 'bicycling' ? '🚲' : '🚶'}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                  {/* Export footer stats */}
                  {currentItems.length >= 2 && (
                    <div className="mt-4 pt-4 text-center text-xs text-gray-400" style={{ borderTop: '1px solid #E2E8F0' }}>
                      📊 总路程 {stats.dist}km · 预计 {timeStr} · 共 {currentItems.length} 个地点
                    </div>
                  )}
                </div>
              )}
              {currentItems.length > 0 && (
                <div className="mt-4 text-center">
                  <button onClick={() => setShowWishDrawer(true)}
                    className="text-sm text-ocean-500 hover:text-ocean-700 font-medium">
                    + 添加地点到此天
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            <div className="card p-5">
              <h3 className="font-semibold text-gray-700 mb-3">📊 行程概览</h3>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { val: timeStr, label: '总耗时', color: 'bg-ocean-50 text-ocean-600', unit: '' },
                  { val: `${stats.dist}`, label: '总路程', color: 'bg-blue-50 text-blue-600', unit: 'km' },
                  { val: `¥${stats.fare}`, label: '打车预算', color: 'bg-orange-50 text-orange-600', unit: '预估' },
                  { val: `${currentItems.length}`, label: '已选地点', color: 'bg-purple-50 text-purple-600', unit: '个' },
                ].map((d, i) => (
                  <div key={i} className={`${d.color} rounded-xl p-4 text-center`}>
                    <div className="text-xl font-bold">{d.val}</div>
                    <div className="text-xs mt-0.5">{d.label}{d.unit ? ` · ${d.unit}` : ''}</div>
                  </div>
                ))}
              </div>
            </div>

            {currentItems.length > 0 && (
              <div className="card p-4">
                <h4 className="font-semibold text-gray-600 text-sm mb-2">📍 地点列表</h4>
                {currentItems.map((s, i) => (
                  <div key={s.id}
                    draggable
                    onDragStart={(e) => onCrossDayDragStart(e, s.id, activeDay)}
                    className="flex items-center gap-2 py-1.5 text-sm text-gray-600 hover:text-gray-800 cursor-grab active:cursor-grabbing">
                    <span className="text-xs text-gray-400 w-5">{i + 1}.</span>
                    <span className="text-xs">{iconMap[s.category] || '📍'}</span>
                    <span className="truncate">{s.name}</span>
                  </div>
                ))}
                <p className="text-[10px] text-gray-400 mt-2">拖拽地点到其他天标签上可移动</p>
              </div>
            )}

            {currentItems.length > 0 && currentItems[currentItems.length - 1]?.id === 'qhd_stn' && (
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
              🗑️ 清空所有行程
            </button>
          </div>
        </div>
      )}

      {/* Wishlist Drawer */}
      {showWishDrawer && (
        <div className="fixed inset-0 bg-black/30 z-50 flex justify-end" onClick={() => setShowWishDrawer(false)}>
          <div className="w-full max-w-sm bg-white shadow-2xl h-full overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b border-gray-100 p-4 z-10">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-gray-800">📥 从收藏添加</h3>
                <button onClick={() => setShowWishDrawer(false)} className="text-gray-400 hover:text-gray-600 text-lg">✕</button>
              </div>
              <input value={wishSearch} onChange={(e) => setWishSearch(e.target.value)}
                placeholder="搜索收藏地点..."
                className="w-full px-4 py-2 rounded-xl border border-ocean-100 text-sm focus:outline-none focus:ring-2 focus:ring-ocean-400" />
            </div>
            <div className="p-4 space-y-2">
              {filteredWishSpots.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">
                  {wishSearch ? '没有匹配的地点' : '收藏夹为空，先去地点库收藏吧'}
                </p>
              ) : filteredWishSpots.map((s) => (
                <button key={s.id} onClick={() => { addToDay(s.id); setShowWishDrawer(false) }}
                  className="w-full text-left flex items-center gap-3 p-3 rounded-xl hover:bg-ocean-50 transition-colors">
                  {s.imageUrl ? (
                    <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                      <img src={s.imageUrl} alt={s.name} className="w-full h-full object-cover" loading="lazy" />
                    </div>
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-ocean-50 flex items-center justify-center text-lg flex-shrink-0">
                      {iconMap[s.category] || '📍'}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-800">{s.name}</div>
                    <div className="text-xs text-gray-400 truncate">{s.type} · {s.address}</div>
                  </div>
                  <span className="text-ocean-500 text-lg">+</span>
                </button>
              ))}
              {wishSearch && filteredWishSpots.length === 0 && availableWishSpots.length > 0 && (
                <p className="text-sm text-gray-400 text-center py-4">未找到 "{wishSearch}"</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Permission Alert */}
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
