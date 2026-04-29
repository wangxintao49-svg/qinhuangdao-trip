// 腾讯地图 & DeepSeek API 服务
// 使用 TMap SDK 内置服务（无 CORS 问题，支持静态部署）

const TENCENT_KEY = import.meta.env.VITE_TENCENT_KEY
const DEEPSEEK_KEY = import.meta.env.VITE_DEEPSEEK_KEY

// ------ 腾讯地图 JS SDK ------

/** 动态加载腾讯地图 SDK */
export function loadTMap(): Promise<void> {
  if (window.TMap) return Promise.resolve()
  return new Promise((ok, fail) => {
    const el = document.createElement('script')
    el.src = `https://map.qq.com/api/gljs?v=2.exp&key=${TENCENT_KEY}&libraries=service`
    el.async = true
    el.onload = () => setTimeout(() => window.TMap ? ok() : fail(Error('TMap 未定义')), 500)
    el.onerror = () => fail(Error('腾讯地图 SDK 加载失败'))
    document.head.appendChild(el)
  })
}

// ------ TMap SDK 服务封装 ------

/** 将 SDK 返回的 polyline 统一为 {lat,lng}[] */
function normalizePolyline(pl: any): Array<{ lat: number; lng: number }> {
  if (!pl || !pl.length) return []
  if (typeof pl[0] === 'object' && pl[0] !== null) {
    return pl.map((p: any) => ({ lat: p.lat, lng: p.lng }))
  }
  // flat number[] 编码格式
  const pts: Array<{ lat: number; lng: number }> = []
  if (pl.length < 2) return pts
  let lat = pl[0], lng = pl[1]
  pts.push({ lat, lng })
  for (let i = 2; i < pl.length - 1; i += 2) {
    lat += pl[i] * 0.000001
    lng += pl[i + 1] * 0.000001
    pts.push({ lat, lng })
  }
  return pts
}

/** 地点自动补全 */
export async function suggestPlaces(keyword: string, region = '秦皇岛'): Promise<Array<{
  title: string
  address: string
  category: string
  location: { lat: number; lng: number }
}>> {
  if (!keyword.trim()) return []
  try {
    if (window.TMap?.service?.Suggestion) {
      const svc = new window.TMap.service.Suggestion()
      const res = await svc.getSuggestions({ keyword, region, region_fix: 1 })
      return (res.data ?? []).map((item: any) => ({
        title: item.title, address: item.address,
        category: item.category, location: item.location,
      }))
    }
  } catch {}
  return []
}

/** 周边搜索 */
export async function searchNearby(lat: number, lng: number, _keyword = ''): Promise<Array<{
  title: string
  address: string
  category: string
  distance: number
  location: { lat: number; lng: number }
}>> {
  try {
    if (window.TMap?.service?.Search) {
      const svc = new window.TMap.service.Search()
      const res = await svc.searchNearby({
        keyword: _keyword,
        location: new window.TMap.LatLng(lat, lng),
        radius: 500,
      })
      return (res.data ?? []).map((item: any) => ({
        title: item.title, address: item.address,
        category: item.category, distance: item.distance,
        location: item.location,
      }))
    }
  } catch {}
  return []
}

/** IP 定位（仅作 fallback，CORS 可能失败，失败不影响主流程） */
async function getIpLocation(): Promise<{ lat: number; lng: number; city: string } | null> {
  try {
    const res = await fetch(`https://apis.map.qq.com/ws/location/v1/ip?key=${TENCENT_KEY}`)
    const data = await res.json()
    if (data.status === 0 && data.result) {
      return {
        lat: data.result.location.lat, lng: data.result.location.lng,
        city: data.result.ad_info?.city ?? '',
      }
    }
    return null
  } catch { return null }
}

export interface LocationResult {
  lat: number; lng: number; city: string; accuracy?: number
}

/** 获取用户真实位置（优先 GPS，降级 IP） */
export async function getUserLocation(): Promise<LocationResult | null> {
  if (navigator.geolocation) {
    try {
      const pos = await new Promise<GeolocationPosition>((ok, fail) => {
        navigator.geolocation.getCurrentPosition(ok, fail, { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 })
      })
      const acc = Math.round(pos.coords.accuracy)
      if (acc <= 100) return { lat: pos.coords.latitude, lng: pos.coords.longitude, city: '', accuracy: acc }
    } catch {}
    try {
      const pos = await new Promise<GeolocationPosition>((ok, fail) => {
        navigator.geolocation.getCurrentPosition(ok, fail, { enableHighAccuracy: false, timeout: 8000 })
      })
      return {
        lat: pos.coords.latitude, lng: pos.coords.longitude, city: '',
        accuracy: Math.round(pos.coords.accuracy),
      }
    } catch {}
  }
  return getIpLocation()
}

