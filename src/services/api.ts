// 腾讯地图 & DeepSeek API 服务

const TENCENT_KEY = import.meta.env.VITE_TENCENT_KEY
const DEEPSEEK_KEY = import.meta.env.VITE_DEEPSEEK_KEY

// ------ 腾讯地图 JS SDK ------

/** 动态加载腾讯地图 SDK */
export function loadTMap(): Promise<void> {
  if (window.TMap) return Promise.resolve()
  return new Promise((ok, fail) => {
    const el = document.createElement('script')
    el.src = `https://map.qq.com/api/gljs?v=2.exp&key=${TENCENT_KEY}`
    el.async = true
    el.onload = () => setTimeout(() => window.TMap ? ok() : fail(Error('TMap 未定义')), 500)
    el.onerror = () => fail(Error('腾讯地图 SDK 加载失败'))
    document.head.appendChild(el)
  })
}

// ------ 腾讯地图 WebService API ------

// 本地开发用 Vite proxy 避免 CORS，生产环境需部署到同域或服务端代理
// Capacitor 模式下直接调用腾讯地图 API（WebView 已配置通用访问权限）
const isWebView = typeof (window as any).Capacitor?.isNative === 'function' && (window as any).Capacitor.isNative()
const WS_BASE = isWebView ? 'https://apis.map.qq.com' : '/api/proxy'

/** 地点自动补全（限制在秦皇岛区域） */
export async function suggestPlaces(keyword: string, region = '秦皇岛'): Promise<Array<{
  title: string
  address: string
  category: string
  location: { lat: number; lng: number }
}>> {
  if (!keyword.trim()) return []
  const url = `${WS_BASE}/ws/place/v1/suggestion/?keyword=${encodeURIComponent(keyword)}&region=${encodeURIComponent(region)}&region_fix=1&key=${TENCENT_KEY}`
  try {
    const res = await fetch(url)
    const data = await res.json()
    return data.status === 0 ? (data.data ?? []) : []
  } catch { return [] }
}

/** 周边搜索（500m 范围内） */
export async function searchNearby(lat: number, lng: number, keyword = ''): Promise<Array<{
  title: string
  address: string
  category: string
  distance: number
  location: { lat: number; lng: number }
}>> {
  const boundary = `nearby(${lat},${lng},500)`
  const url = `${WS_BASE}/ws/place/v1/search/?boundary=${encodeURIComponent(boundary)}${keyword ? `&keyword=${encodeURIComponent(keyword)}` : ''}&key=${TENCENT_KEY}`
  try {
    const res = await fetch(url)
    const data = await res.json()
    return data.status === 0 ? (data.data ?? []) : []
  } catch { return [] }
}

/** IP 定位 */
export async function getIpLocation(): Promise<{ lat: number; lng: number; city: string } | null> {
  const url = `${WS_BASE}/ws/location/v1/ip?key=${TENCENT_KEY}`
  try {
    const res = await fetch(url)
    const data = await res.json()
    if (data.status === 0 && data.result) {
      return {
        lat: data.result.location.lat,
        lng: data.result.location.lng,
        city: data.result.ad_info?.city ?? '',
      }
    }
    return null
  } catch { return null }
}

export interface LocationResult {
  lat: number; lng: number; city: string; accuracy?: number
}

/** 获取用户真实位置（优先浏览器 GPS/WiFi，降级 IP 定位） */
export async function getUserLocation(): Promise<LocationResult | null> {
  if (navigator.geolocation) {
    // 先试高精度 GPS（长时间等待获取卫星锁定）
    try {
      const pos = await new Promise<GeolocationPosition>((ok, fail) => {
        navigator.geolocation.getCurrentPosition(ok, fail, { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 })
      })
      const acc = Math.round(pos.coords.accuracy)
      // 精度 ≤ 100m 直接返回；较差精度则等第二次尝试
      if (acc <= 100) return { lat: pos.coords.latitude, lng: pos.coords.longitude, city: '', accuracy: acc }
    } catch {}
    // 降级：非高精度但更快获取
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

/** 持续跟踪位置（最高精度导航），返回取消函数 */
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