/** 持续跟踪位置 */
export function watchUserLocation(
  onUpdate: (loc: LocationResult) => void,
  onError?: () => void,
): (() => void) {
  if (!navigator.geolocation) { onError?.(); return () => {} }
  const id = navigator.geolocation.watchPosition(
    (pos) => onUpdate({
      lat: pos.coords.latitude, lng: pos.coords.longitude, city: '',
      accuracy: Math.round(pos.coords.accuracy),
    }),
    () => onError?.(),
    { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
  )
  return () => navigator.geolocation.clearWatch(id)
}

// ------ 路线规划（TMap Direction SDK） ------

export interface DirectionSegment {
  distance: number       // 米
  duration: number       // 分钟
  polyline: Array<{ lat: number; lng: number }>
  price?: number
  steps?: any[]          // 公交专用
}

/** 路线规划（无 CORS 限制，支持静态部署） */
export async function fetchDirection(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number },
  mode: 'driving' | 'walking' | 'bicycling' | 'transit',
): Promise<{ data: DirectionSegment | null; error?: string }> {
  // 兼容新旧两套 API
  const DirClass = (window.TMap as any)?.service?.Direction || (window.TMap as any)?.services?.Direction
  const useNewApi = DirClass && DirClass === (window.TMap as any)?.service?.Direction
  if (!DirClass) return { data: null, error: 'SDK not ready' }

  function normalize(route: any): DirectionSegment {
    const durationMin = route.duration >= 86400 ? route.duration / 60 : route.duration
    return {
      distance: route.distance,
      duration: Math.round(durationMin),
      polyline: normalizePolyline(route.polyline),
      price: route.price,
      steps: route.steps,
    }
  }

  try {
    if (useNewApi) {
      // 新 API：Promise 式（drive / walk / bike / transit）
      const svc = new DirClass()
      const params: any = {
        from: new window.TMap.LatLng(from.lat, from.lng),
        to: new window.TMap.LatLng(to.lat, to.lng),
      }
      if (mode === 'driving') params.policy = 'LEAST_TIME'
      const method = mode === 'driving' ? 'drive' : mode === 'walking' ? 'walk' : mode === 'bicycling' ? 'bike' : 'transit'
      const result = await svc[method](params)
      if (result.status === 0 && result.result?.routes?.length) {
        return { data: normalize(result.result.routes[0]) }
      }
      return { data: null, error: (result as any).message || 'no route' }
    } else {
      // 旧 API：回调式 request()
      const modeMap: Record<string, string> = { driving: 'driving', walking: 'walking', bicycling: 'bicycling', transit: 'transit' }
      return new Promise((resolve) => {
        const svc = new DirClass()
        svc.request({
          from: new window.TMap.LatLng(from.lat, from.lng),
          to: new window.TMap.LatLng(to.lat, to.lng),
          mode: modeMap[mode] || 'driving',
          policy: mode === 'driving' ? 'LEAST_TIME' : undefined,
          success: (res: any) => {
            if (res.status === 0 && res.result?.routes?.length) {
              resolve({ data: normalize(res.result.routes[0]) })
            } else {
              resolve({ data: null, error: res.message || 'no route' })
            }
          },
          fail: (err: Error) => resolve({ data: null, error: err.message }),
        })
      })
    }
  } catch (e: any) {
    return { data: null, error: e.message }
  }
}

// ------ DeepSeek AI ------

/** 调用 DeepSeek 对话 */
export async function chatDeepSeek(messages: { role: string; content: string }[]) {
  try {
    const res = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${DEEPSEEK_KEY}` },
      body: JSON.stringify({ model: 'deepseek-chat', messages, temperature: 0.7 }),
    })
    const data = await res.json()
    return data.choices?.[0]?.message?.content ?? '抱歉，AI 暂时无法回复。'
  } catch {
    return 'AI 服务暂时不可用，请稍后再试。'
  }
}
